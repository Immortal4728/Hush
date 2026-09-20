import React from 'react';

interface TypingIndicatorProps {
  typingUsers: string[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers }) => {
  if (typingUsers.length === 0) return null;

  const text =
    typingUsers.length === 1
      ? `${typingUsers[0]} is typing...`
      : `${typingUsers.join(', ')} are typing...`;

  return (
    <div className="typing-indicator font-mono">
      <span className="typing-dot animate-pulse" />
      <span>{text}</span>
    </div>
  );
};
