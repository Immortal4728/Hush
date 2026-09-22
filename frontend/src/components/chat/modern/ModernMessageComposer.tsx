import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import type { ConnectionStatus } from '../../../hooks/useWebSocket';

interface ModernMessageComposerProps {
  status: ConnectionStatus;
  onSendMessage: (text: string) => void;
  onSendTyping: (typing: boolean) => void;
  onLocalCommand?: (command: string) => void;
}

export const ModernMessageComposer: React.FC<ModernMessageComposerProps> = ({
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
    <div className="modern-composer-box font-sans">
      <form onSubmit={handleSubmit} className="modern-composer-form">
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={
            isConnected
              ? 'Type a message...'
              : status === 'CONNECTING'
              ? 'Connecting to server...'
              : 'Disconnected'
          }
          disabled={!isConnected}
          maxLength={2000}
          rows={1}
          className="modern-textarea font-sans"
        />

        <div className="modern-composer-actions">
          <span className="modern-char-count font-mono">{inputText.length}/2000</span>
          <button
            type="submit"
            disabled={!isConnected || !inputText.trim()}
            className="modern-send-btn"
            title="Send message"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </form>
    </div>
  );
};
