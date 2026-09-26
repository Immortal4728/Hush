import { getApiBaseUrl } from '../config/env';

export interface StrangerMatchResponse {
  ticketId: string;
  status: 'WAITING' | 'MATCHED' | 'CANCELLED' | 'EXPIRED';
  roomCode?: string;
  username?: string;
  lookingCount: number;
}

export async function requestStrangerMatch(): Promise<StrangerMatchResponse> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/stranger/match`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Matchmaking failed (${res.status}): ${text}`);
  }

  return res.json();
}

export async function cancelStrangerMatch(ticketId: string): Promise<void> {
  const baseUrl = getApiBaseUrl();
  await fetch(`${baseUrl}/api/stranger/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ticketId })
  });
}

export async function getStrangerMatchStatus(ticketId: string): Promise<StrangerMatchResponse> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/stranger/status?ticketId=${encodeURIComponent(ticketId)}`);

  if (!res.ok) {
    throw new Error(`Failed to fetch status (${res.status})`);
  }

  return res.json();
}
