package com.hush.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hush.room.Room;
import com.hush.room.RoomService;
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
public class ChatWebSocketIntegrationTest {

    @LocalServerPort
    private int port;

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

    private String createDirectRoom() {
        Room room = roomService.createRoom(RoomType.DIRECT, Duration.ofMinutes(60));
        return room.getRoomCode();
    }

    private String createGroupRoom() {
        Room room = roomService.createRoom(RoomType.GROUP, Duration.ofMinutes(60));
        return room.getRoomCode();
    }

    @Test
    void testConnection() throws Exception {
        ClientWebSocketHandler handler = new ClientWebSocketHandler();
        WebSocketSession session = connect(handler);
        assertTrue(session.isOpen());
    }

    @Test
    void testJoinSuccess() throws Exception {
        String roomCode = createDirectRoom();
        ClientWebSocketHandler handler = new ClientWebSocketHandler();
        WebSocketSession session = connect(handler);

        session.sendMessage(new TextMessage(
                "{\"type\":\"JOIN\",\"roomCode\":\"" + roomCode + "\",\"username\":\"Alice\"}"
        ));

        ServerMessage joinedMsg = handler.awaitServerMessage(5, TimeUnit.SECONDS);
        assertNotNull(joinedMsg);
        assertEquals("JOINED", joinedMsg.getType().name());
        assertNotNull(joinedMsg.getParticipantId());
        assertEquals(roomCode, joinedMsg.getRoomCode());
        assertEquals("Alice", joinedMsg.getUsername());
        assertTrue(joinedMsg.getHost());

        ServerMessage presenceMsg = handler.awaitServerMessage(5, TimeUnit.SECONDS);
        assertNotNull(presenceMsg);
        assertEquals("PRESENCE", presenceMsg.getType().name());
        assertEquals(1, presenceMsg.getParticipants().size());
    }

    @Test
    void testMessageBroadcastAndEcho() throws Exception {
        String roomCode = createGroupRoom();

        ClientWebSocketHandler clientA = new ClientWebSocketHandler();
        WebSocketSession sessionA = connect(clientA);
        sessionA.sendMessage(new TextMessage("{\"type\":\"JOIN\",\"roomCode\":\"" + roomCode + "\",\"username\":\"Alice\"}"));
        clientA.awaitServerMessage(5, TimeUnit.SECONDS); // JOINED
        clientA.awaitServerMessage(5, TimeUnit.SECONDS); // PRESENCE

        ClientWebSocketHandler clientB = new ClientWebSocketHandler();
        WebSocketSession sessionB = connect(clientB);
        sessionB.sendMessage(new TextMessage("{\"type\":\"JOIN\",\"roomCode\":\"" + roomCode + "\",\"username\":\"Bob\"}"));
        clientB.awaitServerMessage(5, TimeUnit.SECONDS); // JOINED
        clientB.awaitServerMessage(5, TimeUnit.SECONDS); // PRESENCE
        clientA.awaitServerMessage(5, TimeUnit.SECONDS); // SYSTEM (USER_JOINED)
        clientA.awaitServerMessage(5, TimeUnit.SECONDS); // PRESENCE

        // Alice sends a message
        sessionA.sendMessage(new TextMessage("{\"type\":\"MESSAGE\",\"text\":\"Hello Bob!\"}"));

        ServerMessage msgA = clientA.awaitServerMessage(5, TimeUnit.SECONDS);
        assertNotNull(msgA);
        assertEquals("MESSAGE", msgA.getType().name());
        assertEquals("Alice", msgA.getSenderName());
        assertEquals("Hello Bob!", msgA.getText());
        assertNotNull(msgA.getMessageId());
        assertNotNull(msgA.getTimestamp());

        ServerMessage msgB = clientB.awaitServerMessage(5, TimeUnit.SECONDS);
        assertNotNull(msgB);
        assertEquals("MESSAGE", msgB.getType().name());
        assertEquals("Alice", msgB.getSenderName());
        assertEquals("Hello Bob!", msgB.getText());
        assertEquals(msgA.getMessageId(), msgB.getMessageId());
    }

