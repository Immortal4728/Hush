import React from 'react';
import type { Participant } from '../types';
import './ParticipantList.css';

interface ParticipantListProps {
  participants: Participant[];
  myParticipantId: string | null;
  onClose?: () => void;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({
  participants,
  myParticipantId,
  onClose,
}) => {
  return (
    <div className="participant-list">
      <div className="participant-list-header">
        <h3 className="participant-list-title">
          Participants
          <span className="participant-count">{participants.length}</span>
        </h3>
        {onClose && (
          <button
            className="participant-close-btn"
            onClick={onClose}
            aria-label="Close participant list"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      <div className="participant-items">
        {participants.map((p) => (
          <div
            key={p.participantId}
            className={`participant-item ${p.participantId === myParticipantId ? 'is-self' : ''}`}
          >
            <span className="participant-dot" />
            <span className="participant-name">{p.username}</span>
            {p.host && (
              <span className="participant-badge" title="Host">
                Host
              </span>
            )}
            {p.participantId === myParticipantId && (
              <span className="participant-badge you-badge">You</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
