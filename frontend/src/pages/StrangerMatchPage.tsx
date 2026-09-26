import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { RetroButton } from '../components/retro/RetroButton';
import {
  requestStrangerMatch,
  cancelStrangerMatch,
  getStrangerMatchStatus
} from '../services/strangerApi';
import type { StrangerMatchResponse } from '../services/strangerApi';
import './StrangerMatchPage.css';

export const StrangerMatchPage: React.FC = () => {
  const navigate = useNavigate();
  const [matchState, setMatchState] = useState<'IDLE' | 'SEARCHING' | 'MATCHED' | 'CANCELLED' | 'EXPIRED' | 'ERROR'>('SEARCHING');
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [lookingCount, setLookingCount] = useState<number>(1);
  const [matchedRoom, setMatchedRoom] = useState<{ roomCode: string; username: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isCancelledRef = useRef<boolean>(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startMatchmaking = async () => {
    try {
      isCancelledRef.current = false;
      setMatchState('SEARCHING');
      setErrorMsg(null);
      setMatchedRoom(null);

      const res: StrangerMatchResponse = await requestStrangerMatch();
      setTicketId(res.ticketId);
      setLookingCount(res.lookingCount);

      if (res.status === 'MATCHED' && res.roomCode && res.username) {
        handleMatched(res.roomCode, res.username);
      } else {
        startPolling(res.ticketId);
      }
    } catch (err: any) {
      if (!isCancelledRef.current) {
        setMatchState('ERROR');
        setErrorMsg(err.message || 'Failed to start matchmaking');
      }
    }
  };

  const startPolling = (tid: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      if (isCancelledRef.current) return;
      try {
        const res = await getStrangerMatchStatus(tid);
        setLookingCount(res.lookingCount);

        if (res.status === 'MATCHED' && res.roomCode && res.username) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          handleMatched(res.roomCode, res.username);
        } else if (res.status === 'EXPIRED') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setMatchState('EXPIRED');
        } else if (res.status === 'CANCELLED') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setMatchState('CANCELLED');
        }
      } catch (err) {
        // Continue polling on soft network glitch
      }
    }, 1200);
  };

  const handleMatched = (roomCode: string, username: string) => {
    setMatchState('MATCHED');
    setMatchedRoom({ roomCode, username });
    sessionStorage.setItem(`hush_origin_${roomCode}`, 'STRANGER');
    setTimeout(() => {
      if (!isCancelledRef.current) {
        navigate(`/room/${roomCode}`, {
          state: { username, isStranger: true }
        });
      }
    }, 1200);
  };

  const handleCancel = async () => {
    isCancelledRef.current = true;
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (ticketId && matchState === 'SEARCHING') {
      try {
        await cancelStrangerMatch(ticketId);
      } catch (e) {}
    }
    setMatchState('CANCELLED');
    navigate('/');
  };

  useEffect(() => {
    startMatchmaking();

    return () => {
      isCancelledRef.current = true;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  return (
    <div className="page page-enter hush-vhs">
      <Header />

      <main className="stranger-page">
        <div className="stranger-container font-mono">
          <div className="stranger-card">
            <div className="stranger-card-header">
              <h1 className="stranger-title hush-display">HUSH // STRANGER MATCH</h1>
              <span className="stranger-sub">ANONYMOUS TEMPORARY 1-ON-1 MATCHMAKING</span>
            </div>

            <div className="stranger-card-body">
              {matchState === 'SEARCHING' && (
                <div className="match-status-box searching">
                  <div className="radar-spinner" aria-hidden="true">
                    <div className="radar-sweep" />
                  </div>
                  <div className="status-text-group">
                    <span className="status-label">STATUS: SEARCHING</span>
                    <p className="status-desc">Scanning available anonymous connections...</p>
                    <div className="queue-stat">
                      <span className="queue-dot" />
                      ANONYMOUS USERS LOOKING: <strong className="queue-val">{lookingCount}</strong>
                    </div>
                  </div>
                  <div className="action-row">
                    <button
                      onClick={handleCancel}
                      className="terminal-exit-btn font-mono"
                      type="button"
                    >
                      [ CANCEL ]
                    </button>
                  </div>
                </div>
              )}

              {matchState === 'MATCHED' && matchedRoom && (
                <div className="match-status-box matched">
                  <div className="match-icon">⚡</div>
                  <div className="status-text-group">
                    <span className="status-label matched-label">HUSH // MATCH FOUND</span>
                    <p className="status-desc">
                      Anonymous connection established with <strong>{matchedRoom.username}</strong>.
                    </p>
                    <p className="status-sub">Entering temporary direct room {matchedRoom.roomCode}...</p>
                  </div>
                </div>
              )}

              {matchState === 'EXPIRED' && (
                <div className="match-status-box expired">
                  <span className="status-label">MATCHMAKING TIMEOUT</span>
                  <p className="status-desc">No active peers found in time. Please try searching again.</p>
                  <div className="action-row">
                    <RetroButton onClick={startMatchmaking}>
                      Try Again
                    </RetroButton>
                    <RetroButton to="/">
                      Home
                    </RetroButton>
                  </div>
                </div>
              )}

              {matchState === 'ERROR' && (
                <div className="match-status-box error">
                  <span className="status-label">MATCHMAKING ERROR</span>
                  <p className="status-desc">{errorMsg || 'An error occurred during matchmaking.'}</p>
                  <div className="action-row">
                    <RetroButton onClick={startMatchmaking}>
                      Retry
                    </RetroButton>
                    <RetroButton to="/">
                      Home
                    </RetroButton>
                  </div>
                </div>
              )}

              {matchState === 'CANCELLED' && (
                <div className="match-status-box cancelled">
                  <span className="status-label">CANCELLED</span>
                  <p className="status-desc">Matchmaking was cancelled.</p>
                  <div className="action-row">
                    <RetroButton to="/">
                      Home
                    </RetroButton>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