    @Test
    void testRoomIsolation() throws Exception {
        String roomA = createDirectRoom();
        String roomB = createDirectRoom();

        ClientWebSocketHandler handlerA = new ClientWebSocketHandler();
        WebSocketSession sessionA = connect(handlerA);
        sessionA.sendMessage(new TextMessage("{\"type\":\"JOIN\",\"roomCode\":\"" + roomA + "\",\"username\":\"Alice\"}"));
        handlerA.awaitServerMessage(5, TimeUnit.SECONDS); // JOINED
        handlerA.awaitServerMessage(5, TimeUnit.SECONDS); // PRESENCE

        ClientWebSocketHandler handlerB = new ClientWebSocketHandler();
        WebSocketSession sessionB = connect(handlerB);
        sessionB.sendMessage(new TextMessage("{\"type\":\"JOIN\",\"roomCode\":\"" + roomB + "\",\"username\":\"Bob\"}"));
        handlerB.awaitServerMessage(5, TimeUnit.SECONDS); // JOINED
        handlerB.awaitServerMessage(5, TimeUnit.SECONDS); // PRESENCE

        // Alice sends message in Room A
        sessionA.sendMessage(new TextMessage("{\"type\":\"MESSAGE\",\"text\":\"Secret in A\"}"));

        ServerMessage msgA = handlerA.awaitServerMessage(5, TimeUnit.SECONDS);
        assertEquals("MESSAGE", msgA.getType().name());

        // Verify Bob in Room B receives nothing
        ServerMessage msgB = handlerB.awaitServerMessage(1, TimeUnit.SECONDS);
        assertNull(msgB, "Bob in Room B should not receive messages from Room A");
    }

    @Test
    void testTypingLifecycle() throws Exception {
        String roomCode = createGroupRoom();

        ClientWebSocketHandler clientA = new ClientWebSocketHandler();
        WebSocketSession sessionA = connect(clientA);
        sessionA.sendMessage(new TextMessage("{\"type\":\"JOIN\",\"roomCode\":\"" + roomCode + "\",\"username\":\"Alice\"}"));
        clientA.awaitServerMessage(5, TimeUnit.SECONDS); // JOINED
        clientA.awaitServerMessage(5, TimeUnit.SECONDS); // PRESENCE

        ClientWebSocketHandler clientB = new ClientWebSocketHandler();
        WebSocketSession sessionB = connect(clientB);
        sessionB.sendMessage(new TextMessage("{\"type\":\"JOIN\",\"roomCode\":\"" + roomCode + "\",\"username\":\"Bob\"}"));
        clientB.awaitServerMessage(5, TimeUnit.SECONDS); // JOINED
        clientB.awaitServerMessage(5, TimeUnit.SECONDS); // PRESENCE
        clientA.awaitServerMessage(5, TimeUnit.SECONDS); // SYSTEM
        clientA.awaitServerMessage(5, TimeUnit.SECONDS); // PRESENCE

        // Alice sends typing=true
        sessionA.sendMessage(new TextMessage("{\"type\":\"TYPING\",\"typing\":true}"));

        ServerMessage typingMsgB = clientB.awaitServerMessage(5, TimeUnit.SECONDS);
        assertNotNull(typingMsgB);
        assertEquals("TYPING", typingMsgB.getType().name());
        assertEquals("Alice", typingMsgB.getUsername());
        assertTrue(typingMsgB.getTyping());

        // Verify Alice (sender) does not receive her own typing event
        ServerMessage typingMsgA = clientA.awaitServerMessage(1, TimeUnit.SECONDS);
        assertNull(typingMsgA, "Sender should not receive own typing notification");
    }

