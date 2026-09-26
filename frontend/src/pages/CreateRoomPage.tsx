import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { createRoom, ApiError } from '../services/roomApi';
import type { RoomType, CreateRoomResponse } from '../types';
import './CreateRoomPage.css';

export const CreateRoomPage: React.FC = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [roomType, setRoomType] = useState<RoomType>('DIRECT');
  const [ttlMinutes, setTtlMinutes] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRoom, setCreatedRoom] = useState<CreateRoomResponse | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate('/');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setError('USERNAME REQUIRED');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await createRoom({ type: roomType, ttlMinutes });
      setCreatedRoom(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message.toUpperCase());
      } else {
        setError('COULD NOT CONNECT TO SERVER');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!createdRoom) return;
    try {
      await navigator.clipboard.writeText(createdRoom.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  const enterRoom = () => {
    if (createdRoom) {
      sessionStorage.setItem(`hush_origin_${createdRoom.roomCode}`, 'MANUAL');
      navigate(`/room/${createdRoom.roomCode}`, {
        state: { username: username.trim(), isStranger: false },
      });
    }
  };

  return (
    <div className="page page-enter">
      <Header />

      <main className="page-center">
        <div className="terminal-panel animate-fadeIn">
          <div className="panel-corner corner-tl" />
          <div className="panel-corner corner-tr" />
          <div className="panel-corner corner-bl" />
          <div className="panel-corner corner-br" />

          {!createdRoom ? (
            <>
              <div className="create-header">
                <h1 className="create-title">CREATE A ROOM</h1>
                <p className="create-desc">
                  No account required. Channel expires automatically.
                </p>
              </div>

              {error && (
                <div className="terminal-alert" role="alert">
                  <span className="alert-icon">!</span> {error}
                </div>
              )}

              <form onSubmit={handleCreate} className="create-form">
                <div className="field">
                  <label htmlFor="username" className="terminal-label">
                    USERNAME
                  </label>
                  <input
                    id="username"
                    type="text"
                    className="terminal-input"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError(null);
                    }}
                    placeholder="e.g. Immortal"
                    maxLength={32}
                    required
                    autoComplete="off"
                  />
                </div>

                <div className="field">
                  <label className="terminal-label">ROOM TYPE</label>
                  <div className="option-grid option-grid--2">
                    <button
                      type="button"
                      className={`option-card ${roomType === 'DIRECT' ? 'selected' : ''}`}
                      onClick={() => setRoomType('DIRECT')}
                      aria-pressed={roomType === 'DIRECT'}
                    >
                      <span className="option-title">DIRECT</span>
                      <span className="option-subtitle">2 PARTICIPANTS</span>
                    </button>
                    <button
                      type="button"
                      className={`option-card ${roomType === 'GROUP' ? 'selected' : ''}`}
                      onClick={() => setRoomType('GROUP')}
                      aria-pressed={roomType === 'GROUP'}
                    >
                      <span className="option-title">GROUP</span>
                      <span className="option-subtitle">UP TO 20</span>
                    </button>
                  </div>
                </div>

                <div className="field">
                  <label className="terminal-label">DURATION</label>
                  <div className="option-grid option-grid--3">
                    {[
                      { label: '30 MIN', sub: 'HALF HOUR', val: 30 },
                      { label: '1 HOUR', sub: 'STANDARD', val: 60 },
                      { label: '3 HOURS', sub: 'EXTENDED', val: 180 },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        className={`option-card ${ttlMinutes === item.val ? 'selected' : ''}`}
                        onClick={() => setTtlMinutes(item.val)}
                        aria-pressed={ttlMinutes === item.val}
                      >
                        <span className="option-title">{item.label}</span>
                        <span className="option-subtitle">{item.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !username.trim()}
                  className="terminal-submit-btn"
                >
                  <span className="btn-bracket">[</span>
                  <span className="btn-text">
                    {loading ? 'INITIALIZING CHANNEL...' : 'CREATE ROOM'}
                  </span>
                  <span className="btn-bracket">]</span>
                </button>
              </form>
            </>
          ) : (
            <div className="success-view animate-slideUp">
              <div className="create-header">
                <h2 className="create-title">CHANNEL READY</h2>
                <p className="create-desc">Share this code with your peer.</p>
              </div>

              <div className="code-display">
                <span className="code-label font-mono">ROOM CODE</span>
                <span className="code-value font-mono">{createdRoom.roomCode}</span>
              </div>

              <div className="success-actions">
                <button onClick={copyCode} type="button" className="terminal-btn-sec">
                  {copied ? '✓ COPIED' : 'COPY CODE'}
                </button>
                <button onClick={enterRoom} type="button" className="terminal-submit-btn">
                  <span className="btn-bracket">[</span>
                  <span className="btn-text">ENTER ROOM →</span>
                  <span className="btn-bracket">]</span>
                </button>
              </div>
            </div>
          )}

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

