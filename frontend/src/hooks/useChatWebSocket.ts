import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  ChatMessage,
  SystemMessage,
  Participant,
  WsServerMessage,
  WsClientMessage,
} from '../types';

export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED' | 'EXPIRING' | 'DESTROYED';

interface UseChatWebSocketProps {
  roomCode: string;
  username: string;
  onRoomDestroyed?: (reason: string) => void;
  onRoomExpiring?: (remainingSeconds: number) => void;
}

interface UseChatWebSocketReturn {
  status: ConnectionStatus;
  participantId: string | null;
  participants: Participant[];
  messages: ChatMessage[];
  systemMessages: SystemMessage[];
  typingUsers: string[];
  error: string | null;
  sendMessage: (text: string) => void;
  sendTyping: (isTyping: boolean) => void;
  leave: () => void;
}

export function useChatWebSocket({
  roomCode,
  username,
  onRoomDestroyed,
  onRoomExpiring,
}: UseChatWebSocketProps): UseChatWebSocketReturn {
  const [status, setStatus] = useState<ConnectionStatus>('CONNECTING');
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIntentionalCloseRef = useRef<boolean>(false);
  const isDestroyedRef = useRef<boolean>(false);
  const typingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const myParticipantIdRef = useRef<string | null>(null);

  const sendWs = useCallback((msg: WsClientMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const connect = useCallback(() => {
    if (!roomCode || !username || isIntentionalCloseRef.current || isDestroyedRef.current) return;

    setStatus(prev => (prev === 'CONNECTING' ? 'CONNECTING' : 'RECONNECTING'));
    setError(null);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/chat`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('CONNECTED');
      reconnectAttemptRef.current = 0;

      // Backend expects flat JSON: {"type":"JOIN","roomCode":"...","username":"..."}
      const joinMsg: WsClientMessage = {
        type: 'JOIN',
        roomCode: roomCode.toUpperCase(),
        username,
      };
      ws.send(JSON.stringify(joinMsg));
    };

    ws.onmessage = (event) => {
      let data: WsServerMessage;
      try {
        data = JSON.parse(event.data);
      } catch {
        console.warn('Failed to parse WebSocket message');
        return;
      }

      if (!data || !data.type) return;

      switch (data.type) {
        case 'JOINED': {
          setParticipantId(data.participantId);
          myParticipantIdRef.current = data.participantId;
          break;
        }
        case 'MESSAGE': {
          const msg: ChatMessage = {
            messageId: data.messageId,
            senderId: data.senderId,
            senderName: data.senderName,
            text: data.text,
            timestamp: data.timestamp,
          };
          setMessages(prev => [...prev, msg]);
          break;
        }
        case 'TYPING': {
          const { participantId: pId, username: uName, typing: isTyping } = data;
          if (pId === myParticipantIdRef.current) break;

          setTypingUsers(prev => {
            const next = new Map(prev);
            if (isTyping) {
              next.set(pId, uName);
            } else {
              next.delete(pId);
            }
            return next;
          });

          if (isTyping) {
            if (typingTimersRef.current.has(pId)) {
              clearTimeout(typingTimersRef.current.get(pId)!);
            }
            const timeout = setTimeout(() => {
              setTypingUsers(prev => {
                const next = new Map(prev);
                next.delete(pId);
                return next;
              });
              typingTimersRef.current.delete(pId);
            }, 3000);
            typingTimersRef.current.set(pId, timeout);
          } else {
            if (typingTimersRef.current.has(pId)) {
              clearTimeout(typingTimersRef.current.get(pId)!);
              typingTimersRef.current.delete(pId);
            }
          }
          break;
        }
        case 'PRESENCE': {
          const mapped: Participant[] = (data.participants || []).map(p => ({
            participantId: p.participantId,
            username: p.username,
            host: p.host,
          }));
          setParticipants(mapped);
          break;
        }
        case 'SYSTEM': {
          const sysMsg: SystemMessage = {
            id: crypto.randomUUID(),
            event: data.event,
            username: data.username,
            timestamp: new Date().toISOString(),
          };
          setSystemMessages(prev => [...prev, sysMsg]);
          break;
        }
        case 'ERROR': {
          setError(data.message || 'An error occurred.');
          if (data.code === 'ROOM_NOT_FOUND' || data.code === 'ROOM_DESTROYED' || data.code === 'ILLEGAL_ROOM_STATE') {
            isIntentionalCloseRef.current = true;
            isDestroyedRef.current = true;
            setStatus('DESTROYED');
            onRoomDestroyed?.(data.message || 'Room is no longer available.');
          }
          break;
        }
        case 'ROOM_EXPIRING': {
          setStatus('EXPIRING');
          onRoomExpiring?.(data.remainingSeconds);
          break;
        }
        case 'ROOM_DESTROYED': {
          isIntentionalCloseRef.current = true;
          isDestroyedRef.current = true;
          setStatus('DESTROYED');
          setMessages([]);
          setParticipants([]);
          setSystemMessages([]);
          setTypingUsers(new Map());
          onRoomDestroyed?.(data.reason || 'Room has been destroyed.');
          break;
        }
      }
    };

    ws.onclose = () => {
      if (isIntentionalCloseRef.current || isDestroyedRef.current) {
        setStatus('DISCONNECTED');
        return;
      }

      const attempt = reconnectAttemptRef.current;
      if (attempt >= 5) {
        setStatus('DISCONNECTED');
        setError('Connection lost. Please refresh the page.');
        return;
      }

      const baseDelay = Math.min(1000 * Math.pow(2, attempt), 16000);
      const jitter = Math.random() * 1000;
      reconnectAttemptRef.current += 1;
      setStatus('RECONNECTING');

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, baseDelay + jitter);
    };

    ws.onerror = () => {
      // onclose will fire after this
    };
  }, [roomCode, username, onRoomDestroyed, onRoomExpiring, sendWs]);

  useEffect(() => {
    isIntentionalCloseRef.current = false;
    isDestroyedRef.current = false;
    connect();

    return () => {
      isIntentionalCloseRef.current = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      for (const timer of typingTimersRef.current.values()) {
        clearTimeout(timer);
      }
      typingTimersRef.current.clear();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, username]);

  const sendMessage = useCallback((text: string) => {
    sendWs({ type: 'MESSAGE', text });
  }, [sendWs]);

  const sendTyping = useCallback((isTyping: boolean) => {
    sendWs({ type: 'TYPING', typing: isTyping });
  }, [sendWs]);

  const leave = useCallback(() => {
    isIntentionalCloseRef.current = true;
    sendWs({ type: 'LEAVE' });
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('DISCONNECTED');
    setMessages([]);
    setParticipants([]);
    setSystemMessages([]);
    setTypingUsers(new Map());
  }, [sendWs]);

  return {
    status,
    participantId,
    participants,
    messages,
    systemMessages,
    typingUsers: Array.from(typingUsers.values()),
    error,
    sendMessage,
    sendTyping,
    leave,
  };
}