    @Test
    void testLeaveLifecycle() throws Exception {
        String roomCode = createGroupRoom();

        ClientWebSocketHandler clientA = new ClientWebSocketHandler();
        WebSocketSession sessionA = connect(clientA);
        sessionA.sendMessage(new TextMessage("{\"type\":\"JOIN\",\"roomCode\":\"" + roomCode + "\",\"username\":\"Alice\"}"));
        clientA.awaitServerMessage(5, TimeUnit.SECONDS); // JOINED
        clientA.awaitServerMessage(5, TimeUnit.SECONDS); // PRESENCE

        ClientWebSocketHandler clientB = new ClientWebSocketHandler();
        WebSocketSession sessionB = connect(clientB);
        sessionB.sendMessage(new TextMessage("{\"type\":\"JOIN\",\"roomCode\":\"" + roomCode + "\",\"username\":\"Bob\"}"));
        clientB.awaitServerMessage(5, TimeUnit.SECONDS); // JOINED
        clientB.awaitServerMessage(5, TimeUnit.SECONDS); // PRESENCE
        clientA.awaitServerMessage(5, TimeUnit.SECONDS); // SYSTEM
        clientA.awaitServerMessage(5, TimeUnit.SECONDS); // PRESENCE

        // Alice sends LEAVE
        sessionA.sendMessage(new TextMessage("{\"type\":\"LEAVE\"}"));

        ServerMessage systemB = clientB.awaitServerMessage(5, TimeUnit.SECONDS);
        assertNotNull(systemB);
        assertEquals("SYSTEM", systemB.getType().name());
        assertEquals("USER_LEFT", systemB.getEvent());

        ServerMessage presenceB = clientB.awaitServerMessage(5, TimeUnit.SECONDS);
        assertNotNull(presenceB);
        assertEquals("PRESENCE", presenceB.getType().name());
        assertEquals(1, presenceB.getParticipants().size());

        // Verify Alice's participant is removed from RoomService
        assertEquals(1, roomService.getParticipants(roomCode).size());
    }

    @Test
    void testUnexpectedDisconnect() throws Exception {
        String roomCode = createGroupRoom();

        ClientWebSocketHandler clientA = new ClientWebSocketHandler();
        WebSocketSession sessionA = connect(clientA);
        sessionA.sendMessage(new TextMessage("{\"type\":\"JOIN\",\"roomCode\":\"" + roomCode + "\",\"username\":\"Alice\"}"));
        clientA.awaitServerMessage(5, TimeUnit.SECONDS); // JOINED
        clientA.awaitServerMessage(5, TimeUnit.SECONDS); // PRESENCE

        ClientWebSocketHandler clientB = new ClientWebSocketHandler();
        WebSocketSession sessionB = connect(clientB);
        sessionB.sendMessage(new TextMessage("{\"type\":\"JOIN\",\"roomCode\":\"" + roomCode + "\",\"username\":\"Bob\"}"));
        clientB.awaitServerMessage(5, TimeUnit.SECONDS); // JOINED
        clientB.awaitServerMessage(5, TimeUnit.SECONDS); // PRESENCE
        clientA.awaitServerMessage(5, TimeUnit.SECONDS); // SYSTEM
        clientA.awaitServerMessage(5, TimeUnit.SECONDS); // PRESENCE

        // Close session A abruptly without LEAVE
        sessionA.close(CloseStatus.GOING_AWAY);

        ServerMessage systemB = clientB.awaitServerMessage(5, TimeUnit.SECONDS);
        assertNotNull(systemB);
        assertEquals("SYSTEM", systemB.getType().name());
        assertEquals("USER_LEFT", systemB.getEvent());

        ServerMessage presenceB = clientB.awaitServerMessage(5, TimeUnit.SECONDS);
        assertNotNull(presenceB);
        assertEquals("PRESENCE", presenceB.getType().name());
        assertEquals(1, presenceB.getParticipants().size());
        assertEquals(1, roomService.getParticipants(roomCode).size());
    }

    @Test
    void testCapacityEnforcement() throws Exception {
        String roomCode = createDirectRoom(); // Capacity 2

        ClientWebSocketHandler client1 = new ClientWebSocketHandler();
        WebSocketSession s1 = connect(client1);
        s1.sendMessage(new TextMessage("{\"type\":\"JOIN\",\"roomCode\":\"" + roomCode + "\",\"username\":\"User1\"}"));
        assertEquals("JOINED", client1.awaitServerMessage(5, TimeUnit.SECONDS).getType().name());

        ClientWebSocketHandler client2 = new ClientWebSocketHandler();
        WebSocketSession s2 = connect(client2);
        s2.sendMessage(new TextMessage("{\"type\":\"JOIN\",\"roomCode\":\"" + roomCode + "\",\"username\":\"User2\"}"));
        assertEquals("JOINED", client2.awaitServerMessage(5, TimeUnit.SECONDS).getType().name());

        // 3rd client attempts to join DIRECT room
        ClientWebSocketHandler client3 = new ClientWebSocketHandler();
        WebSocketSession s3 = connect(client3);
        s3.sendMessage(new TextMessage("{\"type\":\"JOIN\",\"roomCode\":\"" + roomCode + "\",\"username\":\"User3\"}"));

        ServerMessage errorMsg = client3.awaitServerMessage(5, TimeUnit.SECONDS);
        assertNotNull(errorMsg);
        assertEquals("ERROR", errorMsg.getType().name());
        assertEquals("ROOM_FULL", errorMsg.getCode());

        assertEquals(2, roomService.getParticipants(roomCode).size());
    }

