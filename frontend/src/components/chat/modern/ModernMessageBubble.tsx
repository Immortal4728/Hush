import React from 'react';
import type { ChatMessage } from '../../../types';

interface ModernMessageBubbleProps {
  message: ChatMessage;
  isSelf: boolean;
}

export const ModernMessageBubble: React.FC<ModernMessageBubbleProps> = ({ message, isSelf }) => {
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (message.isSystem) {
    return (
      <div className="modern-system-pill font-sans">
        <span className="system-pill-text">{message.text}</span>
      </div>
    );
  }

  const senderInitial = message.senderName ? message.senderName.charAt(0).toUpperCase() : '?';

  return (
    <div className={`modern-msg-row ${isSelf ? 'is-self' : 'is-peer'} font-sans`}>
      {!isSelf && (
        <div className="modern-avatar font-mono" title={message.senderName}>
          {senderInitial}
        </div>
      )}

      <div className="modern-msg-bubble">
        {!isSelf && (
          <div className="modern-msg-author">
            {message.senderName || 'Anonymous'}
          </div>
        )}

        <div className="modern-msg-text">{message.text}</div>

        <div className="modern-msg-time">{formattedTime}</div>
      </div>
    </div>
  );
};
