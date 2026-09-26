import React, { useState, useRef, useEffect } from 'react';
import { Send, Terminal } from 'lucide-react';
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
  const [showCommandMenu, setShowCommandMenu] = useState(false);
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
    setShowCommandMenu(false);
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

  const executeCommand = (cmd: string) => {
    if (onLocalCommand) {
      onLocalCommand(cmd);
    }
    setShowCommandMenu(false);
  };

  return (
    <div className="modern-composer-box font-sans">
      {showCommandMenu && (
        <div className="modern-command-menu font-mono">
          <div className="menu-header">AVAILABLE COMMANDS</div>
          <button type="button" onClick={() => executeCommand('/peers')} className="cmd-item">
            <span className="cmd-name">/peers</span>
            <span className="cmd-desc">List connected participants</span>
          </button>
          <button type="button" onClick={() => executeCommand('/info')} className="cmd-item">
            <span className="cmd-name">/info</span>
            <span className="cmd-desc">Show room parameters</span>
          </button>
          <button type="button" onClick={() => executeCommand('/clear')} className="cmd-item">
            <span className="cmd-name">/clear</span>
            <span className="cmd-desc">Clear local view</span>
          </button>
          <button type="button" onClick={() => executeCommand('/help')} className="cmd-item">
            <span className="cmd-name">/help</span>
            <span className="cmd-desc">All commands</span>
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="modern-composer-form">
        <div className="modern-composer-input-row">
          <button
            type="button"
            onClick={() => setShowCommandMenu(!showCommandMenu)}
            className={`modern-cmd-toggle-btn ${showCommandMenu ? 'active' : ''}`}
            title="Terminal commands"
          >
            <Terminal className="w-4 h-4" />
          </button>

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
        </div>

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