    @Test
    void testJoinTwiceRejection() throws Exception {
        String roomCode = createDirectRoom();
        ClientWebSocketHandler client = new ClientWebSocketHandler();
        WebSocketSession session = connect(client);

        session.sendMessage(new TextMessage("{\"type\":\"JOIN\",\"roomCode\":\"" + roomCode + "\",\"username\":\"Alice\"}"));
        assertEquals("JOINED", client.awaitServerMessage(5, TimeUnit.SECONDS).getType().name());
        assertEquals("PRESENCE", client.awaitServerMessage(5, TimeUnit.SECONDS).getType().name());

        // Send JOIN again
        session.sendMessage(new TextMessage("{\"type\":\"JOIN\",\"roomCode\":\"" + roomCode + "\",\"username\":\"Alice2\"}"));

        ServerMessage errorMsg = client.awaitServerMessage(5, TimeUnit.SECONDS);
        assertNotNull(errorMsg);
        assertEquals("ERROR", errorMsg.getType().name());
        assertEquals("ALREADY_JOINED", errorMsg.getCode());

        assertEquals(1, roomService.getParticipants(roomCode).size());
    }

    @Test
    void testMessageBeforeJoin() throws Exception {
        ClientWebSocketHandler client = new ClientWebSocketHandler();
        WebSocketSession session = connect(client);

        session.sendMessage(new TextMessage("{\"type\":\"MESSAGE\",\"text\":\"Hello\"}"));

        ServerMessage errorMsg = client.awaitServerMessage(5, TimeUnit.SECONDS);
        assertNotNull(errorMsg);
        assertEquals("ERROR", errorMsg.getType().name());
        assertEquals("NOT_JOINED", errorMsg.getCode());
    }

    @Test
    void testTypingBeforeJoin() throws Exception {
        ClientWebSocketHandler client = new ClientWebSocketHandler();
        WebSocketSession session = connect(client);

        session.sendMessage(new TextMessage("{\"type\":\"TYPING\",\"typing\":true}"));

        ServerMessage errorMsg = client.awaitServerMessage(5, TimeUnit.SECONDS);
        assertNotNull(errorMsg);
        assertEquals("ERROR", errorMsg.getType().name());
        assertEquals("NOT_JOINED", errorMsg.getCode());
    }

    @Test
    void testInvalidJson() throws Exception {
        ClientWebSocketHandler client = new ClientWebSocketHandler();
        WebSocketSession session = connect(client);

        session.sendMessage(new TextMessage("{invalid json format"));

        ServerMessage errorMsg = client.awaitServerMessage(5, TimeUnit.SECONDS);
        assertNotNull(errorMsg);
        assertEquals("ERROR", errorMsg.getType().name());
        assertEquals("INVALID_JSON", errorMsg.getCode());
    }

    @Test
    void testUnknownMessageType() throws Exception {
        ClientWebSocketHandler client = new ClientWebSocketHandler();
        WebSocketSession session = connect(client);

        session.sendMessage(new TextMessage("{\"type\":\"UNKNOWN_TYPE\"}"));

        ServerMessage errorMsg = client.awaitServerMessage(5, TimeUnit.SECONDS);
        assertNotNull(errorMsg);
        assertEquals("ERROR", errorMsg.getType().name());
        assertEquals("INVALID_JSON", errorMsg.getCode());
    }

