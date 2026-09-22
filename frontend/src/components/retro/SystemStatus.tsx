import React from 'react';
import './SystemStatus.css';

export const SystemStatus: React.FC = () => {
  return (
    <div className="system-status sys-panel">
      <div className="system-status__header">
        System Status
      </div>
      
      <div className="system-status__grid">
        <div className="system-status__row">
          <span className="system-status__label">Connection</span>
          <span className="system-status__value">CHANNEL READY</span>
        </div>
        <div className="system-status__row">
          <span className="system-status__label">Identity</span>
          <span className="system-status__value">NO ACCOUNT REQUIRED</span>
        </div>
        <div className="system-status__row">
          <span className="system-status__label">Session Type</span>
          <span className="system-status__value alert">EPHEMERAL</span>
        </div>
        <div className="system-status__row">
          <span className="system-status__label">Encryption</span>
          <span className="system-status__value">ACTIVE</span>
        </div>
      </div>
    </div>
  );
};
