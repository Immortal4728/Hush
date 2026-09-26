import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

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

    const sysMsg: ChatMessage = {
      messageId: `sys_ext_${Date.now()}`,
      senderId: 'system',
      senderName: 'hush',
      text: `Session extended by ${minutes} minutes`,
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

  const isStrangerOrigin =
    (location.state as any)?.isStranger === true ||
    sessionStorage.getItem(`hush_origin_${roomCode}`) === 'STRANGER';

  const handleNextStranger = () => {
    if (window.confirm('Leave current stranger chat and match with another online peer?')) {
      isLeavingRef.current = true;
      leave();
      navigate('/stranger');
    }
  };

  return (
    <div className="chat-room-layout modern-mode font-sans">
      {/* Top Header Bar */}
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
        onNextStranger={isStrangerOrigin ? handleNextStranger : undefined}
      />

      {/* Main Workspace Layout */}
      <div className="chat-workspace">
        <main className="chat-main-area">
          {error && (
            <div className="chat-error-banner font-sans">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>[ ERROR ] {error}</span>
              </div>
              {(status === 'DISCONNECTED' || status === 'RECONNECTING') && (
                <button
                  onClick={manualRetry}
                  className="terminal-retry-btn font-sans"
                >
                  RETRY CONNECTION
                </button>
              )}
            </div>
          )}

          {/* Message Stream */}
          <ModernMessageList
            messages={allMessages}
            currentParticipantId={participantId}
            typingUsers={typingUsers}
            roomCode={roomCode}
            participantCount={participants.length}
            onCopyCode={copyCode}
            copied={copied}
          />

          {/* Message Composer */}
          <ModernMessageComposer
            status={status}
            onSendMessage={sendMessage}
            onSendTyping={sendTyping}
          />
        </main>

        {/* Room Sidebar */}
        <ModernRoomSidebar
          participants={participants}
          currentParticipantId={participantId}
          roomInfo={roomInfo}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onOpenExtendModal={() => setIsExtendModalOpen(true)}
        />
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

