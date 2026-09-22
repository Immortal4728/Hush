import React, { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import type { ChatMessage } from '../../types';

interface MessageListProps {
  messages: ChatMessage[];
  currentParticipantId: string | null;
  typingUsers: string[];
  roomCode: string;
  participantCount: number;
  username: string;
  onCopyCode: () => void;
  copied: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentParticipantId,
  typingUsers,
  roomCode,
  participantCount,
  username,
  onCopyCode,
  copied,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const isAlone = participantCount <= 1;

  return (
    <div className="terminal-stream-container font-mono">
      {/* Terminal Initialization Sequence */}
      <div className="terminal-boot-log font-mono">
        <div className="boot-line boot-title">HUSH TEMPORARY COMMUNICATION SYSTEM</div>
        <div className="boot-line mt-1">Initializing secure channel...</div>
        <div className="boot-line sys-ok">[ OK ] CLIENT INITIALIZED</div>
        <div className="boot-line sys-ok">[ OK ] ROOM FOUND</div>
        <div className="boot-line sys-ok">[ OK ] IDENTITY ASSIGNED: {username || 'anonymous'}</div>
        <div className="boot-line sys-ok">[ OK ] PEER CHANNEL AVAILABLE</div>
        <div className="boot-line sys-ok">[ OK ] ENCRYPTION ACTIVE</div>
        <div className="boot-line boot-meta mt-1">SESSION ID: {roomCode}</div>
        <div className="boot-line boot-status">Connection established.</div>
      </div>

      <div className="terminal-divider">──────</div>

      {/* Waiting state line if alone */}
      {isAlone && messages.length === 0 && (
        <div className="terminal-alone-box">
          <div className="boot-line sys-ok">[ OK ] CHANNEL ESTABLISHED</div>
          <div className="boot-line sys-info">[ INFO ] WAITING FOR PEER TO CONNECT...</div>
          <div className="boot-line sys-info flex items-center gap-2 mt-1">
            <span>[ INFO ] SHARE ROOM CODE:</span>
            <span className="room-code-highlight">{roomCode}</span>
            <button
              onClick={onCopyCode}
              type="button"
              className="terminal-copy-btn"
            >
              {copied ? '[ COPIED ]' : '[ COPY ]'}
            </button>
          </div>
        </div>
      )}

      {/* Message Stream */}
      <div className="terminal-messages font-mono">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.messageId}
            message={msg}
            isSelf={msg.senderId === currentParticipantId}
          />
        ))}
      </div>

      {/* Typing Line */}
      {typingUsers.length > 0 && (
        <div className="terminal-line terminal-line--typing sys-info font-mono">
          <span className="line-prefix">[ TYPING ]</span>
          <span className="line-content">
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
