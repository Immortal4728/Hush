import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import './AboutPage.css';

export const AboutPage: React.FC = () => {
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

      <main className="page-center page-center--about">
        <div className="about-layout animate-fadeIn">
          {/* LEFT SIDE: DIGITAL ART VIEWPORT */}
          <div className="art-viewport">
            <div className="art-bezel">
              <div className="art-corner corner-tl" />
              <div className="art-corner corner-tr" />
              <div className="art-corner corner-bl" />
              <div className="art-corner corner-br" />

              <div className="art-top-bar font-mono">
                <span className="art-tag">[ SIGNAL_FEED // CH_01 ]</span>
                <span className="art-status">
                  <span className="status-dot" /> LIVE
                </span>
              </div>

              <div className="art-image-wrapper">
                <img
                  src="/terminal_art.png"
                  alt="HUSH Terminal Surveillance Digital Art"
                  className="art-image"
                />
                <div className="art-overlay-scanlines" />
                <div className="art-overlay-vignette" />
              </div>

              <div className="art-bottom-bar font-mono">
                <span>FREQ: 842.10 MHz</span>
                <span className="art-channel">SYSTEM DEVELOPER</span>
              </div>

              {/* Diagnostic metadata block under signal feed */}
              <div className="art-diag-grid font-mono">
                <div className="diag-row">
                  <span className="diag-key">SIGNAL</span>
                  <span className="diag-val diag-val--active">ACTIVE</span>
                </div>
                <div className="diag-row">
                  <span className="diag-key">SOURCE</span>
                  <span className="diag-val">HUSH_NODE_01</span>
                </div>
                <div className="diag-row">
                  <span className="diag-key">STATUS</span>
                  <span className="diag-val diag-val--green">
                    TRANSMITTING <span className="status-dot status-dot--sm" />
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: DEVELOPER PROFILE */}
          <div className="profile-viewport">
            <div className="terminal-panel profile-panel">
              <div className="panel-corner corner-tl" />
              <div className="panel-corner corner-tr" />
              <div className="panel-corner corner-bl" />
              <div className="panel-corner corner-br" />

              <div className="profile-header">
                <span className="profile-tag">[ DEVELOPER PROFILE // PROFILE_001 ]</span>
              </div>

              {/* Developer Name */}
              <h1 className="dev-name">
                RISHI<br />
                <span className="dev-name-last">CHOWDARY</span>
              </h1>

              {/* Developer Role */}
              <div className="dev-role">
                <span className="role-title">JAVA FULL STACK DEVELOPER</span>
              </div>

              <div className="profile-divider" />

              {/* ABOUT THE DEVELOPER section */}
              <div className="profile-section">
                <span className="profile-subtag">[ ABOUT THE DEVELOPER // PROFILE_002 ]</span>
                <p className="profile-bio font-mono">
                  I build full-stack applications with a focus on Java, Spring Boot, distributed systems, and real-time web applications.
                </p>

                <div className="current-systems font-mono">
                  <div className="systems-label">CURRENT SYSTEMS</div>
                  <div className="system-item">
                    <span className="sys-name">HUSH</span>
                    <span className="sys-desc">TEMPORARY COMMUNICATION</span>
                  </div>
                  <div className="system-item">
                    <span className="sys-name">ATLAS KV</span>
                    <span className="sys-desc">DISTRIBUTED KEY-VALUE STORE</span>
                  </div>
                </div>
              </div>

              <div className="profile-divider" />

              {/* Refined Education section */}
              <div className="profile-block">
                <div className="profile-block-label">EDUCATION</div>
                <div className="edu-status">STUDENT</div>
                <div className="edu-institution font-mono">
                  Sai Tirumala NVR Engineering College
                </div>
              </div>

              {/* Technical Metadata Grid */}
              <div className="profile-meta-grid font-mono">
                <div className="meta-row">
                  <span className="meta-key">IDENTITY</span>
                  <span className="meta-val">RISHI CHOWDARY</span>
                </div>
                <div className="meta-row">
                  <span className="meta-key">ROLE</span>
                  <span className="meta-val">JAVA FULL STACK DEVELOPER</span>
                </div>
                <div className="meta-row">
                  <span className="meta-key">STATUS</span>
                  <span className="meta-val">STUDENT</span>
                </div>
                <div className="meta-row">
                  <span className="meta-key">SYSTEM</span>
                  <span className="meta-val">HUSH DEVELOPER</span>
                </div>
              </div>

              {/* HUSH Connection */}
              <div className="hush-note font-mono">
                <p>
                  HUSH is a project built around temporary communication, minimal identity, and disappearing conversations.
                </p>
                <p className="note-accent">
                  Built as a full-stack engineering project.
                </p>
              </div>

              {/* External signals footer */}
              <div className="panel-footer dev-links-footer">
                <div className="external-signals-label font-mono">EXTERNAL SIGNALS //</div>
                <div className="dev-links-grid font-mono">
                  <a
                    href="https://github.com/Immortal4728"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dev-social-link"
                  >
                    <span className="link-bracket">[</span>
                    <span className="link-label">GITHUB</span>
                    <span className="link-bracket">]</span>
                  </a>
                  <a
                    href="https://www.linkedin.com/in/immortal4728/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dev-social-link"
                  >
                    <span className="link-bracket">[</span>
                    <span className="link-label">LINKEDIN</span>
                    <span className="link-bracket">]</span>
                  </a>
                  <a
                    href="https://rishi-chowdary.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dev-social-link"
                  >
                    <span className="link-bracket">[</span>
                    <span className="link-label">PORTFOLIO</span>
                    <span className="link-bracket">]</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
