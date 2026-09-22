import React, { useEffect, useRef } from 'react';
import { ModernMessageBubble } from './ModernMessageBubble';
import type { ChatMessage } from '../../../types';

interface ModernMessageListProps {
  messages: ChatMessage[];
  currentParticipantId: string | null;
  typingUsers: string[];
  roomCode: string;
  participantCount: number;
  onCopyCode: () => void;
  copied: boolean;
}

export const ModernMessageList: React.FC<ModernMessageListProps> = ({
  messages,
  currentParticipantId,
  typingUsers,
  roomCode,
  participantCount,
  onCopyCode,
  copied,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const isAlone = participantCount <= 1;

  return (
    <div className="modern-stream-container font-sans">
      <div className="modern-channel-banner">
        <h3 className="banner-title">Encrypted Channel Established</h3>
        <p className="banner-sub">
          Room Code: <strong className="font-mono text-white">{roomCode}</strong>. Messages are end-to-end ephemeral and self-destruct upon channel expiration.
        </p>
      </div>

      {isAlone && messages.length === 0 && (
        <div className="modern-alone-card">
          <div className="alone-title">Waiting for peer to connect</div>
          <div className="alone-sub">Share this room code with your contact to begin chatting:</div>
          <div className="alone-code-row mt-2">
            <span className="alone-code font-mono">{roomCode}</span>
            <button onClick={onCopyCode} type="button" className="modern-alone-copy-btn">
              {copied ? '✓ Copied' : 'Copy Code'}
            </button>
          </div>
        </div>
      )}

      <div className="modern-messages-wrapper">
        {messages.map((msg) => (
          <ModernMessageBubble
            key={msg.messageId}
            message={msg}
            isSelf={msg.senderId === currentParticipantId}
          />
        ))}
      </div>

      {typingUsers.length > 0 && (
        <div className="modern-typing-indicator font-sans">
          <span className="typing-dots font-mono">...</span>
          <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing</span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
