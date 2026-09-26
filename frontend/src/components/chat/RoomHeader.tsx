import React from 'react';
import { CountdownTimer } from '../CountdownTimer';
import type { ConnectionStatus } from '../../hooks/useWebSocket';

interface RoomHeaderProps {
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
  uiMode?: 'MODERN' | 'TERMINAL';
  onToggleUiMode?: () => void;
  onNextStranger?: () => void;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
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
  onNextStranger,
}) => {
  const isConnected = status === 'CONNECTED';
  const statusColorClass = isConnected ? 'sys-ok' : status === 'EXPIRING' ? 'sys-warn' : 'sys-error';

  return (
    <header className="terminal-header font-mono">
      <div className="header-left">
        {/* HUSH logo navigates home directly and cleans up session state */}
        <button
          onClick={onHomeNavigate}
          className="brand-link-btn font-mono"
          type="button"
          title="Navigate Home"
        >
          <span className="header-brand-tag">HUSH</span>
          <span className="header-sub-tag hidden md:inline">// TERMINAL SESSION</span>
        </button>

        <div className="terminal-badge">
          <span className="badge-label">ROOM_ID:</span>
          <span className="badge-val">{roomCode}</span>
          <button
            onClick={onCopyCode}
            className="terminal-copy-btn"
            title="Copy room code"
            type="button"
          >
            {copied ? '[COPIED]' : '[COPY]'}
          </button>
        </div>

        <div className={`status-indicator ${statusColorClass}`}>
          <span className="status-dot" />
          <span className="status-text">{status}</span>
        </div>
      </div>

      <div className="header-right">
        {expiresAt && (
          <div className="countdown-container font-mono">
            <CountdownTimer expiresAt={expiresAt} />
          </div>
        )}

        <span className="header-stat-item hidden sm:inline-block font-mono">
          [ PEERS: {participantCount} ]
        </span>

        {onNextStranger && (
          <button
            onClick={onNextStranger}
            className="terminal-nav-btn font-mono"
            type="button"
            title="Find another stranger"
            style={{ color: '#00ffaa', borderColor: 'rgba(0,255,170,0.5)' }}
          >
            <span>[ NEXT STRANGER ]</span>
          </button>
        )}

        {onToggleUiMode && (
          <button
            onClick={onToggleUiMode}
            className="terminal-nav-btn font-mono"
            type="button"
            title="Switch visual mode"
          >
            <span>[ MODE: {uiMode || 'TERMINAL'} ]</span>
          </button>
        )}

        <button
          onClick={onToggleSidebar}
          className={`terminal-nav-btn ${isSidebarOpen ? 'active' : ''}`}
          type="button"
          title="Toggle Diagnostics Sidebar"
        >
          <span>[ SIDEBAR ]</span>
        </button>

        <button onClick={onLeave} className="terminal-exit-btn" type="button">
          <span>[ EXIT ]</span>
        </button>
      </div>
    </header>
  );
};
