import React from 'react';
import { CountdownTimer } from '../../CountdownTimer';
import type { ConnectionStatus } from '../../../hooks/useWebSocket';

interface ModernRoomHeaderProps {
  roomCode: string;
  status: ConnectionStatus;
  expiresAt?: string;
  participantCount: number;
  roomType?: string;
  onCopyCode: () => void;
  copied: boolean;
  onLeave: () => void;
  onHomeNavigate: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  uiMode: 'MODERN' | 'TERMINAL';
  onToggleUiMode: () => void;
  onNextStranger?: () => void;
}

export const ModernRoomHeader: React.FC<ModernRoomHeaderProps> = ({
  roomCode,
  status,
  expiresAt,
  participantCount,
  roomType,
  onCopyCode,
  copied,
  onLeave,
  onHomeNavigate,
  onToggleSidebar,
  isSidebarOpen,
  uiMode,
  onToggleUiMode,
  onNextStranger,
}) => {
  const isConnected = status === 'CONNECTED';
  const statusColorClass = isConnected ? 'sys-ok' : status === 'EXPIRING' ? 'sys-warn' : 'sys-error';
  const statusLabel = isConnected ? 'CONNECTED' : status === 'CONNECTING' ? 'CONNECTING...' : 'DISCONNECTED';

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
            {copied ? '✓ COPIED' : 'COPY'}
          </button>
        </div>

        {roomType && (
          <div className="modern-type-badge hidden md:flex">
            <span>{roomType}</span>
          </div>
        )}

        <div className={`modern-status-tag ${statusColorClass}`}>
          <span className="status-dot" />
          <span className="status-text">{statusLabel}</span>
        </div>
      </div>

      <div className="modern-header-right">
        {expiresAt && (
          <div className="modern-timer-box font-mono" title="Session time remaining">
            <span className="timer-icon">⏳</span>
            <CountdownTimer expiresAt={expiresAt} />
          </div>
        )}

        {onNextStranger && (
          <button
            onClick={onNextStranger}
            className="modern-nav-btn font-mono"
            type="button"
            title="Find another stranger"
            style={{ color: '#00ffaa', borderColor: 'rgba(0,255,170,0.5)', backgroundColor: 'rgba(0,255,170,0.1)' }}
          >
            NEXT STRANGER
          </button>
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
          title="Switch to Terminal UI"
        >
          {uiMode}
        </button>

        <button onClick={onLeave} className="modern-exit-btn" type="button" title="Leave room">
          EXIT
        </button>
      </div>
    </header>
  );
};
