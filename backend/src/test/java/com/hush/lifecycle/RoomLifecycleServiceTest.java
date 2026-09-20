package com.hush.lifecycle;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hush.config.HushLifecycleProperties;
import com.hush.participant.Participant;
import com.hush.room.CodeGenerator;
import com.hush.room.Room;
import com.hush.room.RoomService;
import com.hush.room.RoomState;
import com.hush.room.RoomType;
import com.hush.websocket.WebSocketSessionRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.*;

public class RoomLifecycleServiceTest {

    private RoomService roomService;
    private WebSocketSessionRegistry sessionRegistry;
    private ObjectMapper objectMapper;
    private HushLifecycleProperties properties;
    private RoomLifecycleService lifecycleService;

    @BeforeEach
    void setUp() {
        CodeGenerator codeGenerator = new CodeGenerator();
        roomService = new RoomService(codeGenerator);
        sessionRegistry = new WebSocketSessionRegistry();
        objectMapper = new ObjectMapper();
        properties = new HushLifecycleProperties();
        properties.setCheckIntervalMs(1000);
        properties.setExpiringWarningThresholdSeconds(60);
        properties.setEmptyRoomGracePeriodSeconds(5);

        lifecycleService = new RoomLifecycleService(roomService, sessionRegistry, objectMapper, properties);
    }

    @Test
    void testActiveRoomSurvival() {
        Room room = roomService.createRoom(RoomType.GROUP, Duration.ofMinutes(60));
        roomService.addParticipant(room.getRoomCode(), "Alice");

        lifecycleService.processExpirations();

        assertTrue(roomService.roomExists(room.getRoomCode()));
        assertEquals(RoomState.ACTIVE, room.getState());
    }

    @Test
    void testTtlExpirationDestruction() {
        // Create room expiring in 1 millisecond
        Room room = roomService.createRoom(RoomType.GROUP, Duration.ofMillis(1));
        
        // Wait 10ms for expiration
        try {
            Thread.sleep(10);
        } catch (InterruptedException ignored) {
        }

        lifecycleService.processExpirations();

        assertFalse(roomService.roomExists(room.getRoomCode()));
        assertEquals(RoomState.DESTROYED, room.getState());
    }

    @Test
    void testEmptyRoomGracePeriodExpiration() throws Exception {
        Room room = roomService.createRoom(RoomType.GROUP, Duration.ofMinutes(60));
        Participant p = roomService.addParticipant(room.getRoomCode(), "Alice");
        
        // Alice leaves -> room becomes empty
        roomService.removeParticipant(room.getRoomCode(), p.getParticipantId());
        assertEquals(RoomState.EMPTY, room.getState());
        assertNotNull(room.getEmptySince());

        // Process immediately (grace period is 5s) -> should survive
        lifecycleService.processExpirations();
        assertTrue(roomService.roomExists(room.getRoomCode()));

        // Wait 6 seconds to exceed grace period
        Thread.sleep(6000);

        lifecycleService.processExpirations();
        assertFalse(roomService.roomExists(room.getRoomCode()));
    }

    @Test
    void testEmptyRoomRejoinedBeforeGracePeriodExpiration() throws Exception {
        Room room = roomService.createRoom(RoomType.GROUP, Duration.ofMinutes(60));
        Participant p = roomService.addParticipant(room.getRoomCode(), "Alice");
        
        // Alice leaves
        roomService.removeParticipant(room.getRoomCode(), p.getParticipantId());
        assertEquals(RoomState.EMPTY, room.getState());

        // Bob joins before grace period expires
        roomService.addParticipant(room.getRoomCode(), "Bob");
        assertEquals(RoomState.ACTIVE, room.getState());
        assertNull(room.getEmptySince());

        lifecycleService.processExpirations();
        assertTrue(roomService.roomExists(room.getRoomCode()));
    }

    @Test
    void testIdempotentDestruction() {
        Room room = roomService.createRoom(RoomType.DIRECT, Duration.ofMinutes(10));
        String code = room.getRoomCode();

        boolean firstCall = lifecycleService.destroyRoom(code, "MANUAL_TEST");
        assertTrue(firstCall);
        assertFalse(roomService.roomExists(code));
        assertEquals(RoomState.DESTROYED, room.getState());

        boolean secondCall = lifecycleService.destroyRoom(code, "MANUAL_TEST");
        assertFalse(secondCall);
    }

    @Test
    void testExpiringWarningNotification() {
        // Room expires in 30 seconds (warning threshold is 60s)
        Room room = roomService.createRoom(RoomType.GROUP, Duration.ofSeconds(30));
        assertFalse(room.isExpiringNotified());

        lifecycleService.processExpirations();

        assertTrue(room.isExpiringNotified());
        // Room is warned but still active
        assertTrue(roomService.roomExists(room.getRoomCode()));
        assertEquals(RoomState.ACTIVE, room.getState());
    }

    @Test
    void testMultipleRoomsIndependentExpirations() throws Exception {
        // Room 1: Active
        Room r1 = roomService.createRoom(RoomType.GROUP, Duration.ofMinutes(60));
        roomService.addParticipant(r1.getRoomCode(), "User1");

        // Room 2: Expired TTL
        Room r2 = roomService.createRoom(RoomType.GROUP, Duration.ofMillis(1));

        // Room 3: Empty exceeding grace period
        Room r3 = roomService.createRoom(RoomType.GROUP, Duration.ofMinutes(60));
        Participant p3 = roomService.addParticipant(r3.getRoomCode(), "User3");
        roomService.removeParticipant(r3.getRoomCode(), p3.getParticipantId());

        Thread.sleep(5500);

        lifecycleService.processExpirations();

        assertTrue(roomService.roomExists(r1.getRoomCode()), "Room 1 should remain active");
        assertFalse(roomService.roomExists(r2.getRoomCode()), "Room 2 should be expired and removed");
        assertFalse(roomService.roomExists(r3.getRoomCode()), "Room 3 empty grace period should trigger removal");
    }
}
