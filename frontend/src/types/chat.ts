/* ── Types matching the Hush backend protocol exactly ── */

export type RoomType = 'DIRECT' | 'GROUP';
export type RoomState = 'ACTIVE' | 'EMPTY' | 'DESTROYED';

/* ── REST DTOs ── */

export interface CreateRoomRequest {
  type: RoomType;
  ttlMinutes: number;
}

export interface CreateRoomResponse {
  roomCode: string;
  type: RoomType;
  maxParticipants: number;
  createdAt: string;
  expiresAt: string;
  state: RoomState;
}

export interface RoomStatusResponse {
  exists?: boolean;
  roomCode: string;
  type: RoomType;
  maxParticipants: number;
  participantCount: number;
  expiresAt: string;
  state: RoomState;
}

export type RoomInfoResponse = RoomStatusResponse;

export interface AnalyticsData {
  activeRooms: number;
  activeParticipants: number;
  totalMessages: number;
  avgRoomDurationSeconds: number;
  pairingRatePercent: number;
  directRoomsCount: number;
  groupRoomsCount: number;
}

export interface ErrorResponse {
  timestamp: string;
  status: number;
  code: string;
  message: string;
}

/* ── WebSocket: Client → Server ── */

export interface WsJoinMessage {
  type: 'JOIN';
  roomCode: string;
  username: string;
}

export interface WsChatMessage {
  type: 'MESSAGE';
  text: string;
}

export interface WsTypingMessage {
  type: 'TYPING';
  typing: boolean;
}

export interface WsLeaveMessage {
  type: 'LEAVE';
}

export type WsClientMessage = WsJoinMessage | WsChatMessage | WsTypingMessage | WsLeaveMessage;

/* ── WebSocket: Server → Client ── */

export interface WsParticipantDto {
  participantId: string;
  username: string;
  host: boolean;
}

export interface WsJoinedEvent {
  type: 'JOINED';
  participantId: string;
  roomCode: string;
  username: string;
  host: boolean;
}

export interface WsMessageEvent {
  type: 'MESSAGE';
  messageId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  sequence?: number;
}

export interface WsTypingEvent {
  type: 'TYPING';
  participantId: string;
  username: string;
  typing: boolean;
}

export interface WsPresenceEvent {
  type: 'PRESENCE';
  participants: WsParticipantDto[];
}

export interface WsSystemEvent {
  type: 'SYSTEM';
  event: string;
  username: string;
}

export interface WsErrorEvent {
  type: 'ERROR';
  code: string;
  message: string;
}

export interface WsRoomExpiringEvent {
  type: 'ROOM_EXPIRING';
  roomCode: string;
  remainingSeconds: number;
  expiresAt: string;
}

export interface WsRoomDestroyedEvent {
  type: 'ROOM_DESTROYED';
  roomCode: string;
  reason: string;
}

export type WsServerMessage =
  | WsJoinedEvent
  | WsMessageEvent
  | WsTypingEvent
  | WsPresenceEvent
  | WsSystemEvent
  | WsErrorEvent
  | WsRoomExpiringEvent
  | WsRoomDestroyedEvent;

/* ── Frontend-only models ── */

export interface ChatMessage {
  messageId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  sequence?: number;
  isSystem?: boolean;
  systemEvent?: 'USER_JOINED' | 'USER_LEFT' | 'ROOM_EXPIRING' | string;
}

export interface SystemMessage {
  id: string;
  event: string;
  username: string;
  timestamp: string;
}

export interface Participant {
  participantId: string;
  username: string;
  host: boolean;
  isHost?: boolean;
}
