import React from 'react';
import { Copy, Check, Users, LogOut, Clock, Radio } from 'lucide-react';
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
  onNextStranger?: () => void;
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
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copied ? 'COPIED' : 'COPY'}</span>
          </button>
        </div>

        {/* Subtle connection warning status tag ONLY when NOT connected */}
        {!isConnected && (
          <div className={`modern-status-tag ${statusColorClass}`}>
            <span className="status-dot" />
            <span className="status-text">{statusLabel}</span>
          </div>
        )}
      </div>

      <div className="modern-header-right">
        {expiresAt && (
          <div className="modern-timer-box font-mono" title="Session time remaining">
            <Clock size={14} className="timer-icon" />
            <CountdownTimer expiresAt={expiresAt} />
          </div>
        )}

        {onNextStranger && (
          <button
            onClick={onNextStranger}
            className="modern-next-stranger-btn"
            type="button"
            title="Find another stranger"
          >
            <Radio size={14} />
            <span>NEXT STRANGER</span>
          </button>
        )}

        <button
          onClick={onToggleSidebar}
          className={`modern-nav-btn ${isSidebarOpen ? 'active' : ''}`}
          type="button"
          title="Participants & Room Details"
        >
          <Users size={14} />
          <span>PEERS ({participantCount})</span>
        </button>

        <button onClick={onLeave} className="modern-exit-btn" type="button" title="Leave room">
          <LogOut size={14} />
          <span>EXIT</span>
        </button>
      </div>
    </header>
  );
};

