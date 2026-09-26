package com.hush.scalability;

import com.hush.config.HushLifecycleProperties;
import com.hush.config.HushRateLimitProperties;
import com.hush.config.HushRoomProperties;
import com.hush.config.HushWebSocketProperties;
import com.hush.message.ChatMessage;
import com.hush.metrics.MetricsService;
import com.hush.ratelimit.IpResolver;
import com.hush.ratelimit.RateLimitingService;
import com.hush.room.Room;
import com.hush.room.RoomType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class ScalabilityAndConfigTest {

    private HushRateLimitProperties rateLimitProperties;
    private RateLimitingService rateLimitingService;
    private MetricsService metricsService;

    @BeforeEach
    void setUp() {
        rateLimitProperties = new HushRateLimitProperties();
        IpResolver ipResolver = new IpResolver();
        rateLimitingService = new RateLimitingService(rateLimitProperties, ipResolver);
        metricsService = new MetricsService(rateLimitProperties);
    }

    @Test
    @DisplayName("1. Connection limit enforcement: Rejects beyond max, decrements on disconnect, non-negative capacity recovery")
    void testConnectionLimitEnforcement() {
        rateLimitProperties.getWebsocket().setMaxConnections(3);
        rateLimitingService.clearAllLimiters();

        assertTrue(rateLimitingService.tryIncrementWebSocketConnection());
        assertTrue(rateLimitingService.tryIncrementWebSocketConnection());
        assertTrue(rateLimitingService.tryIncrementWebSocketConnection());

        assertEquals(3, rateLimitingService.getActiveWebSocketConnections());

        // 4th connection rejected
        assertFalse(rateLimitingService.tryIncrementWebSocketConnection());
        assertEquals(3, rateLimitingService.getActiveWebSocketConnections());

        // Disconnect recovers capacity
        rateLimitingService.decrementWebSocketConnection();
        assertEquals(2, rateLimitingService.getActiveWebSocketConnections());

        // New connection allowed
        assertTrue(rateLimitingService.tryIncrementWebSocketConnection());
        assertEquals(3, rateLimitingService.getActiveWebSocketConnections());

        // Multiple decrements never go below 0
        rateLimitingService.decrementWebSocketConnection();
        rateLimitingService.decrementWebSocketConnection();
        rateLimitingService.decrementWebSocketConnection();
        rateLimitingService.decrementWebSocketConnection();
        rateLimitingService.decrementWebSocketConnection();

        assertEquals(0, rateLimitingService.getActiveWebSocketConnections());
    }

    @Test
    @DisplayName("2. Configurable room history limit bounds message memory queue")
    void testConfigurableRoomHistoryLimit() {
        Room room = new Room("K7M4Q2", RoomType.DIRECT, Instant.now(), Instant.now().plusSeconds(3600), 2, 5);

        for (int i = 1; i <= 10; i++) {
            com.hush.message.ChatMessage msg = new com.hush.message.ChatMessage(
                    "msg-" + i, "user-1", "Alice", "Test message " + i, Instant.now());
            room.addMessage(msg);
        }

        assertEquals(5, room.getMessages().size(), "Room must retain only the newest 5 messages");
        assertEquals("msg-6", room.getMessages().get(0).getMessageId());
        assertEquals("msg-10", room.getMessages().get(4).getMessageId());
    }

    @Test
    @DisplayName("3. Configurable room properties (capacity & defaults)")
    void testConfigurableRoomProperties() {
        HushRoomProperties roomProps = new HushRoomProperties();
        roomProps.setDirectMaxParticipants(4);
        roomProps.setGroupMaxParticipants(100);
        roomProps.setMaxHistoryMessages(200);

        assertEquals(4, roomProps.getDirectMaxParticipants());
        assertEquals(100, roomProps.getGroupMaxParticipants());
        assertEquals(200, roomProps.getMaxHistoryMessages());
    }

    @Test
    @DisplayName("4. Configurable WebSocket properties (message size & unjoined timeout)")
    void testConfigurableWebSocketProperties() {
        HushWebSocketProperties wsProps = new HushWebSocketProperties();
        wsProps.setMaxMessageLength(4000);
        wsProps.setUnjoinedTimeoutSeconds(15);

        assertEquals(4000, wsProps.getMaxMessageLength());
        assertEquals(15, wsProps.getUnjoinedTimeoutSeconds());
    }

    @Test
    @DisplayName("5. Configurable lifecycle properties (grace period & warning threshold)")
    void testConfigurableLifecycleProperties() {
        HushLifecycleProperties lifecycleProps = new HushLifecycleProperties();
        lifecycleProps.setEmptyRoomGracePeriodSeconds(45);
        lifecycleProps.setExpiringWarningThresholdSeconds(120);

        assertEquals(45, lifecycleProps.getEmptyRoomGracePeriodSeconds());
        assertEquals(120, lifecycleProps.getExpiringWarningThresholdSeconds());
    }

    @Test
    @DisplayName("6. Metrics accuracy: Records connection, room, join, message, and system metrics accurately")
    void testMetricsServiceAccuracy() {
        metricsService.recordConnectionAttempt();
        metricsService.recordConnectionAttempt();
        metricsService.recordConnectionRejected();
        metricsService.recordDisconnect();

        metricsService.recordRoomCreated();
        metricsService.recordRoomDestroyed();
        metricsService.recordRoomExpired();

        metricsService.recordJoinAttempt();
        metricsService.recordSuccessfulJoin();
        metricsService.recordLeaveEvent();

        metricsService.recordMessageReceived();
        metricsService.recordMessageBroadcast(4);
        metricsService.recordMessageProcessingLatency(500_000); // 0.5 ms
        metricsService.recordBroadcastLatency(1_000_000); // 1.0 ms

        MetricsService.OperationalMetricsSnapshot snapshot =
                metricsService.getSnapshot(2, 1, 1, 0, 2);

        assertEquals(2, snapshot.activeWebsocketConnections());
        assertEquals(2, snapshot.connectionAttempts());
        assertEquals(1, snapshot.rejectedConnections());
        assertEquals(1, snapshot.disconnects());
        assertEquals(1, snapshot.activeRooms());
        assertEquals(1, snapshot.roomsCreated());
        assertEquals(1, snapshot.roomsDestroyed());
        assertEquals(1, snapshot.roomsExpired());
        assertEquals(1, snapshot.joinAttempts());
        assertEquals(1, snapshot.successfulJoins());
        assertEquals(1, snapshot.leaveEvents());
        assertEquals(1, snapshot.messagesReceived());
        assertEquals(4, snapshot.messagesBroadcast());
        assertTrue(snapshot.avgMessageProcessingLatencyMs() > 0);
        assertTrue(snapshot.avgBroadcastLatencyMs() > 0);
        assertTrue(snapshot.jvmHeapUsedMb() >= 0);
        assertTrue(snapshot.threadCount() > 0);
        assertTrue(snapshot.uptimeSeconds() >= 0);
    }
}
