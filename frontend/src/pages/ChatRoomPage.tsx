import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import { RoomHeader } from '../components/chat/RoomHeader';
import { MessageList } from '../components/chat/MessageList';
import { MessageComposer } from '../components/chat/MessageComposer';
import { RoomSidebar } from '../components/chat/RoomSidebar';

import { ModernRoomHeader } from '../components/chat/modern/ModernRoomHeader';
import { ModernMessageList } from '../components/chat/modern/ModernMessageList';
import { ModernMessageComposer } from '../components/chat/modern/ModernMessageComposer';
import { ModernRoomSidebar } from '../components/chat/modern/ModernRoomSidebar';

import { ExtendSessionModal } from '../components/chat/ExtendSessionModal';
import { extendRoom } from '../services/roomApi';
import type { ChatMessage, RoomInfoResponse } from '../types';
import './ChatRoomPage.css';
import './ModernChatRoom.css';

export const ChatRoomPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const roomCode = code?.toUpperCase() || '';

  const [username] = useState<string>(() => {
    return (location.state as any)?.username || sessionStorage.getItem(`hush_user_${roomCode}`) || '';
  });
  const [copied, setCopied] = useState<boolean>(false);
  const [roomInfo, setRoomInfo] = useState<RoomInfoResponse | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState<boolean>(false);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const isLeavingRef = useRef<boolean>(false);

  const [uiMode, setUiMode] = useState<'MODERN' | 'TERMINAL'>(() => {
    return (
      (location.state as any)?.uiMode ||
      (localStorage.getItem('hush_ui_mode') as 'MODERN' | 'TERMINAL') ||
      'MODERN'
    );
  });

  const toggleUiMode = () => {
    const nextMode = uiMode === 'MODERN' ? 'TERMINAL' : 'MODERN';
    setUiMode(nextMode);
    localStorage.setItem('hush_ui_mode', nextMode);
  };

  useEffect(() => {
    if (username) {
      sessionStorage.setItem(`hush_user_${roomCode}`, username);
    } else if (roomCode) {
      navigate('/join', { state: { roomCode } });
    }
  }, [roomCode, username, navigate]);

  useEffect(() => {
    if (!roomCode) return;
    import('../services/roomApi').then(({ getRoom }) => {
      getRoom(roomCode)
        .then((data) => {
          setRoomInfo(data);
        })
        .catch(() => {
          navigate('/expired', { state: { reason: 'Room not found or has expired.' } });
        });
    });
  }, [roomCode, navigate]);

  const handleRoomDestroyed = useCallback((reason: string) => {
    navigate('/expired', { state: { reason } });
  }, [navigate]);

  const {
    status,
    participantId,
    participants,
    messages: wsMessages,
    typingUsers,
    error,
    sendMessage,
    sendTyping,
    leave,
    manualRetry
  } = useWebSocket({
    roomCode,
    username,
    onRoomDestroyed: handleRoomDestroyed
  });

  const handleLeave = useCallback(() => {
    if (isLeavingRef.current) return;
    isLeavingRef.current = true;
    leave();
    sessionStorage.removeItem(`hush_user_${roomCode}`);
    navigate('/');
  }, [leave, navigate, roomCode]);

  const handleHomeNavigate = useCallback(() => {
    if (!isLeavingRef.current) {
      isLeavingRef.current = true;
      leave();
      sessionStorage.removeItem(`hush_user_${roomCode}`);
    }
    window.scrollTo(0, 0);
    navigate('/', { replace: true });
  }, [leave, navigate, roomCode]);

  const handleExtendSession = async (minutes: number) => {
    if (!roomCode) return;
    const updatedRoom = await extendRoom(roomCode, minutes);
    setRoomInfo(updatedRoom);

    const formattedNewExp = new Date(updatedRoom.expiresAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const sysMsgText = uiMode === 'MODERN'
      ? `Session extended by ${minutes} minutes`
      : `[SYSTEM] SESSION EXTENDED\nAdditional time: ${minutes} minutes\nNew expiration: ${formattedNewExp}`;

    const sysMsg: ChatMessage = {
      messageId: `sys_ext_${Date.now()}`,
      senderId: 'system',
      senderName: 'hush',
      text: sysMsgText,
      timestamp: new Date().toISOString(),
      isSystem: true,
    };

    setLocalMessages((prev) => [...prev, sysMsg]);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const allMessages = [...wsMessages, ...localMessages];

  const handleLocalCommand = (cmd: string) => {
    const cleanCmd = cmd.trim().toLowerCase();
    const now = new Date().toISOString();

    if (cleanCmd === '/clear') {
      setLocalMessages([]);
      return;
    }

    if (cleanCmd === '/exit') {
      handleLeave();
      return;
    }

    let outputText = '';

    if (cleanCmd === '/help') {
      outputText = `[ AVAILABLE TERMINAL COMMANDS ]\n/help       - show available commands\n/peers      - show connected users\n/info       - show room parameters\n/clear      - clear terminal view\n/exit       - leave room`;
    } else if (cleanCmd === '/peers') {
      const peerListStr = participants
        .map((p) => `● ${p.username}${p.participantId === participantId ? ' (You)' : ''}${p.isHost || p.host ? ' [HOST]' : ''}`)
        .join('\n');
      outputText = `## CONNECTED PEERS\n${peerListStr}\nROOM CAPACITY: ${participants.length} / ${roomInfo?.maxParticipants || 2}`;
    } else if (cleanCmd === '/info') {
      outputText = `## HUSH CHANNEL INFORMATION\nROOM_ID:    ${roomCode}\nTYPE:       ${roomInfo?.type || 'DIRECT'}\nPEERS:      ${participants.length} / ${roomInfo?.maxParticipants || 2}\nSTATUS:     ${status}\nENCRYPTION: ACTIVE`;
    } else {
      outputText = `[ SYS ] Unknown command: ${cmd}. Type /help for available commands.`;
    }

    const sysMsg: ChatMessage = {
      messageId: `cmd_${Date.now()}`,
      senderId: 'system',
      senderName: 'hush',
      text: outputText,
      timestamp: now,
      isSystem: true,
    };

    setLocalMessages((prev) => [...prev, sysMsg]);
  };

  const isModern = uiMode === 'MODERN';

  return (
    <div className={`chat-room-layout ${isModern ? 'modern-mode' : 'font-mono'}`}>
      {/* Header Bar */}
      {isModern ? (
        <ModernRoomHeader
          roomCode={roomCode}
          status={status}
          expiresAt={roomInfo?.expiresAt}
          participantCount={participants.length}
          onCopyCode={copyCode}
          copied={copied}
          onLeave={handleLeave}
          onHomeNavigate={handleHomeNavigate}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          uiMode={uiMode}
          onToggleUiMode={toggleUiMode}
        />
      ) : (
        <RoomHeader
          roomCode={roomCode}
          status={status}
          expiresAt={roomInfo?.expiresAt}
          participantCount={participants.length}
          onCopyCode={copyCode}
          copied={copied}
          onLeave={handleLeave}
          onHomeNavigate={handleHomeNavigate}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          uiMode={uiMode}
          onToggleUiMode={toggleUiMode}
        />
      )}

      {/* Main Workspace Layout */}
      <div className="chat-workspace">
        <main className="chat-main-area">
          {error && (
            <div className={`chat-error-banner ${isModern ? 'font-sans' : 'font-mono'}`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>[ ERROR ] {error}</span>
              </div>
              {(status === 'DISCONNECTED' || status === 'RECONNECTING') && (
                <button
                  onClick={manualRetry}
                  className="terminal-retry-btn"
                >
                  [ RETRY CONNECTION ]
                </button>
              )}
            </div>
          )}

          {/* Message Output Stream */}
          {isModern ? (
            <ModernMessageList
              messages={allMessages}
              currentParticipantId={participantId}
              typingUsers={typingUsers}
              roomCode={roomCode}
              participantCount={participants.length}
              onCopyCode={copyCode}
              copied={copied}
            />
          ) : (
            <MessageList
              messages={allMessages}
              currentParticipantId={participantId}
              typingUsers={typingUsers}
              roomCode={roomCode}
              participantCount={participants.length}
              username={username}
              onCopyCode={copyCode}
              copied={copied}
            />
          )}

          {/* Shell / Message Composer */}
          {isModern ? (
            <ModernMessageComposer
              status={status}
              onSendMessage={sendMessage}
              onSendTyping={sendTyping}
              onLocalCommand={handleLocalCommand}
            />
          ) : (
            <MessageComposer
              username={username}
              status={status}
              onSendMessage={sendMessage}
              onSendTyping={sendTyping}
              onLocalCommand={handleLocalCommand}
            />
          )}
        </main>

        {/* Dedicated Room & People Sidebar */}
        {isModern ? (
          <ModernRoomSidebar
            participants={participants}
            currentParticipantId={participantId}
            roomInfo={roomInfo}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            onOpenExtendModal={() => setIsExtendModalOpen(true)}
          />
        ) : (
          <RoomSidebar
            participants={participants}
            currentParticipantId={participantId}
            roomInfo={roomInfo}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            onOpenExtendModal={() => setIsExtendModalOpen(true)}
          />
        )}
      </div>

      {/* Session Extension Modal */}
      <ExtendSessionModal
        isOpen={isExtendModalOpen}
        expiresAt={roomInfo?.expiresAt || new Date().toISOString()}
        onClose={() => setIsExtendModalOpen(false)}
        onExtend={handleExtendSession}
      />
    </div>
  );
};
