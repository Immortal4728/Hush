import React, { useState, useRef, useEffect } from 'react';
import type { ConnectionStatus } from '../../hooks/useWebSocket';

interface MessageComposerProps {
  username: string;
  status: ConnectionStatus;
  onSendMessage: (text: string) => void;
  onSendTyping: (typing: boolean) => void;
  onLocalCommand?: (command: string) => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  username,
  status,
  onSendMessage,
  onSendTyping,
  onLocalCommand,
}) => {
  const [inputText, setInputText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  const isConnected = status === 'CONNECTED';
  const promptName = username ? username.toLowerCase().replace(/\s+/g, '_') : 'user';

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || !isConnected) return;

    if (trimmed.startsWith('/') && onLocalCommand) {
      onLocalCommand(trimmed);
    } else {
      onSendMessage(trimmed);
    }

    setInputText('');
    onSendTyping(false);
    lastTypingSentRef.current = 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);

    if (isConnected) {
      const now = Date.now();
      if (now - lastTypingSentRef.current > 2000) {
        onSendTyping(true);
        lastTypingSentRef.current = now;
      }
      
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        onSendTyping(false);
        lastTypingSentRef.current = 0;
      }, 2000);
    }
  };

  return (
    <div className="terminal-composer" onClick={() => textareaRef.current?.focus()}>
      <form onSubmit={handleSubmit} className="composer-shell-line font-mono">
        <span className="composer-prompt">
          <span className="prompt-name">{promptName}</span>
          <span className="prompt-host">@hush</span>
          <span className="prompt-symbol">:~$</span>
        </span>

        <div className="composer-input-area">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isConnected
                ? 'type a message or /help...'
                : status === 'CONNECTING'
                ? 'connecting to server...'
                : status === 'RECONNECTING'
                ? 'reconnecting to server...'
                : 'disconnected'
            }
            disabled={!isConnected}
            maxLength={2000}
            rows={1}
            className="shell-textarea font-mono"
            aria-label="Terminal prompt input"
          />
          <span className="cursor-block" aria-hidden="true">█</span>
        </div>
      </form>
    </div>
  );
};
