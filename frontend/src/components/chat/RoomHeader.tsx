import React from 'react';
import { Link } from 'react-router-dom';
import { Copy, Check, LogOut, Users, Shield } from 'lucide-react';
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
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
  roomCode,
  status,
  expiresAt,
  participantCount,
  onCopyCode,
  copied,
  onLeave,
  onToggleSidebar,
  isSidebarOpen,
}) => {
  const renderStatusBadge = () => {
    switch (status) {
      case 'CONNECTED':
        return (
          <span className="status-pill status-connected">
            <span className="status-dot green" />
            CONNECTED
          </span>
        );
      case 'CONNECTING':
        return (
          <span className="status-pill status-connecting">
            <span className="status-dot yellow animate-pulse" />
            CONNECTING...
          </span>
        );
      case 'RECONNECTING':
        return (
          <span className="status-pill status-reconnecting">
            <span className="status-dot yellow animate-pulse" />
            RECONNECTING...
          </span>
        );
      case 'EXPIRING':
        return (
          <span className="status-pill status-expiring">
            <span className="status-dot orange" />
            EXPIRING SOON
          </span>
        );
      default:
        return (
          <span className="status-pill status-disconnected">
            <span className="status-dot red" />
            DISCONNECTED
          </span>
        );
    }
  };

  return (
    <header className="chat-header">
      <div className="header-left">
        <Link to="/" className="brand-link">
          <Shield className="brand-icon" />
          <span className="brand-name font-mono">HUSH</span>
        </Link>

        <div className="room-code-badge">
          <span className="code-prefix">ROOM</span>
          <span className="code-text font-mono">{roomCode}</span>
          <button
            onClick={onCopyCode}
            className="copy-btn"
            title="Copy room code"
            type="button"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="hidden sm:flex items-center">
          {renderStatusBadge()}
        </div>
      </div>

      <div className="header-right">
        {expiresAt && (
          <div className="countdown-wrapper font-mono">
            <CountdownTimer expiresAt={expiresAt} />
          </div>
        )}

        <button
          onClick={onToggleSidebar}
          className={`sidebar-toggle-btn ${isSidebarOpen ? 'active' : ''}`}
          type="button"
          title="Toggle People & Info"
        >
          <Users className="w-4 h-4" />
          <span className="font-mono text-xs">{participantCount}</span>
        </button>

        <button onClick={onLeave} className="leave-btn font-mono" type="button">
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">LEAVE</span>
        </button>
      </div>
    </header>
  );
};
