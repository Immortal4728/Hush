import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import './AboutPage.css';

interface ProfileData {
  id: string;
  subtag: string;
  nameFirst: string;
  nameLast: string;
  role: string;
  bio: string;
  systems: { name: string; desc: string }[];
  metadata: { identity: string; role: string; status: string; system: string };
  links: { label: string; url: string }[];
}

const PROFILES: ProfileData[] = [
  {
    id: 'PROFILE_001',
    subtag: '[ ABOUT THE DEVELOPER ]',
    nameFirst: 'RISHI',
    nameLast: 'CHOWDARY',
    role: 'SDE ENGINEER',
    bio: 'I build full-stack applications with a focus on Java, Spring Boot, distributed systems, real-time applications, and scalable backend architecture.',
    systems: [
      { name: 'HUSH', desc: 'TEMPORARY COMMUNICATION' },
      { name: 'ATLAS KV', desc: 'DISTRIBUTED KEY-VALUE STORE' },
    ],
    metadata: {
      identity: 'RISHI CHOWDARY',
      role: 'SDE ENGINEER',
      status: 'ACTIVE',
      system: 'HUSH DEVELOPER',
    },
    links: [
      { label: 'GITHUB', url: 'https://github.com/Immortal4728' },
      { label: 'LINKEDIN', url: 'https://www.linkedin.com/in/immortal4728/' },
      { label: 'PORTFOLIO', url: 'https://rishi-chowdary.vercel.app/' },
    ],
  },
  {
    id: 'PROFILE_002',
    subtag: '[ ABOUT THE AI ENGINEER ]',
    nameFirst: 'BHARATH',
    nameLast: 'TOMMANDRU',
    role: 'AI ENGINEER',
    bio: 'Focusing on artificial intelligence, machine learning models, intelligent algorithms, and modern full-stack web applications.',
    systems: [
      { name: 'CVFOLIOX', desc: 'DEVELOPER / AI PORTFOLIO SYSTEM' },
      { name: 'JNTUK SMART CALC', desc: 'CALCULATOR / STUDENT PROJECT' },
    ],
    metadata: {
      identity: 'BHARATH TOMMANDRU',
      role: 'AI ENGINEER',
      status: 'ACTIVE',
      system: 'HUSH AI ARCHITECT',
    },
    links: [
      { label: 'GITHUB', url: 'https://github.com/bharath-dev8668' },
      { label: 'LINKEDIN', url: 'https://www.linkedin.com/in/bharath-thommandru/' },
      { label: 'PORTFOLIO', url: 'https://bharaththommandru.vercel.app/' },
    ],
  },
];

function getProfileOffsets(p: ProfileData) {
  const o1 = p.nameFirst.length;
  const o2 = o1 + p.nameLast.length;
  const o3 = o2 + p.role.length;
  const o4 = o3 + 1; // status line step
  const o5 = o4 + p.subtag.length;
  const o6 = o5 + p.bio.length;
  const o7 = o6 + 1; // systems block step
  const o8 = o7 + 1; // education block step
  const o9 = o8 + 1; // links block step

  return { o1, o2, o3, o4, o5, o6, o7, o8, o9, total: o9 };
}

type TypewriterMode = 'TYPING' | 'HOLD' | 'ERASING' | 'PAUSE';

