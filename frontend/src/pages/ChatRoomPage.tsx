import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import { RoomHeader } from '../components/chat/RoomHeader';
import { MessageList } from '../components/chat/MessageList';
import { MessageComposer } from '../components/chat/MessageComposer';
import { RoomSidebar } from '../components/chat/RoomSidebar';
import type { RoomInfoResponse } from '../types';
import './ChatRoomPage.css';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const isLeavingRef = useRef<boolean>(false);

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
    messages,
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

  const handleLeave = () => {
    if (isLeavingRef.current) return;
    isLeavingRef.current = true;
    leave();
    sessionStorage.removeItem(`hush_user_${roomCode}`);
    navigate('/');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="chat-room-layout">
      {/* Header Bar */}
      <RoomHeader
        roomCode={roomCode}
        status={status}
        expiresAt={roomInfo?.expiresAt}
        participantCount={participants.length}
        onCopyCode={copyCode}
        copied={copied}
        onLeave={handleLeave}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Main Workspace Layout */}
      <div className="chat-workspace">
        <main className="chat-main-area">
          {error && (
            <div className="chat-error-banner font-mono flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              {(status === 'DISCONNECTED' || status === 'RECONNECTING') && (
                <button
                  onClick={manualRetry}
                  className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded text-xs text-red-200 transition-colors cursor-pointer ml-4"
                >
                  Retry Connection
                </button>
              )}
            </div>
          )}

          {/* Message Stream */}
          <MessageList
            messages={messages}
            currentParticipantId={participantId}
            typingUsers={typingUsers}
            roomCode={roomCode}
            participantCount={participants.length}
          />

          {/* Message Input Composer */}
          <MessageComposer
            status={status}
            onSendMessage={sendMessage}
            onSendTyping={sendTyping}
          />
        </main>

        {/* Dedicated Room & People Sidebar */}
        <RoomSidebar
          participants={participants}
          currentParticipantId={participantId}
          roomInfo={roomInfo}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>
    </div>
  );
};
