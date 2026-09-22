import React from 'react';
import { Header } from '../components/Header';
import { RetroButton } from '../components/retro/RetroButton';
import { SystemStatus } from '../components/retro/SystemStatus';
import './LandingPage.css';

export const LandingPage: React.FC = () => {
  return (
    <div className="page page-enter hush-vhs">
      <Header />

      <main className="landing">
        <section className="hero">
          <h1 className="hero-title hush-display">
            HUSH
          </h1>

          <p className="hero-subtitle">
            Temporary Communication Channel
          </p>

          <div className="hero-actions">
            <RetroButton to="/create">
              Create Room
            </RetroButton>
            <RetroButton to="/join">
              Join Room
            </RetroButton>
          </div>

          <SystemStatus />
        </section>
      </main>
    </div>
  );
};