    @Test
    void testEmptyMessageRejection() throws Exception {
        String roomCode = createDirectRoom();
        ClientWebSocketHandler client = new ClientWebSocketHandler();
        WebSocketSession session = connect(client);

        session.sendMessage(new TextMessage("{\"type\":\"JOIN\",\"roomCode\":\"" + roomCode + "\",\"username\":\"Alice\"}"));
        client.awaitServerMessage(5, TimeUnit.SECONDS); // JOINED
        client.awaitServerMessage(5, TimeUnit.SECONDS); // PRESENCE

        // Empty message
        session.sendMessage(new TextMessage("{\"type\":\"MESSAGE\",\"text\":\"   \"}"));

        ServerMessage errorMsg = client.awaitServerMessage(5, TimeUnit.SECONDS);
        assertNotNull(errorMsg);
        assertEquals("ERROR", errorMsg.getType().name());
        assertEquals("INVALID_MESSAGE", errorMsg.getCode());
    }

    @Test
    void testOversizedMessageRejection() throws Exception {
        String roomCode = createDirectRoom();
        ClientWebSocketHandler client = new ClientWebSocketHandler();
        WebSocketSession session = connect(client);

        session.sendMessage(new TextMessage("{\"type\":\"JOIN\",\"roomCode\":\"" + roomCode + "\",\"username\":\"Alice\"}"));
        client.awaitServerMessage(5, TimeUnit.SECONDS); // JOINED
        client.awaitServerMessage(5, TimeUnit.SECONDS); // PRESENCE

        String oversizedText = "a".repeat(2001);
        session.sendMessage(new TextMessage("{\"type\":\"MESSAGE\",\"text\":\"" + oversizedText + "\"}"));

        ServerMessage errorMsg = client.awaitServerMessage(5, TimeUnit.SECONDS);
        assertNotNull(errorMsg);
        assertEquals("ERROR", errorMsg.getType().name());
        assertEquals("INVALID_MESSAGE", errorMsg.getCode());
    }

    @Test
    void testConcurrentMessaging() throws Exception {
        String roomCode = createGroupRoom();
        int clientCount = 5;
        List<ClientWebSocketHandler> handlers = new ArrayList<>();
        List<WebSocketSession> sessions = new ArrayList<>();

        for (int i = 0; i < clientCount; i++) {
            ClientWebSocketHandler handler = new ClientWebSocketHandler();
            WebSocketSession session = connect(handler);
            handlers.add(handler);
            sessions.add(session);
            session.sendMessage(new TextMessage("{\"type\":\"JOIN\",\"roomCode\":\"" + roomCode + "\",\"username\":\"User" + i + "\"}"));
        }

        // Drain join messages for all
        for (ClientWebSocketHandler h : handlers) {
            h.clearMessages();
        }

        // Send messages concurrently
        ExecutorService executor = Executors.newFixedThreadPool(clientCount);
        CountDownLatch latch = new CountDownLatch(clientCount);

        for (int i = 0; i < clientCount; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    sessions.get(index).sendMessage(new TextMessage("{\"type\":\"MESSAGE\",\"text\":\"Message from " + index + "\"}"));
                } catch (Exception e) {
                    e.printStackTrace();
                } finally {
                    latch.countDown();
                }
            });
        }

        assertTrue(latch.await(5, TimeUnit.SECONDS));
        executor.shutdown();

        // Verify each client received all 5 messages
        for (ClientWebSocketHandler h : handlers) {
            List<ServerMessage> receivedMessages = h.awaitAllMessagesOfType("MESSAGE", clientCount, 5, TimeUnit.SECONDS);
            assertEquals(clientCount, receivedMessages.size(), "Each client should receive messages from all participants");
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

        public List<ServerMessage> awaitAllMessagesOfType(String messageType, int expectedCount, long timeout, TimeUnit unit) throws InterruptedException {
            List<ServerMessage> result = new ArrayList<>();
            long deadline = System.currentTimeMillis() + unit.toMillis(timeout);
            while (result.size() < expectedCount && System.currentTimeMillis() < deadline) {
                String json = rawMessages.poll(200, TimeUnit.MILLISECONDS);
                if (json != null) {
                    try {
                        ServerMessage msg = objectMapper.readValue(json, ServerMessage.class);
                        if (msg != null && messageType.equals(msg.getType().name())) {
                            result.add(msg);
                        }
                    } catch (Exception ignored) {
                    }
                }
            }
            return result;
        }

        public void clearMessages() {
            rawMessages.clear();
        }
    }
}
