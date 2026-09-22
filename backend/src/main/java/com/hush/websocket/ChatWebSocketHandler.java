package com.hush.websocket;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hush.exception.IllegalRoomStateException;
import com.hush.exception.InvalidParticipantException;
import com.hush.exception.RoomFullException;
import com.hush.exception.RoomNotFoundException;
import com.hush.message.ChatMessage;
import com.hush.participant.Participant;
import com.hush.ratelimit.RateLimitingService;
import com.hush.room.RoomService;
import com.hush.websocket.protocol.ClientMessage;
import com.hush.websocket.protocol.ServerMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Component
@SuppressWarnings("null")
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(ChatWebSocketHandler.class);
    private static final String CONNECTION_COUNTED_ATTR = "HUSH_CONN_COUNTED";

    private final RoomService roomService;
    private final WebSocketSessionRegistry sessionRegistry;
    private final ObjectMapper objectMapper;
    private final RateLimitingService rateLimitingService;

    private final ConcurrentHashMap<String, UnjoinedSessionInfo> unjoinedSessions = new ConcurrentHashMap<>();

    private record UnjoinedSessionInfo(WebSocketSession session, Instant connectTime) {}

    public ChatWebSocketHandler(RoomService roomService,
                                WebSocketSessionRegistry sessionRegistry,
                                ObjectMapper objectMapper,
                                RateLimitingService rateLimitingService) {
        this.roomService = Objects.requireNonNull(roomService, "roomService must not be null");
        this.sessionRegistry = Objects.requireNonNull(sessionRegistry, "sessionRegistry must not be null");
        this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper must not be null");
        this.rateLimitingService = Objects.requireNonNull(rateLimitingService, "rateLimitingService must not be null");
    }

    @Override
    public void afterConnectionEstablished(@org.springframework.lang.NonNull WebSocketSession session) throws Exception {
        logger.info("[WS-DEBUG] CONNECTION OPEN - session: {}", session.getId());
        if (!rateLimitingService.tryIncrementWebSocketConnection()) {
            logger.warn("WebSocket connection rejected: Global connection limit reached for session {}", session.getId());
            sendDirect(session, ServerMessage.error("CONNECTION_RATE_LIMITED", "Global connection limit reached. Please try again later."));
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }
        session.getAttributes().put(CONNECTION_COUNTED_ATTR, Boolean.TRUE);
        unjoinedSessions.put(session.getId(), new UnjoinedSessionInfo(session, Instant.now()));
    }

    @Override
    protected void handleTextMessage(@org.springframework.lang.NonNull WebSocketSession session, @org.springframework.lang.NonNull TextMessage message) {
        logger.info("[WS-DEBUG] RAW MESSAGE: {} on session: {}", message.getPayload(), session.getId());
        ClientMessage clientMessage;
        try {
            clientMessage = objectMapper.readValue(message.getPayload(), ClientMessage.class);
        } catch (Exception e) {
            logger.warn("Malformed JSON received on session {}", session.getId());
            sendDirect(session, ServerMessage.error("INVALID_JSON", "Invalid message format."));
            return;
        }

        if (clientMessage == null || clientMessage.getType() == null) {
            sendDirect(session, ServerMessage.error("INVALID_MESSAGE", "Message type is required."));
            return;
        }

        logger.info("[WS-DEBUG] MESSAGE TYPE: {}", clientMessage.getType());

        switch (clientMessage.getType()) {
            case JOIN -> handleJoin(session, clientMessage);
            case MESSAGE -> handleMessage(session, clientMessage);
            case TYPING -> handleTyping(session, clientMessage);
            case LEAVE -> handleLeave(session);
            default -> sendDirect(session, ServerMessage.error("INVALID_MESSAGE", "Unknown message type."));
        }
    }

    private void handleJoin(WebSocketSession session, ClientMessage clientMessage) {
        if (sessionRegistry.getSessionState(session).isPresent()) {
            sendDirect(session, ServerMessage.error("ALREADY_JOINED", "This connection has already joined a room."));
            return;
        }

        String clientIp = rateLimitingService.getIpResolver().resolveIp(session, rateLimitingService.isTrustForwardedFor());
        if (!rateLimitingService.allowJoinAttempt(clientIp)) {
            sendDirect(session, ServerMessage.error("JOIN_RATE_LIMITED", "Too many join attempts. Please slow down."));
            return;
        }

        String roomCode = clientMessage.getRoomCode();
        String username = clientMessage.getUsername();
        logger.info("[WS-DEBUG] JOIN ROOM: {}, JOIN USER: {}", roomCode, username);

        if (roomCode == null || roomCode.isBlank() || username == null || username.isBlank()) {
            sendDirect(session, ServerMessage.error("INVALID_PARTICIPANT", "Room code and username are required."));
            return;
        }

        Participant participant;
        try {
            participant = roomService.addParticipant(roomCode, username);
        } catch (RoomNotFoundException e) {
            sendDirect(session, ServerMessage.error("ROOM_NOT_FOUND", "Room does not exist."));
            return;
        } catch (RoomFullException e) {
            sendDirect(session, ServerMessage.error("ROOM_FULL", "Room is full."));
            return;
        } catch (InvalidParticipantException e) {
            sendDirect(session, ServerMessage.error("INVALID_PARTICIPANT", e.getMessage()));
            return;
        } catch (IllegalRoomStateException e) {
            sendDirect(session, ServerMessage.error("ILLEGAL_ROOM_STATE", e.getMessage()));
            return;
        } catch (Exception e) {
            logger.error("Error joining room for session {}", session.getId(), e);
            sendDirect(session, ServerMessage.error("INTERNAL_ERROR", "Failed to join room."));
            return;
        }

        logger.info("[WS-DEBUG] JOIN ACCEPTED for participantId: {}", participant.getParticipantId());
        String normalizedRoomCode = roomCode.trim().toUpperCase();
        unjoinedSessions.remove(session.getId());
        sessionRegistry.registerSession(session, normalizedRoomCode, participant.getParticipantId(), participant.getUsername());
        logger.info("Participant joined room via WebSocket session {}", session.getId());

        // 1. Send JOINED to joining client
        sendDirect(session, ServerMessage.joined(
                participant.getParticipantId(),
                normalizedRoomCode,
                participant.getUsername(),
                participant.isHost()
        ));
        logger.info("[WS-DEBUG] JOINED SENT to session: {}", session.getId());

        // 1.5. Send Ephemeral Room Message History to joining client
        com.hush.room.Room currentRoom = roomService.findRoom(normalizedRoomCode).orElse(null);
        if (currentRoom != null) {
            List<ServerMessage.ChatMessageDto> historyDtos = currentRoom.getMessages().stream()
                    .map(m -> new ServerMessage.ChatMessageDto(
                            m.getMessageId(),
                            m.getSenderId(),
                            m.getSenderName(),
                            m.getText(),
                            m.getTimestamp().toString()
                    ))
                    .toList();
            if (!historyDtos.isEmpty()) {
                sendDirect(session, ServerMessage.history(historyDtos));
            }
        }

        // 2. Notify other participants via SYSTEM message
        Collection<WebSocketSession> otherSessions = sessionRegistry.getSessionsForRoomExcept(
                normalizedRoomCode, participant.getParticipantId());
        broadcast(otherSessions, ServerMessage.system("USER_JOINED", participant.getUsername()));

        // 3. Broadcast updated PRESENCE to all participants in room
        broadcastPresence(normalizedRoomCode);
    }

    private void handleMessage(WebSocketSession session, ClientMessage clientMessage) {
        Optional<WebSocketSessionRegistry.SessionState> stateOpt = sessionRegistry.getSessionState(session);
        if (stateOpt.isEmpty()) {
            sendDirect(session, ServerMessage.error("NOT_JOINED", "You must join a room first."));
            return;
        }

        if (!rateLimitingService.allowMessage(session.getId())) {
            sendDirect(session, ServerMessage.error("MESSAGE_RATE_LIMITED", "Too many messages. Please slow down."));
            return;
        }

        WebSocketSessionRegistry.SessionState state = stateOpt.get();
        Optional<com.hush.room.Room> roomOpt = roomService.findRoom(state.getRoomCode());
        if (roomOpt.isEmpty() || roomOpt.get().isExpired() || roomOpt.get().getState() == com.hush.room.RoomState.DESTROYED) {
            sendDirect(session, ServerMessage.error("ROOM_DESTROYED", "Room is destroyed or expired."));
            return;
        }

        String text = clientMessage.getText();

        if (text == null || text.isBlank() || text.length() > 2000) {
            sendDirect(session, ServerMessage.error("INVALID_MESSAGE", "Message length must be between 1 and 2000 characters."));
            return;
        }

        String messageId = UUID.randomUUID().toString();
        Instant now = Instant.now();

        // Validate ChatMessage domain model rules and store in room memory buffer
        try {
            ChatMessage domainMsg = new ChatMessage(messageId, state.getParticipantId(), state.getUsername(), text, now);
            roomOpt.get().addMessage(domainMsg);
        } catch (IllegalArgumentException e) {
            sendDirect(session, ServerMessage.error("INVALID_MESSAGE", e.getMessage()));
            return;
        }

        ServerMessage serverMessage = ServerMessage.message(
                messageId,
                state.getParticipantId(),
                state.getUsername(),
                text,
                now.toString()
        );

        Collection<WebSocketSession> roomSessions = sessionRegistry.getSessionsForRoom(state.getRoomCode());
        broadcast(roomSessions, serverMessage);
    }

    private void handleTyping(WebSocketSession session, ClientMessage clientMessage) {
        Optional<WebSocketSessionRegistry.SessionState> stateOpt = sessionRegistry.getSessionState(session);
        if (stateOpt.isEmpty()) {
            sendDirect(session, ServerMessage.error("NOT_JOINED", "You must join a room first."));
            return;
        }

        if (!rateLimitingService.allowTyping(session.getId())) {
            sendDirect(session, ServerMessage.error("TYPING_RATE_LIMITED", "Typing rate limit exceeded. Please slow down."));
            return;
        }

        WebSocketSessionRegistry.SessionState state = stateOpt.get();
        Optional<com.hush.room.Room> roomOpt = roomService.findRoom(state.getRoomCode());
        if (roomOpt.isEmpty() || roomOpt.get().isExpired() || roomOpt.get().getState() == com.hush.room.RoomState.DESTROYED) {
            sendDirect(session, ServerMessage.error("ROOM_DESTROYED", "Room is destroyed or expired."));
            return;
        }

        boolean isTyping = Boolean.TRUE.equals(clientMessage.getTyping());

        ServerMessage typingMsg = ServerMessage.typing(
                state.getParticipantId(),
                state.getUsername(),
                isTyping
        );

        Collection<WebSocketSession> otherSessions = sessionRegistry.getSessionsForRoomExcept(
                state.getRoomCode(), state.getParticipantId());
        broadcast(otherSessions, typingMsg);
    }

    private void handleLeave(WebSocketSession session) {
        Optional<WebSocketSessionRegistry.SessionState> stateOpt = sessionRegistry.getSessionState(session);
        if (stateOpt.isEmpty()) {
            sendDirect(session, ServerMessage.error("NOT_JOINED", "You must join a room first."));
            return;
        }

        cleanupSessionAndNotify(session, true);
    }

    @Override
    public void afterConnectionClosed(@org.springframework.lang.NonNull WebSocketSession session, @org.springframework.lang.NonNull CloseStatus status) {
        cleanupSessionAndNotify(session, false);
    }

    @Override
    public void handleTransportError(@org.springframework.lang.NonNull WebSocketSession session, @org.springframework.lang.NonNull Throwable exception) {
        logger.warn("WebSocket transport error for session {}", session.getId(), exception);
        cleanupSessionAndNotify(session, false);
    }

    private void cleanupSessionAndNotify(WebSocketSession session, boolean closeSocket) {
        logger.info("[WS-DEBUG] CONNECTION CLOSED - session: {}", session.getId());
        unjoinedSessions.remove(session.getId());
        if (Boolean.TRUE.equals(session.getAttributes().remove(CONNECTION_COUNTED_ATTR))) {
            rateLimitingService.decrementWebSocketConnection();
        }

        Optional<WebSocketSessionRegistry.SessionState> stateOpt = sessionRegistry.removeSession(session);
        if (stateOpt.isPresent()) {
            WebSocketSessionRegistry.SessionState state = stateOpt.get();
            roomService.removeParticipant(state.getRoomCode(), state.getParticipantId());
            logger.info("Participant disconnected from room via WebSocket session {}", session.getId());

            Collection<WebSocketSession> remainingSessions = sessionRegistry.getSessionsForRoom(state.getRoomCode());
            if (!remainingSessions.isEmpty()) {
                broadcast(remainingSessions, ServerMessage.system("USER_LEFT", state.getUsername()));
                broadcastPresence(state.getRoomCode());
            }
        }

        if (closeSocket && session.isOpen()) {
            try {
                session.close(CloseStatus.NORMAL);
            } catch (IOException e) {
                logger.warn("Failed to close socket session {}", session.getId(), e);
            }
        }
    }

    @Scheduled(fixedDelay = 2000)
    public void cleanupUnjoinedSessions() {
        Instant now = Instant.now();
        for (Map.Entry<String, UnjoinedSessionInfo> entry : unjoinedSessions.entrySet()) {
            UnjoinedSessionInfo info = entry.getValue();
            if (Duration.between(info.connectTime(), now).getSeconds() >= 10) {
                if (unjoinedSessions.remove(entry.getKey(), info)) {
                    logger.warn("Unjoined WebSocket connection timed out for session {}", info.session().getId());
                    sendDirect(info.session(), ServerMessage.error("JOIN_TIMEOUT", "Timed out waiting for JOIN message."));
                    try {
                        info.session().close(CloseStatus.POLICY_VIOLATION);
                    } catch (IOException e) {
                        logger.warn("Failed to close unjoined session {}", info.session().getId(), e);
                    }
                }
            }
        }
    }

    private void broadcastPresence(String roomCode) {
        Collection<Participant> participants = roomService.getParticipants(roomCode);
        List<ServerMessage.ParticipantDto> dtos = participants.stream()
                .map(p -> new ServerMessage.ParticipantDto(p.getParticipantId(), p.getUsername(), p.isHost()))
                .collect(Collectors.toList());

        ServerMessage presenceMsg = ServerMessage.presence(dtos);
        Collection<WebSocketSession> roomSessions = sessionRegistry.getSessionsForRoom(roomCode);
        broadcast(roomSessions, presenceMsg);
    }

    private void sendDirect(WebSocketSession session, ServerMessage serverMessage) {
        if (!session.isOpen()) {
            return;
        }
        try {
            String json = objectMapper.writeValueAsString(serverMessage);
            synchronized (session) {
                if (session.isOpen()) {
                    session.sendMessage(new TextMessage(json));
                }
            }
        } catch (IOException e) {
            logger.warn("Failed to send direct message to session {}", session.getId());
        }
    }

    private void broadcast(Collection<WebSocketSession> sessions, ServerMessage serverMessage) {
        if (sessions == null || sessions.isEmpty()) {
            return;
        }
        String json;
        try {
            json = objectMapper.writeValueAsString(serverMessage);
        } catch (JsonProcessingException e) {
            logger.error("Failed to serialize server message", e);
            return;
        }
        TextMessage textMessage = new TextMessage(json);
        for (WebSocketSession session : sessions) {
            if (session.isOpen()) {
                try {
                    synchronized (session) {
                        if (session.isOpen()) {
                            session.sendMessage(textMessage);
                        }
                    }
                } catch (IOException e) {
                    logger.warn("Failed to broadcast message to session {}", session.getId());
                }
            }
        }
    }
}
