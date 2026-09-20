import React from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import './LandingPage.css';

export const LandingPage: React.FC = () => {
  return (
    <div className="page">
      <Header />

      <main className="landing">
        {/* Hero */}
        <section className="hero">
          <h1 className="hero-title">
            <span className="hero-line">Connect.</span>
            <span className="hero-line">Talk.</span>
            <span className="hero-line">Leave.</span>
          </h1>

          <p className="hero-subtitle">
            Private conversations that disappear when the room is gone.
          </p>

          <div className="hero-actions">
            <Link to="/create" className="btn btn-primary hero-btn">
              Create a room
            </Link>
            <Link to="/join" className="btn btn-secondary hero-btn">
              Join a room
            </Link>
          </div>

          <p className="hero-tagline">
            No account · No history · No clutter
          </p>
        </section>

        {/* How it works */}
        <section className="how-it-works" id="how-it-works">
          <div className="steps">
            {[
              { num: '01', label: 'Create a room', desc: 'Pick a username, type, and duration.' },
              { num: '02', label: 'Share the code', desc: 'Give the 6-character code to your peer.' },
              { num: '03', label: 'Talk', desc: 'Communicate in real time over WebSockets.' },
              { num: '04', label: 'Leave', desc: 'Close the tab or click leave.' },
              { num: '05', label: 'Gone', desc: 'Room and messages vanish from server memory.' },
            ].map((step, i) => (
              <div key={step.num} className="step animate-fadeIn" style={{ animationDelay: `${i * 0.08}s` }}>
                <span className="step-num font-mono">{step.num}</span>
                <div>
                  <p className="step-label">{step.label}</p>
                  <p className="step-desc">{step.desc}</p>
                </div>
                {i < 4 && (
                  <div className="step-connector">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <polyline points="19 12 12 19 5 12" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};
