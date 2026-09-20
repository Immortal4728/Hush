import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setError('Please enter a username.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await createRoom({ type: roomType, ttlMinutes });
      setCreatedRoom(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Could not connect to server.');
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
      // Clipboard API might not be available
    }
  };

  const enterRoom = () => {
    if (createdRoom) {
      navigate(`/room/${createdRoom.roomCode}`, {
        state: { username: username.trim() },
      });
    }
  };

  return (
    <div className="page">
      <Header />

      <main className="page-center">
        <div className="container">
          <div className="card animate-fadeIn">
            {!createdRoom ? (
              <>
                <div className="create-header">
                  <h1 className="create-title">Create a room</h1>
                  <p className="create-desc">No account required. Room expires automatically.</p>
                </div>

                {error && <div className="alert-error" role="alert">{error}</div>}

                <form onSubmit={handleCreate} className="create-form">
                  <div className="field">
                    <label htmlFor="username" className="label">Username</label>
                    <input
                      id="username"
                      type="text"
                      className="input"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. Conan"
                      maxLength={32}
                      required
                      autoComplete="off"
                    />
                  </div>

                  <div className="field">
                    <label className="label">Room type</label>
                    <div className="pill-group">
                      <button
                        type="button"
                        className={`pill ${roomType === 'DIRECT' ? 'active' : ''}`}
                        onClick={() => setRoomType('DIRECT')}
                        aria-pressed={roomType === 'DIRECT'}
                      >
                        Direct (2)
                      </button>
                      <button
                        type="button"
                        className={`pill ${roomType === 'GROUP' ? 'active' : ''}`}
                        onClick={() => setRoomType('GROUP')}
                        aria-pressed={roomType === 'GROUP'}
                      >
                        Group (20)
                      </button>
                    </div>
                  </div>

                  <div className="field">
                    <label className="label">Duration</label>
                    <div className="pill-group">
                      {[
                        { label: '30 min', val: 30 },
                        { label: '1 hour', val: 60 },
                        { label: '3 hours', val: 180 },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          className={`pill ${ttlMinutes === item.val ? 'active' : ''}`}
                          onClick={() => setTtlMinutes(item.val)}
                          aria-pressed={ttlMinutes === item.val}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !username.trim()}
                    className="btn btn-primary create-submit"
                  >
                    {loading ? 'Creating…' : 'Create room'}
                  </button>
                </form>
              </>
            ) : (
              <div className="success-view animate-slideUp">
                <h2 className="success-title">Your room is ready</h2>

                <div className="code-display">
                  <span className="code-label font-mono">Room Code</span>
                  <span className="code-value font-mono">{createdRoom.roomCode}</span>
                </div>

                <p className="success-hint">
                  Share this code with the person you want to talk to.
                </p>

                <div className="success-actions">
                  <button onClick={copyCode} className="btn btn-secondary" style={{ flex: 1 }}>
                    {copied ? '✓ Copied' : 'Copy code'}
                  </button>
                  <button onClick={enterRoom} className="btn btn-primary" style={{ flex: 1 }}>
                    Enter room →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
