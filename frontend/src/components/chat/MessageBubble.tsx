import React from 'react';
import type { ChatMessage } from '../../types';

interface MessageBubbleProps {
  message: ChatMessage;
  isSelf: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isSelf }) => {
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  if (message.isSystem) {
    const textLower = message.text.toLowerCase();
    const isError = textLower.includes('error') || textLower.includes('failed');
    const isWarn = textLower.includes('expir') || textLower.includes('warn') || textLower.includes('left');
    const isOk = textLower.includes('connect') || textLower.includes('joined') || textLower.includes('ready') || textLower.includes('ok');

    const prefix = isError ? '[ ERROR ]' : isWarn ? '[ WARN ]' : isOk ? '[ OK ]' : '[ SYS ]';
    const colorClass = isError ? 'sys-error' : isWarn ? 'sys-warn' : isOk ? 'sys-ok' : 'sys-info';

    return (
      <div className={`terminal-line terminal-line--sys ${colorClass} font-mono`}>
        <span className="line-time">[{formattedTime}]</span>
        <span className="line-prefix">{prefix}</span>
        <span className="line-content">{message.text}</span>
      </div>
    );
  }

  const promptName = message.senderName
    ? message.senderName.toLowerCase().replace(/\s+/g, '_')
    : 'user';

  return (
    <div className={`terminal-line terminal-line--msg ${isSelf ? 'is-self' : 'is-peer'} font-mono`}>
      <span className="line-prompt">
        <span className="prompt-name">{promptName}</span>
        <span className="prompt-host">@hush</span>
        <span className="prompt-symbol">:~$</span>
      </span>
      <span className="line-content">{message.text}</span>
      <span className="line-time">[{formattedTime}]</span>
    </div>
  );
};
