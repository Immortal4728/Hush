import React from 'react';
import { CountdownTimer } from '../../CountdownTimer';
import type { Participant, RoomInfoResponse } from '../../../types';

interface ModernRoomSidebarProps {
  participants: Participant[];
  currentParticipantId: string | null;
  roomInfo: RoomInfoResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenExtendModal?: () => void;
}

export const ModernRoomSidebar: React.FC<ModernRoomSidebarProps> = ({
  participants,
  currentParticipantId,
  roomInfo,
  isOpen,
  onClose,
  onOpenExtendModal,
}) => {
  return (
    <>
      {isOpen && <div className="modern-sidebar-backdrop sm:hidden" onClick={onClose} />}

      <aside className={`modern-sidebar ${isOpen ? 'open' : ''} font-sans`}>
        <div className="modern-sidebar-header">
          <span className="sidebar-heading">ROOM DETAILS</span>
          <button onClick={onClose} className="modern-close-btn" type="button" aria-label="Close sidebar">
            ×
          </button>
        </div>

        <div className="modern-sidebar-body">
          {/* PEOPLE SECTION */}
          <section className="modern-side-section">
            <h4 className="side-section-title">PEOPLE ({participants.length})</h4>
            <div className="modern-peer-list">
              {participants.map((p) => {
                const isMe = p.participantId === currentParticipantId;
                const isHost = p.host || p.isHost;

                return (
                  <div key={p.participantId} className={`modern-peer-item ${isMe ? 'is-self' : ''}`}>
                    <div className="peer-info">
                      <span className="online-dot" />
                      <span className="peer-name">
                        {p.username} {isMe ? '(You)' : ''}
                      </span>
                    </div>
                    {isHost && <span className="modern-host-badge">HOST</span>}
                  </div>
                );
              })}
            </div>
          </section>

          <div className="modern-sidebar-divider" />

          {/* ROOM PARAMETERS */}
          <section className="modern-side-section">
            <h4 className="side-section-title">ROOM</h4>
            <div className="modern-param-list">
              <div className="modern-param-row">
                <span className="param-label">Room Type</span>
                <span className="param-value">{roomInfo?.type || 'DIRECT'}</span>
              </div>
              <div className="modern-param-row">
                <span className="param-label">Capacity</span>
                <span className="param-value">{participants.length} / {roomInfo?.maxParticipants || 2}</span>
              </div>
            </div>

            {roomInfo?.expiresAt && (
              <div className="modern-expires-card mt-3">
                <span className="expires-label">EXPIRES IN</span>
                <div className="expires-timer font-mono mt-1">
                  <CountdownTimer expiresAt={roomInfo.expiresAt} />
                </div>
                <button
                  type="button"
                  onClick={onOpenExtendModal}
                  className="modern-extend-btn mt-3 font-sans"
                >
                  EXTEND SESSION
                </button>
              </div>
            )}
          </section>

          <div className="modern-sidebar-divider" />

          {/* PRIVACY */}
          <section className="modern-side-section privacy-section">
            <h4 className="side-section-title">PRIVACY</h4>
            <div className="modern-privacy-card">
              <div className="privacy-badge">ZERO-LOG MEMORY</div>
              <p className="privacy-desc">
                Messages exist only while the room is alive. Once the room expires or is closed, the conversation disappears permanently.
              </p>
            </div>
          </section>
        </div>
      </aside>
    </>
  );
};
