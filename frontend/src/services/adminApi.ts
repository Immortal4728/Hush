export interface AdminStats {
  activeConnections: number;
  activeRooms: number;
  directChats: number;
  groupRooms: number;
  totalParticipants: number;
  expiringSoonCount: number;
  serverTime: string;
}

export interface AdminParticipantMeta {
  participantId: string;
  isHost: boolean;
  joinedAt: string;
}

export interface AdminRoom {
  roomCode: string;
  type: 'DIRECT' | 'GROUP';
  participantCount: number;
  maxParticipants: number;
  createdAt: string;
  expiresAt: string;
  remainingSeconds: number;
  status: string;
  expiringSoon: boolean;
  participants: AdminParticipantMeta[];
}

export interface AdminHealth {
  backend: string;
  websocket: string;
  roomService: string;
  authService: string;
  jvmMemoryUsedMb: number;
  jvmMemoryMaxMb: number;
  activeRooms: number;
  activeConnections: number;
  uptimeSeconds: number;
}

const API_BASE = '/api/admin';

function getAdminToken(): string | null {
  return sessionStorage.getItem('hush_admin_token');
}

export function setAdminToken(token: string) {
  sessionStorage.setItem('hush_admin_token', token);
}

export function clearAdminToken() {
  sessionStorage.removeItem('hush_admin_token');
}

export function isAdminAuthenticated(): boolean {
  return !!getAdminToken();
}

async function adminFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['X-Admin-Token'] = token;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include', // Includes HttpOnly session cookie
    headers,
  });

  if (response.status === 401) {
    clearAdminToken();
    throw new Error('UNAUTHORIZED');
  }

  if (response.status === 429) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'TOO MANY FAILED ATTEMPTS. TRY AGAIN LATER.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `HTTP error ${response.status}`);
  }

  if (response.status === 204) return {} as T;
  return response.json();
}

export async function adminLogin(username: string, password: string): Promise<{ token: string; username: string }> {
  const res = await adminFetch<{ token: string; username: string }>('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  if (res.token) {
    setAdminToken(res.token);
  }
  return res;
}

export async function adminLogout(): Promise<void> {
  try {
    await adminFetch<void>('/logout', { method: 'POST' });
  } finally {
    clearAdminToken();
  }
}

export async function fetchAdminStats(): Promise<AdminStats> {
  return adminFetch<AdminStats>('/stats');
}

export async function fetchAdminRooms(): Promise<AdminRoom[]> {
  return adminFetch<AdminRoom[]>('/rooms');
}

export async function fetchAdminRoomDetails(roomId: string): Promise<AdminRoom> {
  return adminFetch<AdminRoom>(`/rooms/${roomId}`);
}

export async function fetchAdminHealth(): Promise<AdminHealth> {
  return adminFetch<AdminHealth>('/health');
}
