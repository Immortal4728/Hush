import React from 'react';
import { CountdownTimer } from '../../CountdownTimer';
import type { ConnectionStatus } from '../../../hooks/useWebSocket';

interface ModernRoomHeaderProps {
  roomCode: string;
  status: ConnectionStatus;
  expiresAt?: string;
  participantCount: number;
  onCopyCode: () => void;
  copied: boolean;
  onLeave: () => void;
  onHomeNavigate: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  uiMode: 'MODERN' | 'TERMINAL';
  onToggleUiMode: () => void;
}

export const ModernRoomHeader: React.FC<ModernRoomHeaderProps> = ({
  roomCode,
  status,
  expiresAt,
  participantCount,
  onCopyCode,
  copied,
  onLeave,
  onHomeNavigate,
  onToggleSidebar,
  isSidebarOpen,
  uiMode,
  onToggleUiMode,
}) => {
  const isConnected = status === 'CONNECTED';
  const statusColorClass = isConnected ? 'sys-ok' : status === 'EXPIRING' ? 'sys-warn' : 'sys-error';

  return (
    <header className="modern-header font-sans">
      <div className="modern-header-left">
        <button
          onClick={onHomeNavigate}
          className="modern-brand-btn"
          type="button"
          title="Return to Home"
        >
          <span className="modern-brand-name">HUSH</span>
          <span className="modern-brand-badge">SECURE</span>
        </button>

        <div className="modern-room-badge">
          <span className="modern-badge-label">ROOM:</span>
          <span className="modern-badge-code font-mono">{roomCode}</span>
          <button
            onClick={onCopyCode}
            className="modern-copy-btn"
            title="Copy room code"
            type="button"
          >
            {copied ? 'COPIED' : 'COPY'}
          </button>
        </div>

        <div className={`modern-status-tag ${statusColorClass}`}>
          <span className="status-dot" />
          <span className="status-text">{status}</span>
        </div>
      </div>

      <div className="modern-header-right">
        {expiresAt && (
          <div className="modern-timer-box font-mono">
            <CountdownTimer expiresAt={expiresAt} />
          </div>
        )}

        <button
          onClick={onToggleSidebar}
          className={`modern-nav-btn ${isSidebarOpen ? 'active' : ''}`}
          type="button"
          title="Participants & Room Details"
        >
          PEERS ({participantCount})
        </button>

        <button
          onClick={onToggleUiMode}
          className="modern-mode-switch-btn font-mono"
          type="button"
          title="Switch visual mode"
        >
          MODE: {uiMode}
        </button>

        <button onClick={onLeave} className="modern-exit-btn" type="button">
          LEAVE
        </button>
      </div>
    </header>
  );
};
