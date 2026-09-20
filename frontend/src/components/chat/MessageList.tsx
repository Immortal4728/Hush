import React, { useEffect, useRef, useState } from 'react';
import { Shield, Copy, Check, Users } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import type { ChatMessage } from '../../types';

interface MessageListProps {
  messages: ChatMessage[];
  currentParticipantId: string | null;
  typingUsers: string[];
  roomCode: string;
  participantCount: number;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentParticipantId,
  typingUsers,
  roomCode,
  participantCount,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const isAlone = participantCount <= 1 && messages.length === 0;

  return (
    <div className="message-list-container">
      {isAlone ? (
        <div className="empty-chat-state">
          <div className="shield-icon-wrapper">
            <Users className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="empty-title font-mono">Waiting for someone to join</h3>
          <p className="empty-desc">
            Share this room code with someone to start chatting.
          </p>

          <div className="code-copy-card font-mono">
            <span className="code-label">ROOM CODE</span>
            <span className="code-value">{roomCode}</span>
            <button
              onClick={copyCode}
              className="copy-code-btn"
              type="button"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>COPY CODE</span>
                </>
              )}
            </button>
          </div>

          <div className="privacy-pill font-mono">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero-log memory • Nothing saved</span>
          </div>
        </div>
      ) : (
        <div className="messages-stream">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.messageId}
              message={msg}
              isSelf={msg.senderId === currentParticipantId}
            />
          ))}
        </div>
      )}

      <TypingIndicator typingUsers={typingUsers} />
      <div ref={bottomRef} />
    </div>
  );
};
