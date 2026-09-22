import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/Header';
import {
  fetchAdminStats,
  fetchAdminRooms,
  fetchAdminHealth,
  adminLogout
} from '../../services/adminApi';
import type {
  AdminStats,
  AdminRoom,
  AdminHealth
} from '../../services/adminApi';
import './AdminDashboardPage.css';

type SortField = 'roomCode' | 'type' | 'participantCount' | 'createdAt' | 'remainingSeconds';
type SortOrder = 'asc' | 'desc';
type TypeFilter = 'ALL' | 'DIRECT' | 'GROUP';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [health, setHealth] = useState<AdminHealth | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedRoom, setSelectedRoom] = useState<AdminRoom | null>(null);
  const [serverClock, setServerClock] = useState<string>('');

  const loadDashboardData = useCallback(async () => {
    try {
      const [statsData, roomsData, healthData] = await Promise.all([
        fetchAdminStats(),
        fetchAdminRooms(),
        fetchAdminHealth()
      ]);

      setStats(statsData);
      setRooms(roomsData);
      setHealth(healthData);
      setError(null);

      if (statsData.serverTime) {
        const date = new Date(statsData.serverTime);
        setServerClock(date.toUTCString().replace('GMT', 'UTC'));
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        navigate('/admin/login', { replace: true });
        return;
      }
      setError('SYNC ERROR WITH BACKEND METRICS');
    }
  }, [navigate]);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 3000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  const handleLogout = async () => {
    try {
      await adminLogout();
    } finally {
      navigate('/admin/login', { replace: true });
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredRooms = rooms.filter(r => {
    if (typeFilter === 'DIRECT') return r.type === 'DIRECT';
    if (typeFilter === 'GROUP') return r.type === 'GROUP';
    return true;
  });

  const sortedRooms = [...filteredRooms].sort((a, b) => {
    let aVal: string | number = a[sortField];
    let bVal: string | number = b[sortField];

    if (sortField === 'createdAt') {
      aVal = new Date(a.createdAt).getTime();
      bVal = new Date(b.createdAt).getTime();
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const formatRemainingTime = (seconds: number) => {
    if (seconds <= 0) return 'EXPIRED';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getTimerClass = (seconds: number) => {
    if (seconds <= 120) return 'timer-critical';
    if (seconds <= 600) return 'timer-warning';
    return 'timer-normal';
  };

  const formatUptime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hrs}h ${mins}m ${s}s`;
  };

  return (
    <div className="page page-enter admin-dashboard-page">
      <Header />

      <main className="admin-container">
        {/* Top Operational Header */}
        <header className="admin-header-bar sys-panel">
          <div className="admin-header-main">
            <div className="admin-title-wrap">
              <span className="admin-tag font-crt">CONTROL CONSOLE</span>
              <h1 className="admin-main-title font-display">HUSH // ADMIN CONTROL</h1>
            </div>
            
            <div className="admin-status-indicators font-crt">
              <span className="status-badge active">● ADMIN: ONLINE</span>
              <span className="status-badge active">● SERVER: ONLINE</span>
              {serverClock && <span className="server-clock">◷ {serverClock}</span>}
            </div>
          </div>

          <button onClick={handleLogout} className="admin-logout-btn font-crt">
            [ LOGOUT ]
          </button>
        </header>

        {error && (
          <div className="terminal-alert admin-error-banner font-crt">
            <span className="alert-icon">!</span> {error}
          </div>
        )}

        {/* Live Statistics Cards Grid */}
        <section className="admin-stats-grid">
          <div className="stat-card sys-panel">
            <span className="stat-label font-crt">ACTIVE CONNECTIONS</span>
            <span className="stat-value font-mono">{stats?.activeConnections ?? 0}</span>
            <span className="stat-sub font-crt">LIVE USERS</span>
          </div>

          <div className="stat-card sys-panel">
            <span className="stat-label font-crt">ACTIVE ROOMS</span>
            <span className="stat-value font-mono">{stats?.activeRooms ?? 0}</span>
            <span className="stat-sub font-crt">CHANNELS IN MEMORY</span>
          </div>

          <div className="stat-card sys-panel">
            <span className="stat-label font-crt">DIRECT CHATS</span>
            <span className="stat-value font-mono">{stats?.directChats ?? 0}</span>
            <span className="stat-sub font-crt">1-TO-1 PEER ROOMS</span>
          </div>

          <div className="stat-card sys-panel">
            <span className="stat-label font-crt">GROUP ROOMS</span>
            <span className="stat-value font-mono">{stats?.groupRooms ?? 0}</span>
            <span className="stat-sub font-crt">MULTI-USER ROOMS</span>
          </div>

          <div className="stat-card sys-panel">
            <span className="stat-label font-crt">TOTAL PARTICIPANTS</span>
            <span className="stat-value font-mono">{stats?.totalParticipants ?? 0}</span>
            <span className="stat-sub font-crt">CONNECTED PEERS</span>
          </div>

          <div className="stat-card sys-panel stat-card--expiring">
            <span className="stat-label font-crt">EXPIRING SOON</span>
            <span className="stat-value font-mono alert">{stats?.expiringSoonCount ?? 0}</span>
            <span className="stat-sub font-crt">&lt; 10 MIN REMAINING</span>
          </div>
        </section>

        {/* Active Rooms Table Section */}
        <section className="admin-section sys-panel">
          <div className="section-header">
            <div className="section-title-wrap font-crt">
              <span className="section-title">ACTIVE ROOMS MONITOR</span>
              <span className="section-count">({filteredRooms.length} ACTIVE)</span>
            </div>

            <div className="filter-controls font-crt">
              <span className="filter-label">FILTER:</span>
              {(['ALL', 'DIRECT', 'GROUP'] as TypeFilter[]).map(f => (
                <button
                  key={f}
                  className={`filter-btn ${typeFilter === f ? 'active' : ''}`}
                  onClick={() => setTypeFilter(f)}
                >
                  [{f}]
                </button>
              ))}
            </div>
          </div>

          <div className="table-responsive">
            <table className="admin-table font-mono">
              <thead>
                <tr>
                  <th onClick={() => handleSort('roomCode')} className="sortable">
                    ROOM ID {sortField === 'roomCode' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('type')} className="sortable">
                    TYPE {sortField === 'type' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('participantCount')} className="sortable">
                    USERS {sortField === 'participantCount' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th>CAPACITY</th>
                  <th onClick={() => handleSort('createdAt')} className="sortable">
                    CREATED {sortField === 'createdAt' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('remainingSeconds')} className="sortable">
                    EXPIRES IN {sortField === 'remainingSeconds' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {sortedRooms.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-table font-crt">
                      NO ACTIVE ROOMS MATCHING CRITERIA
                    </td>
                  </tr>
                ) : (
                  sortedRooms.map(room => (
                    <tr
                      key={room.roomCode}
                      onClick={() => setSelectedRoom(room)}
                      className={`room-row ${selectedRoom?.roomCode === room.roomCode ? 'selected' : ''}`}
                    >
                      <td className="room-code-cell">{room.roomCode}</td>
                      <td>
                        <span className={`type-badge ${room.type.toLowerCase()}`}>
                          {room.type}
                        </span>
                      </td>
                      <td>{room.participantCount} / {room.maxParticipants}</td>
                      <td>{room.maxParticipants}</td>
                      <td>{new Date(room.createdAt).toLocaleTimeString()}</td>
                      <td className={getTimerClass(room.remainingSeconds)}>
                        ◷ {formatRemainingTime(room.remainingSeconds)}
                      </td>
                      <td>
                        <span className={`status-pill ${room.status.toLowerCase()}`}>
                          ● {room.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* System Health Panel */}
        <section className="admin-section sys-panel">
          <div className="section-header">
            <span className="section-title font-crt">SYSTEM HEALTH &amp; INFRASTRUCTURE</span>
          </div>

          <div className="health-grid font-mono">
            <div className="health-card">
              <span className="health-label font-crt">BACKEND API</span>
              <span className="health-status active">● {health?.backend ?? 'ONLINE'}</span>
            </div>

            <div className="health-card">
              <span className="health-label font-crt">WEBSOCKET PIPELINE</span>
              <span className="health-status active">● {health?.websocket ?? 'ONLINE'}</span>
            </div>

            <div className="health-card">
              <span className="health-label font-crt">ROOM ENGINE</span>
              <span className="health-status active">● {health?.roomService ?? 'ONLINE'}</span>
            </div>

            <div className="health-card">
              <span className="health-label font-crt">AUTH GATEWAY</span>
              <span className="health-status active">● {health?.authService ?? 'ONLINE'}</span>
            </div>
          </div>

          <div className="health-metrics-row font-mono">
            <div className="metric-box">
              <span className="metric-title font-crt">JVM MEMORY USAGE</span>
              <div className="memory-bar">
                <div
                  className="memory-fill"
                  style={{
                    width: `${Math.min(100, Math.round(((health?.jvmMemoryUsedMb ?? 0) / (health?.jvmMemoryMaxMb || 1)) * 100))}%`
                  }}
                />
              </div>
              <span className="metric-detail">
                {health?.jvmMemoryUsedMb ?? 0} MB / {health?.jvmMemoryMaxMb ?? 0} MB
              </span>
            </div>

            <div className="metric-box">
              <span className="metric-title font-crt">SYSTEM UPTIME</span>
              <span className="metric-val">{formatUptime(health?.uptimeSeconds ?? 0)}</span>
            </div>
          </div>
        </section>
      </main>

      {/* Selected Room Operational Details Modal/Drawer */}
      {selectedRoom && (
        <div className="room-modal-overlay" onClick={() => setSelectedRoom(null)}>
          <div className="room-modal-card sys-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="font-crt modal-title">ROOM OPERATIONAL METADATA</span>
              <button onClick={() => setSelectedRoom(null)} className="modal-close font-crt">
                [ × CLOSE ]
              </button>
            </div>

            <div className="modal-body font-mono">
              <div className="meta-row">
                <span className="meta-label">ROOM ID:</span>
                <span className="meta-val code">{selectedRoom.roomCode}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">CHANNEL TYPE:</span>
                <span className="meta-val">{selectedRoom.type}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">PARTICIPANTS:</span>
                <span className="meta-val">{selectedRoom.participantCount} / {selectedRoom.maxParticipants}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">CREATED AT:</span>
                <span className="meta-val">{new Date(selectedRoom.createdAt).toLocaleString()}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">EXPIRES AT:</span>
                <span className="meta-val">{new Date(selectedRoom.expiresAt).toLocaleString()}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">REMAINING TIME:</span>
                <span className={`meta-val ${getTimerClass(selectedRoom.remainingSeconds)}`}>
                  {formatRemainingTime(selectedRoom.remainingSeconds)}
                </span>
              </div>
              <div className="meta-row">
                <span className="meta-label">ROOM STATUS:</span>
                <span className="meta-val status">● {selectedRoom.status}</span>
              </div>

              <div className="modal-sub-section">
                <span className="sub-title font-crt">SESSION PEERS ({selectedRoom.participants?.length ?? 0})</span>
                <div className="peers-list">
                  {selectedRoom.participants?.map((p, idx) => (
                    <div key={p.participantId || idx} className="peer-item">
                      <span className="peer-role">{p.isHost ? '[ HOST ]' : '[ PEER ]'}</span>
                      <span className="peer-id">{p.participantId.substring(0, 8)}...</span>
                      <span className="peer-time">{new Date(p.joinedAt).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="privacy-notice font-crt">
                🔒 ZERO-LOG MEMORY: MESSAGE CONTENTS ARE NEVER STORED OR ACCESSIBLE.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
