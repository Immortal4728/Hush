import React, { useState, useRef } from 'react';
import { Send } from 'lucide-react';
import type { ConnectionStatus } from '../../hooks/useWebSocket';

interface MessageComposerProps {
  status: ConnectionStatus;
  onSendMessage: (text: string) => void;
  onSendTyping: (typing: boolean) => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  status,
  onSendMessage,
  onSendTyping,
}) => {
  const [inputText, setInputText] = useState('');
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  const isConnected = status === 'CONNECTED';

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || !isConnected) return;

    onSendMessage(trimmed);
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
    <div className="message-composer-wrapper">
      <form onSubmit={handleSubmit} className="message-composer-form">
        <div className="input-container">
          <textarea
            value={inputText}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isConnected
                ? 'Type a message... (Enter to send, Shift+Enter for newline)'
                : status === 'CONNECTING'
                ? 'Connecting to server...'
                : status === 'RECONNECTING'
                ? 'Reconnecting to server...'
                : 'Disconnected'
            }
            disabled={!isConnected}
            maxLength={2000}
            rows={1}
            className="composer-textarea font-mono"
          />
          <span className="char-counter font-mono">
            {inputText.length} / 2000
          </span>
        </div>

        <button
          type="submit"
          disabled={!isConnected || !inputText.trim()}
          className="composer-send-btn font-mono"
          title="Send message (Enter)"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
