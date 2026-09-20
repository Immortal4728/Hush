import React from 'react';
import { Users, Crown, ShieldCheck, Clock, X } from 'lucide-react';
import { CountdownTimer } from '../CountdownTimer';
import type { Participant, RoomInfoResponse } from '../../types';

interface RoomSidebarProps {
  participants: Participant[];
  currentParticipantId: string | null;
  roomInfo: RoomInfoResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RoomSidebar: React.FC<RoomSidebarProps> = ({
  participants,
  currentParticipantId,
  roomInfo,
  isOpen,
  onClose,
}) => {
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && <div className="sidebar-backdrop sm:hidden" onClick={onClose} />}

      <aside className={`room-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header sm:hidden">
          <span className="font-mono text-xs text-zinc-400 font-bold uppercase">Room Info & Peers</span>
          <button onClick={onClose} className="close-btn" type="button">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="sidebar-content">
          {/* SECTION 1: PEOPLE */}
          <section className="sidebar-section">
            <h4 className="section-title font-mono flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              PEOPLE ({participants.length})
            </h4>

            <div className="participant-list font-mono text-xs">
              {participants.map((p) => {
                const isMe = p.participantId === currentParticipantId;
                const isHost = p.host || p.isHost;

                return (
                  <div
                    key={p.participantId}
                    className={`participant-item ${isMe ? 'is-self' : ''}`}
                  >
                    <div className="participant-info">
                      <span className="user-dot" />
                      <span className="participant-name truncate">
                        {p.username} {isMe ? '(You)' : ''}
                      </span>
                    </div>

                    {isHost && (
                      <span className="host-badge" title="Room Host">
                        <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="host-text">HOST</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECTION 2: ROOM */}
          <section className="sidebar-section">
            <h4 className="section-title font-mono flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              ROOM
            </h4>

            <div className="room-meta-card font-mono text-xs space-y-2">
              <div className="meta-row">
                <span className="meta-label">TYPE</span>
                <span className="meta-val font-bold text-white">{roomInfo?.type || 'DIRECT'}</span>
              </div>

              <div className="meta-row">
                <span className="meta-label">CAPACITY</span>
                <span className="meta-val">
                  {participants.length} / {roomInfo?.maxParticipants || 2}
                </span>
              </div>

              {roomInfo?.expiresAt && (
                <div className="meta-row">
                  <span className="meta-label">EXPIRES IN</span>
                  <div className="meta-val font-mono text-emerald-400">
                    <CountdownTimer expiresAt={roomInfo.expiresAt} />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* SECTION 3: PRIVACY */}
          <section className="sidebar-section privacy-section">
            <h4 className="section-title font-mono flex items-center gap-2 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              PRIVACY
            </h4>

            <div className="privacy-card">
              <span className="privacy-badge font-mono">ZERO-LOG MEMORY</span>
              <p className="privacy-desc">
                Messages exist only while this room is alive. Once closed or expired, everything disappears permanently.
              </p>
            </div>
          </section>
        </div>
      </aside>
    </>
  );
};
