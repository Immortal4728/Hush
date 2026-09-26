package com.hush.lifecycle;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hush.config.HushLifecycleProperties;
import com.hush.room.Room;
import com.hush.room.RoomService;
import com.hush.websocket.WebSocketSessionRegistry;
import com.hush.websocket.protocol.ServerMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.Objects;
import java.util.Optional;

@Service
@SuppressWarnings("null")
public class RoomLifecycleService {

    private static final Logger logger = LoggerFactory.getLogger(RoomLifecycleService.class);

    private final RoomService roomService;
    private final WebSocketSessionRegistry sessionRegistry;
    private final ObjectMapper objectMapper;
    private final HushLifecycleProperties properties;
    private final com.hush.metrics.MetricsService metricsService;

    public RoomLifecycleService(RoomService roomService,
                                WebSocketSessionRegistry sessionRegistry,
                                ObjectMapper objectMapper,
                                HushLifecycleProperties properties) {
        this(roomService, sessionRegistry, objectMapper, properties,
                new com.hush.metrics.MetricsService(new com.hush.config.HushRateLimitProperties()));
    }

    @org.springframework.beans.factory.annotation.Autowired
    public RoomLifecycleService(RoomService roomService,
                                WebSocketSessionRegistry sessionRegistry,
                                ObjectMapper objectMapper,
                                HushLifecycleProperties properties,
                                com.hush.metrics.MetricsService metricsService) {
        this.roomService = Objects.requireNonNull(roomService, "roomService must not be null");
        this.sessionRegistry = Objects.requireNonNull(sessionRegistry, "sessionRegistry must not be null");
        this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper must not be null");
        this.properties = Objects.requireNonNull(properties, "properties must not be null");
        this.metricsService = metricsService != null ? metricsService :
                new com.hush.metrics.MetricsService(new com.hush.config.HushRateLimitProperties());
    }

    public void processExpirations() {
        Instant now = Instant.now();
        Collection<Room> rooms = roomService.getAllRooms();

        for (Room room : rooms) {
            String roomCode = room.getRoomCode();

            // 1. Check if room is expired
            if (room.isExpired(now)) {
                logger.info("Room {} has expired. Initiating destruction.", roomCode);
                destroyRoom(roomCode, "EXPIRED");
                continue;
            }

            // 2. Check empty room grace period
            if (room.getParticipantCount() == 0 && room.getEmptySince() != null) {
                long gracePeriodSec = properties.getEmptyRoomGracePeriodSeconds();
                if (now.isAfter(room.getEmptySince().plusSeconds(gracePeriodSec))) {
                    logger.info("Room {} empty grace period ({}s) exceeded. Initiating destruction.", roomCode, gracePeriodSec);
                    destroyRoom(roomCode, "EMPTY_GRACE_PERIOD_EXPIRED");
                    continue;
                }
            }

            // 3. Check warning notification threshold
            if (!room.isExpiringNotified()) {
                long warningThresholdSec = properties.getExpiringWarningThresholdSeconds();
                Instant warningTime = room.getExpiresAt().minusSeconds(warningThresholdSec);
                if (!now.isBefore(warningTime)) {
                    checkAndNotifyExpiring(room, now);
                }
            }
        }
    }

    public boolean destroyRoom(String roomCode, String reason) {
        Optional<Room> roomOpt = roomService.findRoom(roomCode);
        if (roomOpt.isEmpty()) {
            return false;
        }

        Room room = roomOpt.get();
        // Atomically transition state to DESTROYED
        if (!room.markDestroyed()) {
            // Already destroyed
            return false;
        }

        if ("EXPIRED".equalsIgnoreCase(reason)) {
            metricsService.recordRoomExpired();
        } else if ("EMPTY_GRACE_PERIOD_EXPIRED".equalsIgnoreCase(reason)) {
            metricsService.recordEmptyRoomDestroyed();
        }
        metricsService.recordRoomDestroyed();

        Collection<WebSocketSession> sessions = sessionRegistry.getSessionsForRoom(roomCode);
        ServerMessage destroyedMessage = ServerMessage.roomDestroyed(roomCode, reason);

        // 1. Send ROOM_DESTROYED message to all connected sessions
        broadcast(sessions, destroyedMessage);

        // 2. Close WebSockets & clean registry mappings
        for (WebSocketSession session : sessions) {
            sessionRegistry.removeSession(session);
            if (session.isOpen()) {
                try {
                    session.close(CloseStatus.GOING_AWAY);
                } catch (IOException e) {
                    logger.warn("Failed to close socket for session {} during room destruction", session.getId());
                }
            }
        }

        // 3. Clear participants & remove room from memory
        room.clearParticipants();
        roomService.removeRoom(roomCode);

        logger.info("Room {} successfully destroyed (reason: {}).", roomCode, reason);
        return true;
    }

    private void checkAndNotifyExpiring(Room room, Instant now) {
        synchronized (room) {
            if (room.isExpiringNotified()) {
                return;
            }
            room.setExpiringNotified(true);
        }

        long remainingSeconds = Math.max(0, Duration.between(now, room.getExpiresAt()).getSeconds());
        ServerMessage expiringMessage = ServerMessage.roomExpiring(
                room.getRoomCode(),
                remainingSeconds,
                room.getExpiresAt().toString()
        );

        Collection<WebSocketSession> sessions = sessionRegistry.getSessionsForRoom(room.getRoomCode());
        broadcast(sessions, expiringMessage);
        logger.info("Sent ROOM_EXPIRING notification for room {} ({} seconds remaining).", room.getRoomCode(), remainingSeconds);
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
                    logger.warn("Failed to send message to session {}", session.getId());
                }
            }
        }
    }
}
