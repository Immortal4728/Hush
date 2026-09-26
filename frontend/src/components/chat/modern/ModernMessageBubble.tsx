import React from 'react';
import type { ChatMessage } from '../../../types';

interface ModernMessageBubbleProps {
  message: ChatMessage;
  isSelf: boolean;
}

const AVATAR_COLORS = [
  '#e4584f', // HUSH Red
  '#48d8d1', // Cyan
  '#c9a54a', // Amber
  '#8cb56e', // Phosphor Green
  '#a78bfa', // Purple
  '#f472b6', // Pink
];

const getAvatarColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export const ModernMessageBubble: React.FC<ModernMessageBubbleProps> = ({ message, isSelf }) => {
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (message.isSystem) {
    return (
      <div className="modern-system-pill font-sans">
        <span className="system-pill-dot">●</span>
        <span className="system-pill-text">{message.text}</span>
      </div>
    );
  }

  const senderName = message.senderName || 'Anonymous';
  const senderInitial = senderName.charAt(0).toUpperCase();
  const avatarBg = getAvatarColor(senderName);

  return (
    <div className={`modern-msg-row ${isSelf ? 'is-self' : 'is-peer'} font-sans`}>
      {!isSelf && (
        <div
          className="modern-avatar font-mono"
          style={{ backgroundColor: `${avatarBg}22`, borderColor: `${avatarBg}55`, color: avatarBg }}
          title={senderName}
        >
          {senderInitial}
        </div>
      )}

      <div className="modern-msg-bubble">
        {!isSelf && (
          <div className="modern-msg-author" style={{ color: avatarBg }}>
            {senderName}
          </div>
        )}

        <div className="modern-msg-text">{message.text}</div>

        <div className="modern-msg-time">{formattedTime}</div>
      </div>
    </div>
  );
};