export const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  const [activeProfileIndex, setActiveProfileIndex] = useState(0);
  const [mode, setMode] = useState<TypewriterMode>('TYPING');
  const [typedLength, setTypedLength] = useState(0);

  const activeProfile = PROFILES[activeProfileIndex];
  const offsets = getProfileOffsets(activeProfile);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate('/');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Timestamp-based Animation Engine: 2.5s Type -> 7s Hold -> 2.0s Erase -> Loop
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setMode('HOLD');
      setTypedLength(offsets.total);
      timerRef.current = setTimeout(() => {
        setActiveProfileIndex((prev) => (prev + 1) % PROFILES.length);
      }, 7000);

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    if (mode === 'TYPING') {
      const startTime = performance.now();
      const totalChars = offsets.total;

      const tick = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / 2500, 1);
        const chars = Math.floor(progress * totalChars);

        setTypedLength(chars);

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(tick);
        } else {
          setTypedLength(totalChars);
          setMode('HOLD');
        }
      };

      animFrameRef.current = requestAnimationFrame(tick);
    } else if (mode === 'HOLD') {
      // Hold complete profile fully visible for 7 seconds
      timerRef.current = setTimeout(() => {
        setMode('ERASING');
      }, 7000);
    } else if (mode === 'ERASING') {
      const startTime = performance.now();
      const totalChars = offsets.total;

      const tick = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / 2000, 1);
        const chars = Math.floor((1 - progress) * totalChars);

        setTypedLength(chars);

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(tick);
        } else {
          setTypedLength(0);
          setMode('PAUSE');
        }
      };

      animFrameRef.current = requestAnimationFrame(tick);
    } else if (mode === 'PAUSE') {
      // Immediate 50ms buffer before starting next profile
      timerRef.current = setTimeout(() => {
        setActiveProfileIndex((prev) => (prev + 1) % PROFILES.length);
        setTypedLength(0);
        setMode('TYPING');
      }, 50);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [mode, activeProfileIndex, offsets.total]);

  // Derived character slices and active cursor positions
  const isTypingOrErasing = mode === 'TYPING' || mode === 'ERASING';

  // 1. Name First
  const nameFirstText =
    typedLength <= offsets.o1
      ? activeProfile.nameFirst.slice(0, typedLength)
      : activeProfile.nameFirst;
  const nameFirstCursor = isTypingOrErasing && typedLength <= offsets.o1 && typedLength > 0;

  // 2. Name Last
  const nameLastText =
    typedLength <= offsets.o1
      ? ''
      : typedLength <= offsets.o2
      ? activeProfile.nameLast.slice(0, typedLength - offsets.o1)
      : activeProfile.nameLast;
  const nameLastCursor = isTypingOrErasing && typedLength > offsets.o1 && typedLength <= offsets.o2;

  // 3. Role
  const roleText =
    typedLength <= offsets.o2
      ? ''
      : typedLength <= offsets.o3
      ? activeProfile.role.slice(0, typedLength - offsets.o2)
      : activeProfile.role;
  const roleCursor = isTypingOrErasing && typedLength > offsets.o2 && typedLength <= offsets.o3;

  // 4. Status Line
  const isStatusVisible = typedLength >= offsets.o4;

  // 5. Subtag
  const subtagText =
    typedLength <= offsets.o4
      ? ''
      : typedLength <= offsets.o5
      ? activeProfile.subtag.slice(0, typedLength - offsets.o4)
      : activeProfile.subtag;
  const subtagCursor = isTypingOrErasing && typedLength > offsets.o4 && typedLength <= offsets.o5;

  // 6. Bio
  const bioText =
    typedLength <= offsets.o5
      ? ''
      : typedLength <= offsets.o6
      ? activeProfile.bio.slice(0, typedLength - offsets.o5)
      : activeProfile.bio;
  const bioCursor = isTypingOrErasing && typedLength > offsets.o5 && typedLength <= offsets.o6;

  // 7. Current Systems
  const isSystemsVisible = typedLength >= offsets.o7;

  // 8. Education
  const isEducationVisible = typedLength >= offsets.o8;

  // 9. Links
  const isLinksVisible = typedLength >= offsets.o9;

  return (
    <div className="page page-enter">
      <Header />

      <main className="page-center page-center--about">
        <div className="about-layout animate-fadeIn">
          {/* LEFT SIDE: DIGITAL ART VIEWPORT (PRESERVED) */}
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

          {/* RIGHT SIDE: ANIMATED DEVELOPER PROFILE CONTAINER */}
          <div className="profile-viewport">
            <div className="terminal-panel profile-panel">
              <div className="panel-corner corner-tl" />
              <div className="panel-corner corner-tr" />
              <div className="panel-corner corner-bl" />
              <div className="panel-corner corner-br" />

              {/* Profile Header Label - PERMANENT STATIC HEADER */}
              <div className="profile-header">
                <span className="profile-tag">[ DEVELOPER PROFILE ]</span>
              </div>

              {/* Dynamic Content Area - Authentic Character-by-Character Typewriter */}
              <div className="profile-content-area">
                {/* Developer Name */}
                <h1 className="dev-name">
                  {nameFirstText}
                  {nameFirstCursor && <span className="type-cursor">▌</span>}
                  <br />
                  <span className="dev-name-last">
                    {nameLastText}
                    {nameLastCursor && <span className="type-cursor">▌</span>}
                  </span>
                </h1>

                {/* Developer Role & Status Line */}
                <div className="dev-role">
                  <span className="role-title">
                    {roleText}
                    {roleCursor && <span className="type-cursor">▌</span>}
                  </span>
                  <div className={`profile-status-line font-mono ${isStatusVisible ? 'profile-step-visible' : 'profile-step-hidden'}`}>
                    <span className="status-dot-blink" />
                    <span className="status-text">PROFILE ACTIVE</span>
                    <span className="status-sep">•</span>
                    <span className="status-text">SYSTEM ONLINE</span>
                  </div>
                </div>

                <div className="profile-divider" />

                {/* About Text Section */}
                <div className="profile-section">
                  <span className="profile-subtag">
                    {subtagText}
                    {subtagCursor && <span className="type-cursor">▌</span>}
                  </span>
                  <p className="profile-bio font-mono">
                    {bioText}
                    {bioCursor && <span className="type-cursor">▌</span>}
                    {mode === 'HOLD' && <span className="type-cursor-idle">_</span>}
                  </p>

                  {/* Current Systems Block */}
                  <div className={`current-systems font-mono ${isSystemsVisible ? 'profile-step-visible' : 'profile-step-hidden'}`}>
                    <div className="systems-label">CURRENT SYSTEMS</div>
                    {activeProfile.systems.map((sys) => (
                      <div key={sys.name} className="system-item">
                        <span className="sys-name">{sys.name}</span>
                        <span className="sys-desc">{sys.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="profile-divider" />

                {/* Education Block (SHARED - STATIC FOR BOTH PROFILES) */}
                <div className={`profile-block ${isEducationVisible ? 'profile-step-visible' : 'profile-step-hidden'}`}>
                  <div className="profile-block-label">EDUCATION</div>
                  <div className="edu-status">STUDENT</div>
                  <div className="edu-institution font-mono">
                    Sai Tirumala NVR Engineering College
                  </div>
                </div>

                {/* Technical Metadata Grid */}
                <div className={`profile-meta-grid font-mono ${isEducationVisible ? 'profile-step-visible' : 'profile-step-hidden'}`}>
                  <div className="meta-row">
                    <span className="meta-key">IDENTITY</span>
                    <span className="meta-val">{activeProfile.metadata.identity}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-key">ROLE</span>
                    <span className="meta-val">{activeProfile.metadata.role}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-key">STATUS</span>
                    <span className="meta-val">{activeProfile.metadata.status}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-key">SYSTEM</span>
                    <span className="meta-val">{activeProfile.metadata.system}</span>
                  </div>
                </div>

                {/* HUSH Connection */}
                <div className={`hush-note font-mono ${isEducationVisible ? 'profile-step-visible' : 'profile-step-hidden'}`}>
                  <p>
                    HUSH is a project built around temporary communication, minimal identity, and disappearing conversations.
                  </p>
                  <p className="note-accent">
                    Built as a full-stack engineering project.
                  </p>
                </div>

                {/* External signals footer / Social Links */}
                <div className={`panel-footer dev-links-footer ${isLinksVisible ? 'profile-step-visible' : 'profile-step-hidden'}`}>
                  <div className="external-signals-label font-mono">EXTERNAL SIGNALS //</div>
                  <div className="dev-links-grid font-mono">
                    {activeProfile.links.map((link) => (
                      <a
                        key={link.label}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="dev-social-link"
                      >
                        <span className="link-bracket">[</span>
                        <span className="link-label">{link.label}</span>
                        <span className="link-bracket">]</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

