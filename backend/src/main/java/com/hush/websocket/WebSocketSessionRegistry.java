package com.hush.websocket;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class WebSocketSessionRegistry {

    public static class SessionState {
        private final String roomCode;
        private final String participantId;
        private final String username;

        public SessionState(String roomCode, String participantId, String username) {
            this.roomCode = Objects.requireNonNull(roomCode, "roomCode must not be null");
            this.participantId = Objects.requireNonNull(participantId, "participantId must not be null");
            this.username = Objects.requireNonNull(username, "username must not be null");
        }

        public String getRoomCode() {
            return roomCode;
        }

        public String getParticipantId() {
            return participantId;
        }

        public String getUsername() {
            return username;
        }
    }

    private final ConcurrentHashMap<WebSocketSession, SessionState> sessionStates = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, ConcurrentHashMap<String, WebSocketSession>> roomSessions = new ConcurrentHashMap<>();

    public void registerSession(WebSocketSession session, String roomCode, String participantId, String username) {
        Objects.requireNonNull(session, "session must not be null");
        Objects.requireNonNull(roomCode, "roomCode must not be null");
        Objects.requireNonNull(participantId, "participantId must not be null");
        Objects.requireNonNull(username, "username must not be null");

        String normalizedRoomCode = roomCode.trim().toUpperCase();
        SessionState state = new SessionState(normalizedRoomCode, participantId.trim(), username.trim());
        sessionStates.put(session, state);

        roomSessions.computeIfAbsent(normalizedRoomCode, k -> new ConcurrentHashMap<>())
                .put(participantId.trim(), session);
    }

    public Optional<SessionState> getSessionState(WebSocketSession session) {
        if (session == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(sessionStates.get(session));
    }

    public Collection<WebSocketSession> getSessionsForRoom(String roomCode) {
        if (roomCode == null || roomCode.isBlank()) {
            return List.of();
        }
        String normalizedRoomCode = roomCode.trim().toUpperCase();
        ConcurrentHashMap<String, WebSocketSession> participants = roomSessions.get(normalizedRoomCode);
        if (participants == null || participants.isEmpty()) {
            return List.of();
        }
        return List.copyOf(participants.values());
    }

    public Collection<WebSocketSession> getSessionsForRoomExcept(String roomCode, String excludeParticipantId) {
        if (roomCode == null || roomCode.isBlank()) {
            return List.of();
        }
        String normalizedRoomCode = roomCode.trim().toUpperCase();
        ConcurrentHashMap<String, WebSocketSession> participants = roomSessions.get(normalizedRoomCode);
        if (participants == null || participants.isEmpty()) {
            return List.of();
        }
        List<WebSocketSession> result = new ArrayList<>();
        String trimmedExclude = excludeParticipantId != null ? excludeParticipantId.trim() : "";
        for (Map.Entry<String, WebSocketSession> entry : participants.entrySet()) {
            if (!entry.getKey().equals(trimmedExclude)) {
                result.add(entry.getValue());
            }
        }
        return List.copyOf(result);
    }

    public Optional<SessionState> removeSession(WebSocketSession session) {
        if (session == null) {
            return Optional.empty();
        }
        SessionState state = sessionStates.remove(session);
        if (state != null) {
            ConcurrentHashMap<String, WebSocketSession> participants = roomSessions.get(state.getRoomCode());
            if (participants != null) {
                participants.remove(state.getParticipantId());
                if (participants.isEmpty()) {
                    roomSessions.remove(state.getRoomCode(), participants);
                }
            }
        }
        return Optional.ofNullable(state);
    }

    public int getActiveSessionCount() {
        return sessionStates.size();
    }
}
