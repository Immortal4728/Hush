import React, { useState } from 'react';
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
      setError('Please enter a username.');
      return;
    }
    if (roomCode.length !== 6) {
      setError('Room code must be exactly 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getRoom(roomCode);
      if (!data.exists) {
        setError('Room not found or has expired.');
        return;
      }
      if (data.participantCount >= data.maxParticipants) {
        setError('This room is full.');
        return;
      }
      navigate(`/room/${roomCode}`, {
        state: { username: trimmedName },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setError('Room not found or has expired.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Could not connect to server.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <Header />

      <main className="page-center">
        <div className="container">
          <div className="card animate-fadeIn">
            <div className="join-header">
              <h1 className="join-title">Join a room</h1>
              <p className="join-desc">Enter the 6-character room code.</p>
            </div>

            {error && <div className="alert-error" role="alert">{error}</div>}

            <form onSubmit={handleJoin} className="join-form">
              <div className="field">
                <label htmlFor="join-code" className="label">Room code</label>
                <input
                  id="join-code"
                  type="text"
                  className="input input-code font-mono"
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
                <label htmlFor="join-username" className="label">Your name</label>
                <input
                  id="join-username"
                  type="text"
                  className="input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Alex"
                  maxLength={32}
                  required
                  autoComplete="off"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !username.trim() || roomCode.length !== 6}
                className="btn btn-primary join-submit"
              >
                {loading ? 'Checking…' : 'Join room'}
              </button>
            </form>

            <p className="join-footer">
              Don't have a room? <Link to="/create" className="join-link">Create one</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
