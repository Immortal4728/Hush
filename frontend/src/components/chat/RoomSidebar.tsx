import React from 'react';
import { CountdownTimer } from '../CountdownTimer';
import type { Participant, RoomInfoResponse } from '../../types';

interface RoomSidebarProps {
  participants: Participant[];
  currentParticipantId: string | null;
  roomInfo: RoomInfoResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenExtendModal?: () => void;
}

export const RoomSidebar: React.FC<RoomSidebarProps> = ({
  participants,
  currentParticipantId,
  roomInfo,
  isOpen,
  onClose,
  onOpenExtendModal,
}) => {
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && <div className="sidebar-backdrop sm:hidden" onClick={onClose} />}

      <aside className={`terminal-sidebar ${isOpen ? 'open' : ''} font-mono`}>
        <div className="sidebar-header-bar font-mono">
          <div className="sidebar-title-container font-mono">
            <span className="sidebar-title-main">HUSH // SESSION</span>
            <span className="sidebar-title-sub">DIAGNOSTICS</span>
          </div>
          <button onClick={onClose} className="terminal-close-btn" type="button" aria-label="Close diagnostics panel">
            [ × ]
          </button>
        </div>

        <div className="sidebar-content font-mono">
          {/* SECTION 1: SESSION */}
          <section className="sidebar-section">
            <div className="section-title">SESSION</div>
            <div className="section-subtitle">CONNECTED PEERS ({participants.length})</div>

            <div className="participant-list font-mono mt-1">
              {participants.map((p) => {
                const isMe = p.participantId === currentParticipantId;
                const isHost = p.host || p.isHost;

                return (
                  <div key={p.participantId} className={`participant-item ${isMe ? 'is-self' : ''}`}>
                    <div className="participant-info">
                      <span className="user-dot" />
                      <span className="participant-name">
                        {p.username} {isMe ? '(You)' : ''}
                      </span>
                    </div>
                    {isHost && <span className="host-tag">[HOST]</span>}
                  </div>
                );
              })}
            </div>
          </section>

          <div className="sidebar-divider" />

          {/* SECTION 2: ROOM */}
          <section className="sidebar-section">
            <div className="section-title">ROOM</div>

            <div className="room-param-grid font-mono">
              <div className="param-row">
                <span className="param-label">ROOM_ID</span>
                <span className="param-val sys-ok">{roomInfo?.roomCode || 'ACTIVE'}</span>
              </div>

              <div className="param-row">
                <span className="param-label">TYPE</span>
                <span className="param-val">{roomInfo?.type || 'DIRECT'}</span>
              </div>

              <div className="param-row">
                <span className="param-label">CAPACITY</span>
                <span className="param-val">
                  {participants.length} / {roomInfo?.maxParticipants || 2}
                </span>
              </div>
            </div>

            {roomInfo?.expiresAt && (
              <div className="expiration-box font-mono mt-2">
                <div className="param-label">EXPIRES IN</div>
                <div className="expires-timer-wrapper">
                  <CountdownTimer expiresAt={roomInfo.expiresAt} />
                </div>
                <button
                  type="button"
                  onClick={onOpenExtendModal}
                  className="terminal-extend-btn font-mono mt-2"
                  title="Extend session duration"
                >
                  [ EXTEND SESSION ]
                </button>
              </div>
            )}
          </section>

          <div className="sidebar-divider" />

          {/* SECTION 3: PRIVACY */}
          <section className="sidebar-section privacy-section">
            <div className="section-title">PRIVACY</div>

            <div className="privacy-block font-mono">
              <div className="privacy-badge sys-ok">ZERO-LOG MEMORY</div>
              <p className="privacy-text mt-1">
                Messages exist only while this channel is alive.
              </p>
              <p className="privacy-text muted">
                Once closed or expired, everything disappears permanently.
              </p>
            </div>
          </section>
        </div>
      </aside>
    </>
  );
};
