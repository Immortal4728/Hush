import React from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { SystemStatus } from '../components/retro/SystemStatus';
import { Radio, PlusCircle, LogIn, ShieldAlert, Zap, Cpu } from 'lucide-react';
import './LandingPage.css';


export const LandingPage: React.FC = () => {
  return (
    <div className="page page-enter hush-vhs">
      <Header />

      <main className="landing">
        <section className="hero">
          {/* Main Title with Preserved Glitch Layer */}
          <div className="hero-badge">
            <span className="hero-badge-dot"></span>
            ZERO-PERSISTENCE COMMUNICATION SYSTEM
          </div>

          <h1 className="hero-title hush-display" data-text="HUSH">
            HUSH
          </h1>

          <div className="hero-motto">
            <span>CONNECT.</span>
            <span className="dot">•</span>
            <span>TALK.</span>
            <span className="dot">•</span>
            <span>LEAVE.</span>
          </div>

          <p className="hero-subtitle">
            Anonymous, volatile room messaging. Zero user tracking. Zero database records. Automatic auto-destruction upon session expiration.
          </p>

          {/* Hierarchical Actions */}
          <div className="hero-action-grid">
            <Link to="/stranger" className="action-card action-card-primary">
              <div className="action-card-header">
                <div className="action-icon-wrapper primary-icon">
                  <Radio size={24} />
                </div>
                <span className="action-badge">INSTANT MATCH</span>
              </div>
              <h2 className="action-title">TALK TO A STRANGER</h2>
              <p className="action-desc">
                Anonymously pair with an online peer looking for immediate, temporary conversation.
              </p>
              <div className="action-cta">
                <span>PAIR NOW</span>
                <span className="arrow">→</span>
              </div>
            </Link>

            <Link to="/create" className="action-card">
              <div className="action-card-header">
                <div className="action-icon-wrapper">
                  <PlusCircle size={24} />
                </div>
                <span className="action-tag">DIRECT / GROUP</span>
              </div>
              <h2 className="action-title">CREATE ROOM</h2>
              <p className="action-desc">
                Initialize a private 1-on-1 or multi-user channel with customizable expiration TTL.
              </p>
              <div className="action-cta">
                <span>CREATE</span>
                <span className="arrow">→</span>
              </div>
            </Link>

            <Link to="/join" className="action-card">
              <div className="action-card-header">
                <div className="action-icon-wrapper">
                  <LogIn size={24} />
                </div>
                <span className="action-tag">ENTER CODE</span>
              </div>
              <h2 className="action-title">JOIN ROOM</h2>
              <p className="action-desc">
                Enter an existing room code to drop straight into an active ephemeral conversation.
              </p>
              <div className="action-cta">
                <span>JOIN</span>
                <span className="arrow">→</span>
              </div>
            </Link>
          </div>

          {/* Value Props & Ideology Highlights */}
          <div className="hero-pillars">
            <div className="pillar-item">
              <ShieldAlert size={18} className="pillar-icon" />
              <div>
                <strong>Zero Database Persistence</strong>
                <p>Messages reside exclusively in volatile RAM and vanish forever when destroyed.</p>
              </div>
            </div>

            <div className="pillar-item">
              <Zap size={18} className="pillar-icon" />
              <div>
                <strong>Auto-Expiring Lifespan</strong>
                <p>Strict Time-To-Live auto-purges channels once the session timer runs out.</p>
              </div>
            </div>

            <div className="pillar-item">
              <Cpu size={18} className="pillar-icon" />
              <div>
                <strong>Dual Interface Engine</strong>
                <p>Hot-swap between Modern Messaging and Cyberpunk VHS Terminal mid-chat.</p>
              </div>
            </div>
          </div>

          {/* System Status Component */}
          <div className="hero-status-wrapper">
            <SystemStatus />
          </div>
        </section>
      </main>
    </div>
  );
};


