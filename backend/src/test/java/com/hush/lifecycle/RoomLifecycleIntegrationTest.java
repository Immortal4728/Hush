package com.hush.lifecycle;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hush.room.Room;
import com.hush.room.RoomService;
import com.hush.room.RoomState;
import com.hush.room.RoomType;
import com.hush.websocket.protocol.ServerMessage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@SuppressWarnings("null")
public class RoomLifecycleIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private RoomService roomService;

    @Autowired
    private RoomLifecycleService roomLifecycleService;

    @Autowired
    private ObjectMapper objectMapper;

    private StandardWebSocketClient client;
    private String wsUrl;
    private final List<WebSocketSession> openSessions = new CopyOnWriteArrayList<>();

    @BeforeEach
    void setUp() {
        client = new StandardWebSocketClient();
        wsUrl = "ws://localhost:" + port + "/ws/chat";
        for (Room r : roomService.getAllRooms()) {
            try {
                roomLifecycleService.destroyRoom(r.getRoomCode(), "TEST_CLEANUP");
            } catch (Exception ignored) {
            }
        }
    }

    @AfterEach
    void tearDown() {
        for (WebSocketSession session : openSessions) {
            if (session.isOpen()) {
                try {
                    session.close(CloseStatus.NORMAL);
                } catch (Exception ignored) {
                }
            }
        }
        openSessions.clear();
    }

    private WebSocketSession connect(ClientWebSocketHandler handler) throws Exception {
        WebSocketSession session = client.execute(handler, wsUrl).get(5, TimeUnit.SECONDS);
        openSessions.add(session);
        return session;
    }

    @Test
    void testWebSocketReceivesRoomExpiringAndRoomDestroyed() throws Exception {
        // Room expires in 2 seconds
        Room room = roomService.createRoom(RoomType.DIRECT, Duration.ofSeconds(2));
        String roomCode = room.getRoomCode();

        ClientWebSocketHandler handler = new ClientWebSocketHandler();
        WebSocketSession session = connect(handler);

        session.sendMessage(new TextMessage("{\"type\":\"JOIN\",\"roomCode\":\"" + roomCode + "\",\"username\":\"Alice\"}"));
        assertEquals("JOINED", handler.awaitServerMessage(5, TimeUnit.SECONDS).getType().name());
        assertEquals("PRESENCE", handler.awaitServerMessage(5, TimeUnit.SECONDS).getType().name());

        // Process expiration warning
        roomLifecycleService.processExpirations();
        ServerMessage expiringMsg = handler.awaitServerMessage(5, TimeUnit.SECONDS);
        assertNotNull(expiringMsg);
        assertEquals("ROOM_EXPIRING", expiringMsg.getType().name());
        assertEquals(roomCode, expiringMsg.getRoomCode());

        // Wait for expiration
        Thread.sleep(2100);
        roomLifecycleService.processExpirations();

        ServerMessage destroyedMsg = handler.awaitServerMessage(5, TimeUnit.SECONDS);
        assertNotNull(destroyedMsg);
        assertEquals("ROOM_DESTROYED", destroyedMsg.getType().name());

        // Verify room is removed from RoomService
        assertFalse(roomService.roomExists(roomCode));
        assertEquals(RoomState.DESTROYED, room.getState());
    }

    @Test
    void testExpiredRoomJoinRejection() throws Exception {
        Room room = roomService.createRoom(RoomType.DIRECT, Duration.ofMillis(1));
        String roomCode = room.getRoomCode();
        Thread.sleep(20);

        // Process expiration
        roomLifecycleService.processExpirations();

        ClientWebSocketHandler handler = new ClientWebSocketHandler();
        WebSocketSession session = connect(handler);

        session.sendMessage(new TextMessage("{\"type\":\"JOIN\",\"roomCode\":\"" + roomCode + "\",\"username\":\"Alice\"}"));

        ServerMessage errorMsg = handler.awaitServerMessage(5, TimeUnit.SECONDS);
        assertNotNull(errorMsg);
        assertEquals("ERROR", errorMsg.getType().name());
        assertTrue("ROOM_NOT_FOUND".equals(errorMsg.getCode()) || "ROOM_DESTROYED".equals(errorMsg.getCode()) || "ILLEGAL_ROOM_STATE".equals(errorMsg.getCode()));
    }

    @Test
    void testExpiredRoomMessageRejection() throws Exception {
        Room room = roomService.createRoom(RoomType.DIRECT, Duration.ofMinutes(10));
        String roomCode = room.getRoomCode();

        ClientWebSocketHandler handler = new ClientWebSocketHandler();
        WebSocketSession session = connect(handler);

        session.sendMessage(new TextMessage("{\"type\":\"JOIN\",\"roomCode\":\"" + roomCode + "\",\"username\":\"Alice\"}"));
        handler.awaitServerMessage(5, TimeUnit.SECONDS); // JOINED
        handler.awaitServerMessage(5, TimeUnit.SECONDS); // PRESENCE

        // Mark room as DESTROYED while socket is still active
        room.setState(RoomState.DESTROYED);

        // Attempt to send message to destroyed room
        session.sendMessage(new TextMessage("{\"type\":\"MESSAGE\",\"text\":\"Hello?\"}"));

        ServerMessage errorMsg = handler.awaitServerMessage(5, TimeUnit.SECONDS);
        assertNotNull(errorMsg);
        assertEquals("ERROR", errorMsg.getType().name());
        assertEquals("ROOM_DESTROYED", errorMsg.getCode());
    }

    @Test
    void testExpiredRoomTypingRejection() throws Exception {
        Room room = roomService.createRoom(RoomType.DIRECT, Duration.ofMinutes(10));
        String roomCode = room.getRoomCode();

        ClientWebSocketHandler handler = new ClientWebSocketHandler();
        WebSocketSession session = connect(handler);

        session.sendMessage(new TextMessage("{\"type\":\"JOIN\",\"roomCode\":\"" + roomCode + "\",\"username\":\"Alice\"}"));
        handler.awaitServerMessage(5, TimeUnit.SECONDS); // JOINED
        handler.awaitServerMessage(5, TimeUnit.SECONDS); // PRESENCE

        // Mark room as DESTROYED while socket is still active
        room.setState(RoomState.DESTROYED);

        // Attempt typing
        session.sendMessage(new TextMessage("{\"type\":\"TYPING\",\"typing\":true}"));

        ServerMessage errorMsg = handler.awaitServerMessage(5, TimeUnit.SECONDS);
        assertNotNull(errorMsg);
        assertEquals("ERROR", errorMsg.getType().name());
        assertEquals("ROOM_DESTROYED", errorMsg.getCode());
    }

    @Test
    void testConcurrentExpirationVsJoin() throws Exception {
        Room room = roomService.createRoom(RoomType.GROUP, Duration.ofMinutes(10));
        String roomCode = room.getRoomCode();

        int threadCount = 20;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount + 1);
        CountDownLatch latch = new CountDownLatch(1);

        List<ClientWebSocketHandler> handlers = new ArrayList<>();
        List<WebSocketSession> sessions = new ArrayList<>();

        for (int i = 0; i < threadCount; i++) {
            ClientWebSocketHandler h = new ClientWebSocketHandler();
            WebSocketSession s = connect(h);
            handlers.add(h);
            sessions.add(s);
        }

        // Submit concurrent JOINs
        for (int i = 0; i < threadCount; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    latch.await();
                    sessions.get(index).sendMessage(new TextMessage("{\"type\":\"JOIN\",\"roomCode\":\"" + roomCode + "\",\"username\":\"User" + index + "\"}"));
                } catch (Exception ignored) {
                }
            });
        }

        // Submit concurrent room destruction
        executor.submit(() -> {
            try {
                latch.await();
                roomLifecycleService.destroyRoom(roomCode, "CONCURRENT_TEST");
            } catch (Exception ignored) {
            }
        });

        // Trigger simultaneous execution
        latch.countDown();

        executor.shutdown();
        assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));

        // State verification: room is removed and destroyed
        assertFalse(roomService.roomExists(roomCode));
        assertEquals(RoomState.DESTROYED, room.getState());
        assertEquals(0, roomService.getParticipants(roomCode).size());
    }

    @Test
    void testConcurrentLeaveVsExpiration() throws Exception {
        Room room = roomService.createRoom(RoomType.GROUP, Duration.ofMinutes(10));
        String roomCode = room.getRoomCode();

        ClientWebSocketHandler handler = new ClientWebSocketHandler();
        WebSocketSession session = connect(handler);

        session.sendMessage(new TextMessage("{\"type\":\"JOIN\",\"roomCode\":\"" + roomCode + "\",\"username\":\"Alice\"}"));
        handler.awaitServerMessage(5, TimeUnit.SECONDS); // JOINED
        handler.awaitServerMessage(5, TimeUnit.SECONDS); // PRESENCE

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch latch = new CountDownLatch(1);

        executor.submit(() -> {
            try {
                latch.await();
                session.sendMessage(new TextMessage("{\"type\":\"LEAVE\"}"));
            } catch (Exception ignored) {
            }
        });

        executor.submit(() -> {
            try {
                latch.await();
                roomLifecycleService.destroyRoom(roomCode, "CONCURRENT_LEAVE_TEST");
            } catch (Exception ignored) {
            }
        });

        latch.countDown();
        executor.shutdown();
        assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));

        assertFalse(roomService.roomExists(roomCode));
        assertEquals(RoomState.DESTROYED, room.getState());
    }

    @Test
    void testHighVolumeRoomCleanup() {
        int roomCount = 50;
        List<Room> rooms = new ArrayList<>();

        for (int i = 0; i < roomCount; i++) {
            Room r = roomService.createRoom(RoomType.DIRECT, Duration.ofMillis(1));
            rooms.add(r);
        }

        try {
            Thread.sleep(100);
        } catch (InterruptedException ignored) {
        }

        roomLifecycleService.processExpirations();

        for (Room r : rooms) {
            assertFalse(roomService.roomExists(r.getRoomCode()), "Room " + r.getRoomCode() + " should be destroyed");
            assertEquals(RoomState.DESTROYED, r.getState());
        }
    }

    // --- Helper Handler Class ---

    private class ClientWebSocketHandler extends TextWebSocketHandler {
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
