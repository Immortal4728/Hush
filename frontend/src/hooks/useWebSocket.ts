import { useEffect, useRef, useState, useCallback } from 'react';
import type { ChatMessage, Participant, WsServerMessage, WsParticipantDto } from '../types';
import { getWebSocketUrl } from '../config/env';

export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED' | 'EXPIRING' | 'DESTROYED';

interface UseWebSocketProps {
  roomCode: string;
  username: string;
  onRoomDestroyed?: (reason: string) => void;
  onRoomExpiring?: (reason: string) => void;
}

const TERMINAL_ERROR_CODES = new Set([
  'CONNECTION_RATE_LIMITED',
  'JOIN_RATE_LIMITED',
  'ROOM_NOT_FOUND',
  'ROOM_DESTROYED',
  'ROOM_EXPIRED',
  'ROOM_FULL',
  'INVALID_PARTICIPANT'
]);

export function useWebSocket({ roomCode, username, onRoomDestroyed, onRoomExpiring }: UseWebSocketProps) {
  const [status, setStatus] = useState<ConnectionStatus>('CONNECTING');
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const activeSocketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isManuallyClosedRef = useRef<boolean>(false);
  const typingTimerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store callbacks in refs to avoid recreating `connect` when callers pass unstable references
  const onRoomDestroyedRef = useRef(onRoomDestroyed);
  onRoomDestroyedRef.current = onRoomDestroyed;
  const onRoomExpiringRef = useRef(onRoomExpiring);
  onRoomExpiringRef.current = onRoomExpiring;

  const statusRef = useRef<ConnectionStatus>(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const cancelReconnectTimer = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    const trimmedRoom = roomCode ? roomCode.trim().toUpperCase() : '';
    const trimmedName = username ? username.trim() : '';

    if (!trimmedRoom || !trimmedName || isManuallyClosedRef.current) {
      return;
    }

    if (activeSocketRef.current && (activeSocketRef.current.readyState === WebSocket.OPEN || activeSocketRef.current.readyState === WebSocket.CONNECTING)) {
      console.log('[Hush WS] Socket already open or connecting. Skipping duplicate connect.');
      return;
    }

    cancelReconnectTimer();
    setStatus((prev) => (prev === 'CONNECTING' ? 'CONNECTING' : 'RECONNECTING'));
    setError(null);

    const wsUrl = getWebSocketUrl();

    console.log('[Hush WS] Connecting to:', wsUrl, 'Room:', trimmedRoom, 'User:', trimmedName);
    const ws = new WebSocket(wsUrl);
    activeSocketRef.current = ws;

    ws.onopen = () => {
      if (activeSocketRef.current !== ws) return;
      console.log('[Hush WS] Socket OPEN -> Sending JOIN for user:', trimmedName);

      const joinMsg = {
        type: 'JOIN',
        roomCode: trimmedRoom,
        username: trimmedName
      };
      ws.send(JSON.stringify(joinMsg));
    };

    ws.onmessage = (event) => {
      if (activeSocketRef.current !== ws) return;

      try {
        const msg: WsServerMessage = JSON.parse(event.data);
        console.log('[Hush WS] Received frame:', msg.type, msg);

        switch (msg.type) {
          case 'JOINED': {
            reconnectAttemptRef.current = 0;
            setError(null);
            setStatus('CONNECTED');
            setParticipantId(msg.participantId);
            setParticipants((prev) => {
              if (prev.some((p) => p.participantId === msg.participantId)) return prev;
              return [
                ...prev,
                {
                  participantId: msg.participantId,
                  username: msg.username,
                  host: msg.host,
                  isHost: msg.host
                }
              ];
            });
            break;
          }

          case 'PRESENCE': {
            const mapped: Participant[] = msg.participants.map((p: WsParticipantDto) => ({
              participantId: p.participantId,
              username: p.username,
              host: p.host,
              isHost: p.host
            }));
            setParticipants(mapped);
            break;
          }

          case 'HISTORY': {
            const historyMsgs: ChatMessage[] = (msg.messages || []).map((m) => ({
              messageId: m.messageId,
              senderId: m.senderId,
              senderName: m.senderName,
              text: m.text,
              timestamp: m.timestamp
            }));
            setMessages((prev) => {
              const existingIds = new Set(prev.map((p) => p.messageId));
              const newFromHistory = historyMsgs.filter((h) => !existingIds.has(h.messageId));
              return [...newFromHistory, ...prev].sort(
                (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
              );
            });
            break;
          }

          case 'MESSAGE': {
            const newMsg: ChatMessage = {
              messageId: msg.messageId,
              senderId: msg.senderId,
              senderName: msg.senderName,
              text: msg.text,
              timestamp: msg.timestamp
            };
            setMessages((prev) => (prev.some((m) => m.messageId === newMsg.messageId) ? prev : [...prev, newMsg]));
            break;
          }

          case 'TYPING': {
            const { participantId: pId, username: uName, typing } = msg;

            setTypingUsers((prev) => {
              const next = new Map(prev);
              if (typing) {
                next.set(pId, uName);
              } else {
                next.delete(pId);
              }
              return next;
            });

            if (typing) {
              if (typingTimerRef.current.has(pId)) {
                clearTimeout(typingTimerRef.current.get(pId)!);
              }
              const timeout = setTimeout(() => {
                setTypingUsers((prev) => {
                  const next = new Map(prev);
                  next.delete(pId);
                  return next;
                });
              }, 3000);
              typingTimerRef.current.set(pId, timeout);
            }
            break;
          }

          case 'SYSTEM': {
            const sysText =
              msg.event === 'USER_JOINED'
                ? `${msg.username} joined the room.`
                : msg.event === 'USER_LEFT'
                ? `${msg.username} left the room.`
                : `${msg.username} ${msg.event}`;
            const sysMsg: ChatMessage = {
              messageId: `sys-${Date.now()}-${Math.random()}`,
              senderId: 'SYSTEM',
              senderName: 'SYSTEM',
              text: sysText,
              timestamp: new Date().toISOString(),
              isSystem: true,
              systemEvent: msg.event
            };
            setMessages((prev) => [...prev, sysMsg]);
            break;
          }

          case 'ROOM_EXPIRING': {
            setStatus('EXPIRING');
            if (onRoomExpiringRef.current) onRoomExpiringRef.current('Room is expiring soon.');
            break;
          }

          case 'ROOM_DESTROYED': {
            isManuallyClosedRef.current = true;
            cancelReconnectTimer();
            setStatus('DESTROYED');
            if (onRoomDestroyedRef.current) onRoomDestroyedRef.current(msg.reason || 'Room has been destroyed.');
            break;
          }

          case 'ERROR': {
            let friendlyMsg = msg.message || 'An error occurred.';
            if (msg.code === 'ROOM_FULL') friendlyMsg = 'Room is full.';
            else if (msg.code === 'NOT_JOINED') friendlyMsg = 'You must join the room first.';
            else if (msg.code === 'ALREADY_JOINED') friendlyMsg = 'You are already in this room.';
            else if (msg.code === 'ROOM_DESTROYED' || msg.code === 'ROOM_EXPIRED') friendlyMsg = 'This room has expired.';
            else if (msg.code === 'INVALID_MESSAGE') friendlyMsg = 'Message must contain between 1 and 2000 characters.';
            else if (msg.code === 'CONNECTION_RATE_LIMITED' || msg.code === 'JOIN_RATE_LIMITED') friendlyMsg = 'Too many connection attempts. Please slow down.';
            else if (msg.code === 'MESSAGE_RATE_LIMITED' || msg.code === 'TYPING_RATE_LIMITED') friendlyMsg = 'Too many actions. Please slow down.';

            setError(friendlyMsg);

            if (TERMINAL_ERROR_CODES.has(msg.code)) {
              if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
              isManuallyClosedRef.current = true;
              cancelReconnectTimer();

              if (msg.code === 'ROOM_NOT_FOUND' || msg.code === 'ROOM_DESTROYED' || msg.code === 'ROOM_EXPIRED') {
                setStatus('DESTROYED');
                if (onRoomDestroyedRef.current) {
                  onRoomDestroyedRef.current(friendlyMsg);
                }
              } else {
                setStatus('DISCONNECTED');
              }

              if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                try {
                  ws.close();
                } catch {
                  // Ignore
                }
              }
            } else {
              // Auto-clear non-terminal rate limit warnings after 5 seconds
              if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
              errorTimeoutRef.current = setTimeout(() => setError(null), 5000);
              
              // If stuck in CONNECTING/RECONNECTING and receiving an error, force close to retry
              if (statusRef.current === 'CONNECTING' || statusRef.current === 'RECONNECTING') {
                if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                  try {
                    ws.close();
                  } catch {
                    // Ignore
                  }
                }
              }
            }
            break;
          }
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onclose = (event) => {
      if (activeSocketRef.current !== ws) return;
      console.warn('[Hush WS] Socket CLOSED. Code:', event.code, 'Reason:', event.reason);

      cancelReconnectTimer();

      if (isManuallyClosedRef.current || statusRef.current === 'DESTROYED') {
        setStatus('DISCONNECTED');
        return;
      }

      const attempt = reconnectAttemptRef.current;
      const baseDelay = Math.min(1000 * Math.pow(2, attempt), 30000);
      const delay = baseDelay + Math.random() * 500;

      reconnectAttemptRef.current += 1;
      setStatus('RECONNECTING');
      setError('Connection lost. Attempting to reconnect...');

      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        connect();
      }, delay);
    };

    ws.onerror = (err) => {
      if (activeSocketRef.current !== ws) return;
      console.error('[Hush WS] Socket ERROR:', err);
    };
  }, [roomCode, username, cancelReconnectTimer]);

  useEffect(() => {
    isManuallyClosedRef.current = false;
    connect();

    const handleBeforeUnload = () => {
      cancelReconnectTimer();
      if (activeSocketRef.current && activeSocketRef.current.readyState === WebSocket.OPEN) {
        try {
          activeSocketRef.current.send(JSON.stringify({ type: 'LEAVE' }));
        } catch {
          // Ignore
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cancelReconnectTimer();
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      if (activeSocketRef.current) {
        const socket = activeSocketRef.current;
        activeSocketRef.current = null;
        try {
          if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
            socket.close();
          }
        } catch {
          // Ignore
        }
      }
    };
  }, [connect, cancelReconnectTimer]);

  const sendMessage = useCallback((text: string) => {
    if (activeSocketRef.current && activeSocketRef.current.readyState === WebSocket.OPEN) {
      activeSocketRef.current.send(JSON.stringify({
        type: 'MESSAGE',
        text
      }));
    }
  }, []);

  const sendTyping = useCallback((typing: boolean) => {
    if (activeSocketRef.current && activeSocketRef.current.readyState === WebSocket.OPEN) {
      activeSocketRef.current.send(JSON.stringify({
        type: 'TYPING',
        typing
      }));
    }
  }, []);

  const leave = useCallback(() => {
    isManuallyClosedRef.current = true;
    cancelReconnectTimer();
    if (activeSocketRef.current) {
      const socket = activeSocketRef.current;
      activeSocketRef.current = null;
      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(JSON.stringify({ type: 'LEAVE' }));
        } catch {
          // Ignore
        }
        try {
          socket.close();
        } catch {
          // Ignore
        }
      }
    }
    setStatus('DISCONNECTED');
  }, [cancelReconnectTimer]);

  const manualRetry = useCallback(() => {
    cancelReconnectTimer();
    isManuallyClosedRef.current = false;
    reconnectAttemptRef.current = 0;
    setError(null);

    if (activeSocketRef.current) {
      const oldSocket = activeSocketRef.current;
      activeSocketRef.current = null;
      try {
        oldSocket.close();
      } catch {
        // Ignore
      }
    }

    connect();
  }, [cancelReconnectTimer, connect]);

  return {
    status,
    participantId,
    participants,
    messages,
    typingUsers: Array.from(typingUsers.values()),
    error,
    sendMessage,
    sendTyping,
    leave,
    manualRetry
  };
}
