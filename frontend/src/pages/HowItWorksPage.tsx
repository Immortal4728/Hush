import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import './HowItWorksPage.css';

export const HowItWorksPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate('/');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="page page-enter">
      <Header />

      <main className="page-center">
        <div className="terminal-panel terminal-panel--wide animate-fadeIn">
          <div className="panel-corner corner-tl" />
          <div className="panel-corner corner-tr" />
          <div className="panel-corner corner-bl" />
          <div className="panel-corner corner-br" />

          {/* Page Header */}
          <div className="info-header">
            <span className="info-tag">[ SYSTEM MANUAL ]</span>
            <h1 className="info-title">HOW HUSH WORKS</h1>
            <p className="info-subtitle">
              TEMPORARY COMMUNICATION. NO ACCOUNT. NO PERMANENT IDENTITY.
            </p>
          </div>

          <div className="info-intro">
            HUSH creates temporary communication channels that exist only for a limited period of time.
            Create a room. Share the room code. Talk. When the session expires, the channel disappears.
          </div>

          {/* Steps */}
          <div className="steps-container">
            <section className="step-card">
              <div className="step-num">01 /</div>
              <div className="step-body">
                <h2 className="step-title">CREATE A CHANNEL</h2>
                <p className="step-text">
                  Create a temporary room and choose the session configuration:
                </p>
                <div className="step-specs">
                  <div className="spec-item">
                    <span className="spec-label">ROOM TYPE:</span>
                    <span className="spec-val">DIRECT (2) / GROUP (UP TO 20)</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">DURATION:</span>
                    <span className="spec-val">30 MIN / 1 HOUR / 3 HOURS</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="step-card">
              <div className="step-num">02 /</div>
              <div className="step-body">
                <h2 className="step-title">SHARE THE CODE</h2>
                <p className="step-text">
                  After creating a room, HUSH provides a unique 6-character room code.
                  Share the code directly with the people you want to communicate with.
                  No account or profile registration is required.
                </p>
              </div>
            </section>

            <section className="step-card">
              <div className="step-num">03 /</div>
              <div className="step-body">
                <h2 className="step-title">ENTER THE CHANNEL</h2>
                <p className="step-text">
                  Participants enter the 6-character room code and choose a temporary display name.
                  All participants enter the exact same temporary communication channel.
                </p>
              </div>
            </section>

            <section className="step-card">
              <div className="step-num">04 /</div>
              <div className="step-body">
                <h2 className="step-title">COMMUNICATE</h2>
                <p className="step-text">
                  Messages are exchanged through HUSH's real-time communication channel.
                  No permanent timeline, history feed, or public archive is maintained.
                </p>
              </div>
            </section>

            <section className="step-card">
              <div className="step-num">05 /</div>
              <div className="step-body">
                <h2 className="step-title">THE CHANNEL EXPIRES</h2>
                <p className="step-text">
                  HUSH is designed around temporary sessions.
                  When the configured room lifetime ends, the session is destroyed automatically and is no longer accessible.
                </p>
              </div>
            </section>
          </div>

          {/* System Model Diagram */}
          <section className="system-diagram-box">
            <div className="diagram-header">[ SYSTEM MODEL ]</div>
            <div className="diagram-flow font-mono">
              <div className="diagram-node">CHANNEL</div>
              <div className="diagram-arrow">↓</div>
              <div className="diagram-node">TEMPORARY SESSION</div>
              <div className="diagram-arrow">↓</div>
              <div className="diagram-node">PARTICIPANTS</div>
              <div className="diagram-arrow">↓</div>
              <div className="diagram-node">REAL-TIME MESSAGES</div>
              <div className="diagram-arrow">↓</div>
              <div className="diagram-node">SESSION EXPIRATION</div>
              <div className="diagram-arrow">↓</div>
              <div className="diagram-node node-alert font-mono">CHANNEL GONE</div>
            </div>
          </section>

          {/* Footer Back */}
          <div className="panel-footer">
            <Link to="/" className="back-link">
              ← [ ESC ] BACK TO TERMINAL
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};
