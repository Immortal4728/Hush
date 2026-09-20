import React from 'react';
import type { ChatMessage } from '../../types';

interface MessageBubbleProps {
  message: ChatMessage;
  isSelf: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isSelf }) => {
  if (message.isSystem) {
    return (
      <div className="system-message-row font-mono">
        <span className="system-message-text">{message.text}</span>
      </div>
    );
  }

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`message-row ${isSelf ? 'self' : 'peer'}`}>
      <div className="message-meta">
        <span className="sender-name">{isSelf ? 'You' : message.senderName}</span>
        <span className="timestamp font-mono">{formattedTime}</span>
      </div>

      <div className={`message-bubble ${isSelf ? 'bubble-self' : 'bubble-peer'}`}>
        {message.text}
      </div>
    </div>
  );
};
