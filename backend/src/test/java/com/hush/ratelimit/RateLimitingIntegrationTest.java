package com.hush.ratelimit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hush.room.Room;
import com.hush.room.RoomService;
import com.hush.room.RoomType;
import com.hush.websocket.protocol.ServerMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.test.context.TestPropertySource;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
        "hush.rate-limit.enabled=true",
        "hush.rate-limit.room-creation.max-attempts=3",
        "hush.rate-limit.room-creation.window-seconds=600",
        "hush.rate-limit.join-attempt.max-attempts=10",
        "hush.rate-limit.join-attempt.window-seconds=60",
        "hush.rate-limit.message.max-attempts=2",
        "hush.rate-limit.message.window-seconds=10",
        "hush.rate-limit.typing.max-attempts=2",
        "hush.rate-limit.typing.window-seconds=10",
        "hush.rate-limit.websocket.max-connections=2"
})
@SuppressWarnings("null")
public class RateLimitingIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private RateLimitingService rateLimitingService;

    @Autowired
    private RoomService roomService;

    @Autowired
    private ObjectMapper objectMapper;

    private StandardWebSocketClient client;
    private String wsUrl;
    private final List<WebSocketSession> openSessions = new CopyOnWriteArrayList<>();

    @BeforeEach
    void setUp() {
        client = new StandardWebSocketClient();
        wsUrl = "ws://localhost:" + port + "/ws/chat";
        rateLimitingService.clearAllLimiters();
    }

    private WebSocketSession connect(TestWebSocketHandler handler) throws Exception {
        WebSocketSession session = client.execute(handler, wsUrl).get(5, TimeUnit.SECONDS);
        openSessions.add(session);
        return session;
    }

    @Test
    void testRoomCreationRateLimitExceededReturn429() {
        String body = "{\"type\":\"DIRECT\",\"ttlMinutes\":60}";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>(body, headers);

        // First 3 requests succeed (201 Created)
        for (int i = 0; i < 3; i++) {
            ResponseEntity<String> response = restTemplate.postForEntity("/api/rooms", entity, String.class);
            assertEquals(HttpStatus.CREATED, response.getStatusCode());
        }

        // 4th request must return 429 Too Many Requests
        ResponseEntity<String> response = restTemplate.postForEntity("/api/rooms", entity, String.class);
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
        assertTrue(response.getBody().contains("TOO_MANY_REQUESTS"));
    }

    @Test
    void testConcurrentRoomCreationRateLimiting() throws Exception {
        String body = "{\"type\":\"DIRECT\",\"ttlMinutes\":60}";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>(body, headers);

        int requestCount = 30;
        ExecutorService executor = Executors.newFixedThreadPool(requestCount);
        CountDownLatch latch = new CountDownLatch(1);

        AtomicInteger createdCount = new AtomicInteger(0);
        AtomicInteger rateLimitedCount = new AtomicInteger(0);

        for (int i = 0; i < requestCount; i++) {
            executor.submit(() -> {
                try {
                    latch.await();
                    ResponseEntity<String> response = restTemplate.postForEntity("/api/rooms", entity, String.class);
                    if (response.getStatusCode() == HttpStatus.CREATED) {
                        createdCount.incrementAndGet();
                    } else if (response.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                        rateLimitedCount.incrementAndGet();
                    }
                } catch (Exception ignored) {
                }
            });
        }

        latch.countDown();
        executor.shutdown();
        assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));

        assertEquals(3, createdCount.get(), "Exactly max-attempts (3) should succeed");
        assertEquals(27, rateLimitedCount.get(), "Remaining requests should be 429 Too Many Requests");
    }

    @Test
    void testWebSocketMessageRateLimitExceeded() throws Exception {
        Room room = roomService.createRoom(RoomType.GROUP, Duration.ofMinutes(10));

        TestWebSocketHandler handler = new TestWebSocketHandler();
        WebSocketSession session = connect(handler);

        session.sendMessage(new TextMessage("{\"type\":\"JOIN\",\"roomCode\":\"" + room.getRoomCode() + "\",\"username\":\"Alice\"}"));
        handler.awaitServerMessage(5, TimeUnit.SECONDS); // JOINED
        handler.awaitServerMessage(5, TimeUnit.SECONDS); // PRESENCE

        // Send 2 messages (max attempts = 2)
        session.sendMessage(new TextMessage("{\"type\":\"MESSAGE\",\"text\":\"Msg 1\"}"));
        handler.awaitServerMessage(5, TimeUnit.SECONDS); // Echo Msg 1

        session.sendMessage(new TextMessage("{\"type\":\"MESSAGE\",\"text\":\"Msg 2\"}"));
        handler.awaitServerMessage(5, TimeUnit.SECONDS); // Echo Msg 2

        // Send 3rd message -> expect RATE_LIMITED error
        session.sendMessage(new TextMessage("{\"type\":\"MESSAGE\",\"text\":\"Msg 3\"}"));

        ServerMessage errorMsg = handler.awaitServerMessage(5, TimeUnit.SECONDS);
        assertNotNull(errorMsg);
        assertEquals("ERROR", errorMsg.getType().name());
        assertEquals("MESSAGE_RATE_LIMITED", errorMsg.getCode());
    }

    @Test
    void testWebSocketTypingRateLimitExceeded() throws Exception {
        Room room = roomService.createRoom(RoomType.GROUP, Duration.ofMinutes(10));

        TestWebSocketHandler handler = new TestWebSocketHandler();
        WebSocketSession session = connect(handler);

        session.sendMessage(new TextMessage("{\"type\":\"JOIN\",\"roomCode\":\"" + room.getRoomCode() + "\",\"username\":\"Alice\"}"));
        handler.awaitServerMessage(5, TimeUnit.SECONDS); // JOINED
        handler.awaitServerMessage(5, TimeUnit.SECONDS); // PRESENCE

        // Send 2 typing events (max = 2)
        session.sendMessage(new TextMessage("{\"type\":\"TYPING\",\"typing\":true}"));
        session.sendMessage(new TextMessage("{\"type\":\"TYPING\",\"typing\":false}"));

        // 3rd typing event -> expect RATE_LIMITED error
        session.sendMessage(new TextMessage("{\"type\":\"TYPING\",\"typing\":true}"));

        ServerMessage errorMsg = handler.awaitServerMessage(5, TimeUnit.SECONDS);
        assertNotNull(errorMsg);
        assertEquals("ERROR", errorMsg.getType().name());
        assertEquals("TYPING_RATE_LIMITED", errorMsg.getCode());
    }

    @Test
    void testWebSocketConnectionLimitExceeded() throws Exception {
        // Max websocket connections = 2
        TestWebSocketHandler h1 = new TestWebSocketHandler();
        WebSocketSession s1 = connect(h1);
        assertTrue(s1.isOpen());

        TestWebSocketHandler h2 = new TestWebSocketHandler();
        WebSocketSession s2 = connect(h2);
        assertTrue(s2.isOpen());

        // 3rd connection attempt should fail / close with error
        TestWebSocketHandler h3 = new TestWebSocketHandler();
        try {
            WebSocketSession s3 = connect(h3);
            Thread.sleep(200);
            assertFalse(s3.isOpen(), "3rd connection should be closed due to rate limits");
        } catch (Exception expected) {
            // Connection rejected
        }

        // Close 1 session -> new connection should succeed
        s1.close(CloseStatus.NORMAL);
        Thread.sleep(100);

        TestWebSocketHandler h4 = new TestWebSocketHandler();
        WebSocketSession s4 = connect(h4);
        assertTrue(s4.isOpen(), "New connection allowed after freeing capacity");
    }

    // --- Helper Handler Class ---

    private class TestWebSocketHandler extends TextWebSocketHandler {
        private final BlockingQueue<String> rawMessages = new LinkedBlockingQueue<>();

        @Override
        protected void handleTextMessage(WebSocketSession session, TextMessage message) {
            rawMessages.add(message.getPayload());
        }

        public ServerMessage awaitServerMessage(long timeout, TimeUnit unit) throws InterruptedException {
            String json = rawMessages.poll(timeout, unit);
            if (json == null) {
                return null;
            }
            try {
                return objectMapper.readValue(json, ServerMessage.class);
            } catch (Exception e) {
                return null;
            }
        }
    }
}
