import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Header } from '../components/Header';
import { getRoom, ApiError } from '../services/roomApi';
import './JoinRoomPage.css';

const VALID_CHARS = /[2-9A-HJ-NP-Z]/g;

export const JoinRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState(() => (location.state as any)?.roomCode?.toUpperCase() || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate('/');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase();
    const cleaned = (raw.match(VALID_CHARS) || []).join('').slice(0, 6);
    setRoomCode(cleaned);
    setError(null);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = username.trim();

    if (!trimmedName) {
      setError('USERNAME REQUIRED');
      return;
    }
    if (roomCode.length !== 6) {
      setError('ROOM CODE MUST BE EXACTLY 6 CHARACTERS');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getRoom(roomCode);
      if (!data.exists) {
        setError('ROOM NOT FOUND OR HAS EXPIRED');
        return;
      }
      if (data.participantCount >= data.maxParticipants) {
        setError('THIS ROOM IS FULL');
        return;
      }
      sessionStorage.setItem(`hush_origin_${roomCode}`, 'MANUAL');
      navigate(`/room/${roomCode}`, {
        state: { username: trimmedName, isStranger: false },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setError('ROOM NOT FOUND OR HAS EXPIRED');
        } else {
          setError(err.message.toUpperCase());
        }
      } else {
        setError('COULD NOT CONNECT TO SERVER');
      }
    } finally {
      setLoading(false);
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

          <div className="join-header">
            <h1 className="join-title">JOIN A ROOM</h1>
            <p className="join-desc">Enter the 6-character room code to connect.</p>
          </div>

          {error && (
            <div className="terminal-alert" role="alert">
              <span className="alert-icon">!</span> {error}
            </div>
          )}

          <form onSubmit={handleJoin} className="join-form">
            <div className="field">
              <label htmlFor="join-code" className="terminal-label">
                ROOM CODE
              </label>
              <input
                id="join-code"
                type="text"
                className="terminal-input terminal-input-code font-mono"
                value={roomCode}
                onChange={handleCodeChange}
                placeholder="K7M4Q2"
                maxLength={6}
                required
                autoComplete="off"
                aria-label="Room code"
              />
            </div>

            <div className="field">
              <label htmlFor="join-username" className="terminal-label">
                YOUR NAME
              </label>
              <input
                id="join-username"
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

            <button
              type="submit"
              disabled={loading || !username.trim() || roomCode.length !== 6}
              className="terminal-submit-btn join-submit"
            >
              <span className="btn-bracket">[</span>
              <span className="btn-text">
                {loading ? 'CONNECTING...' : 'JOIN ROOM'}
              </span>
              <span className="btn-bracket">]</span>
            </button>
          </form>

          <div className="join-footer-actions">
            <span className="join-footer-text">Don't have a room?</span>
            <Link to="/create" className="terminal-sec-link">
              [ CREATE ONE ]
            </Link>
          </div>

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
