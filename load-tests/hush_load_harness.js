/**
 * HUSH WebSocket Load Testing Engine & Scenario Runner
 * 
 * Supports:
 * - Persistent concurrent WebSocket client connections
 * - Room creation via REST API (Direct & Group)
 * - JSON WebSocket protocol flow (JOIN, JOINED, MESSAGE, TYPING, LEAVE, ERROR)
 * - High-resolution message broadcast latency measurement (Min, Avg, P95, P99)
 * - Metrics collection via GET /api/admin/metrics
 * - Flexible user distribution (Direct, Small Group, Large Group, Single Massive Room)
 * - Reconnection testing and Room Expiration under load
 */

const BASE_URL = process.env.HUSH_BASE_URL || 'http://localhost:8088';
const WS_URL = process.env.HUSH_WS_URL || 'ws://localhost:8088/ws/chat';
const ADMIN_USER = process.env.HUSH_ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.HUSH_ADMIN_PASSWORD || 'adminpass';

class AdminClient {
  constructor() {
    this.token = null;
  }

  async login() {
    try {
      const res = await fetch(`${BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS })
      });
      if (res.ok) {
        const data = await res.json();
        this.token = data.token;
        return true;
      }
    } catch (e) {
      console.warn('[ADMIN] Login failed:', e.message);
    }
    return false;
  }

  async getMetrics() {
    if (!this.token) await this.login();
    try {
      const headers = {};
      if (this.token) headers['X-Admin-Token'] = this.token;
      const res = await fetch(`${BASE_URL}/api/admin/metrics`, { headers });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('[ADMIN] Get metrics failed:', e.message);
    }
    return null;
  }
}

async function createRoom(type = 'GROUP', ttlMinutes = 60) {
  const res = await fetch(`${BASE_URL}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, ttlMinutes })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Create room failed (${res.status}): ${text}`);
  }
  return await res.json();
}

class SimulatedUser {
  constructor(id, roomCode, username) {
    this.id = id;
    this.roomCode = roomCode;
    this.username = username || `User_${id}`;
    this.ws = null;
    this.connected = false;
    this.joined = false;
    this.participantId = null;
    this.receivedMessages = [];
    this.errors = [];
    this.sentMessages = new Map(); // msgId -> sendTimeMs
    this.latencies = []; // array of ms
    this.closeCode = null;
    this.closeReason = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(WS_URL);
        
        const timeout = setTimeout(() => {
          if (!this.connected || !this.joined) {
            this.errors.push('Connection/Join timeout');
            reject(new Error(`User ${this.id} connect/join timeout`));
          }
        }, 3000);

        this.ws.onopen = () => {
          this.connected = true;
          // Send JOIN
          this.ws.send(JSON.stringify({
            type: 'JOIN',
            roomCode: this.roomCode,
            username: this.username
          }));
        };

        this.ws.onmessage = (event) => {
          const recvTime = performance.now();
          try {
            const data = JSON.parse(event.data);
            this.receivedMessages.push(data);

            if (data.type === 'JOINED') {
              this.joined = true;
              this.participantId = data.participantId;
              clearTimeout(timeout);
              resolve(this);
            } else if (data.type === 'MESSAGE') {
              if (data.senderId === this.participantId && data.messageId) {
                const sendTime = this.sentMessages.get(data.messageId);
                if (sendTime) {
                  const latency = recvTime - sendTime;
                  this.latencies.push(latency);
                  this.sentMessages.delete(data.messageId);
                }
              }
            } else if (data.type === 'ERROR') {
              this.errors.push(data.message || data.error);
              if (!this.joined) {
                clearTimeout(timeout);
                reject(new Error(`User ${this.id} received ERROR: ${data.message || data.error}`));
              }
            }
          } catch (e) {
            this.errors.push('JSON parse error: ' + e.message);
          }
        };

        this.ws.onerror = (err) => {
          this.errors.push('WS error: ' + (err.message || 'unknown error'));
          if (!this.joined) {
            clearTimeout(timeout);
            reject(err);
          }
        };

        this.ws.onclose = (evt) => {
          this.connected = false;
          this.joined = false;
          this.closeCode = evt.code;
          this.closeReason = evt.reason;
          if (!this.joined) {
            clearTimeout(timeout);
            reject(new Error(`User ${this.id} socket closed before join (${evt.code})`));
          }
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  sendMessage(text) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    const msgId = `msg_${this.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sendTime = performance.now();
    this.sentMessages.set(msgId, sendTime);

    this.ws.send(JSON.stringify({
      type: 'MESSAGE',
      text: text,
      messageId: msgId
    }));
    return true;
  }

  leave() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'LEAVE' }));
      } catch (e) {}
    }
  }

  close() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
    }
  }
}

function calculatePercentiles(arr) {
  if (!arr || arr.length === 0) return { avg: 0, p95: 0, p99: 0, min: 0, max: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sum / sorted.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const p95Idx = Math.floor(sorted.length * 0.95);
  const p99Idx = Math.floor(sorted.length * 0.99);
  return {
    avg: Number(avg.toFixed(2)),
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    p95: Number(sorted[Math.min(p95Idx, sorted.length - 1)].toFixed(2)),
    p99: Number(sorted[Math.min(p99Idx, sorted.length - 1)].toFixed(2))
  };
}

module.exports = {
  AdminClient,
  createRoom,
  SimulatedUser,
  calculatePercentiles,
  BASE_URL,
  WS_URL
};
