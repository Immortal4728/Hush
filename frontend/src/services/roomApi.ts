import type { CreateRoomRequest, CreateRoomResponse, RoomStatusResponse, ErrorResponse } from '../types';
import { getApiBaseUrl } from '../config/env';

const API_BASE = getApiBaseUrl();

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errData: ErrorResponse | null = null;
    try {
      errData = await response.json();
    } catch {
      // Couldn't parse error body
    }
    throw new ApiError(
      response.status,
      errData?.code || 'UNKNOWN_ERROR',
      errData?.message || `Request failed with status ${response.status}`,
    );
  }
  return response.json();
}

export async function createRoom(request: CreateRoomRequest): Promise<CreateRoomResponse> {
  const response = await fetch(`${API_BASE}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return handleResponse<CreateRoomResponse>(response);
}

export async function getRoom(code: string): Promise<RoomStatusResponse> {
  const response = await fetch(`${API_BASE}/rooms/${encodeURIComponent(code.toUpperCase())}`);
  return handleResponse<RoomStatusResponse>(response);
}

export async function checkHealth(): Promise<{ status: string; service: string }> {
  const response = await fetch(`${API_BASE}/health`);
  return handleResponse<{ status: string; service: string }>(response);
}
