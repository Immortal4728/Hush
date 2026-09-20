package com.hush.room;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

class RoomServiceTest {

    private CodeGenerator codeGenerator;
    private RoomService roomService;

    @BeforeEach
    void setUp() {
        codeGenerator = new CodeGenerator();
        roomService = new RoomService(codeGenerator);
    }

    @Test
    @DisplayName("Test A — Create DIRECT room with capacity 2 and state ACTIVE")
    void testCreateDirectRoom() {
        Room room = roomService.createRoom(RoomType.DIRECT, Duration.ofMinutes(30));

        assertNotNull(room);
        assertTrue(roomService.roomExists(room.getRoomCode()));
        assertEquals(RoomType.DIRECT, room.getRoomType());
        assertEquals(2, room.getMaxParticipants());
        assertEquals(RoomState.ACTIVE, room.getState());
    }

    @Test
    @DisplayName("Test B — Create GROUP room with capacity 20 and state ACTIVE")
    void testCreateGroupRoom() {
        Room room = roomService.createRoom(RoomType.GROUP, Duration.ofHours(1));

        assertNotNull(room);
        assertTrue(roomService.roomExists(room.getRoomCode()));
        assertEquals(RoomType.GROUP, room.getRoomType());
        assertEquals(20, room.getMaxParticipants());
        assertEquals(RoomState.ACTIVE, room.getState());
    }

    @Test
    @DisplayName("Test C — TTL calculation matches duration")
    void testTtlCalculation() {
        Duration duration = Duration.ofMinutes(30);
        Room room = roomService.createRoom(RoomType.DIRECT, duration);

        assertTrue(room.getExpiresAt().isAfter(room.getCreatedAt()));
        long actualSeconds = Duration.between(room.getCreatedAt(), room.getExpiresAt()).getSeconds();
        assertEquals(1800, actualSeconds);
    }

    @Test
    @DisplayName("Test D — Lookup works for exact uppercase and lowercase codes")
    void testLookupNormalization() {
        Room room = roomService.createRoom(RoomType.DIRECT, Duration.ofMinutes(15));
        String code = room.getRoomCode();

        Optional<Room> uppercaseFound = roomService.findRoom(code.toUpperCase());
        Optional<Room> lowercaseFound = roomService.findRoom(code.toLowerCase());

        assertTrue(uppercaseFound.isPresent());
        assertTrue(lowercaseFound.isPresent());
        assertEquals(room, uppercaseFound.get());
        assertEquals(room, lowercaseFound.get());
    }

    @Test
    @DisplayName("Test E — Unknown room lookup returns Optional.empty()")
    void testUnknownRoomLookup() {
        Optional<Room> found = roomService.findRoom("ABCDEF");
        assertTrue(found.isEmpty());
        assertFalse(roomService.roomExists("ABCDEF"));
    }

    @Test
    @DisplayName("Test F — Room removal removes room and subsequent calls return false")
    void testRoomRemoval() {
        Room room = roomService.createRoom(RoomType.DIRECT, Duration.ofMinutes(10));
        String code = room.getRoomCode();

        assertTrue(roomService.roomExists(code));
        boolean removed = roomService.removeRoom(code);

        assertTrue(removed);
        assertFalse(roomService.roomExists(code));
        assertTrue(roomService.findRoom(code).isEmpty());

        // Removing a second time should return false
        assertFalse(roomService.removeRoom(code));
    }

    @Test
    @DisplayName("Test G — Room count changes accurately on create and remove")
    void testActiveRoomCount() {
        assertEquals(0, roomService.getActiveRoomCount());

        Room room1 = roomService.createRoom(RoomType.DIRECT, Duration.ofMinutes(10));
        assertEquals(1, roomService.getActiveRoomCount());

        Room room2 = roomService.createRoom(RoomType.GROUP, Duration.ofMinutes(10));
        assertEquals(2, roomService.getActiveRoomCount());

        roomService.removeRoom(room1.getRoomCode());
        assertEquals(1, roomService.getActiveRoomCount());

        roomService.removeRoom(room2.getRoomCode());
        assertEquals(0, roomService.getActiveRoomCount());
    }

    @Test
    @DisplayName("Test H — Invalid input parameters are rejected")
    void testInvalidInputsRejected() {
        assertThrows(NullPointerException.class, () -> roomService.createRoom(null, Duration.ofMinutes(10)));
        assertThrows(NullPointerException.class, () -> roomService.createRoom(RoomType.DIRECT, null));
        assertThrows(IllegalArgumentException.class, () -> roomService.createRoom(RoomType.DIRECT, Duration.ZERO));
        assertThrows(IllegalArgumentException.class, () -> roomService.createRoom(RoomType.DIRECT, Duration.ofMinutes(-5)));

        assertTrue(roomService.findRoom(null).isEmpty());
        assertTrue(roomService.findRoom("   ").isEmpty());
        assertFalse(roomService.roomExists(null));
        assertFalse(roomService.roomExists(""));
        assertFalse(roomService.removeRoom(null));
        assertFalse(roomService.removeRoom(" "));
    }

    @Test
    @DisplayName("Collision Test — Retry mechanism succeeds when candidate codes collide")
    void testCollisionHandlingWithStubbedGenerator() {
        // Custom CodeGenerator stub that returns "K7M4Q2" twice, then "X8P2TZ"
        CodeGenerator stubGenerator = new CodeGenerator() {
            private final String[] codes = {"K7M4Q2", "K7M4Q2", "X8P2TZ"};
            private int index = 0;

            @Override
            public String generateCode() {
                if (index < codes.length) {
                    return codes[index++];
                }
                return super.generateCode();
            }
        };

        RoomService collisionService = new RoomService(stubGenerator);

        // First creation succeeds with "K7M4Q2"
        Room room1 = collisionService.createRoom(RoomType.DIRECT, Duration.ofMinutes(10));
        assertEquals("K7M4Q2", room1.getRoomCode());

        // Second creation encounters collision on "K7M4Q2", retries, and succeeds with "X8P2TZ"
        Room room2 = collisionService.createRoom(RoomType.GROUP, Duration.ofMinutes(10));
        assertEquals("X8P2TZ", room2.getRoomCode());

        assertEquals(2, collisionService.getActiveRoomCount());
    }

    @Test
    @DisplayName("Concurrent Creation Test — 100 threads creating rooms simultaneously")
    void testConcurrentRoomCreation() throws InterruptedException, ExecutionException {
        int numThreads = 100;
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CountDownLatch latch = new CountDownLatch(1);

        List<Future<Room>> futures = new ArrayList<>();

        for (int i = 0; i < numThreads; i++) {
            futures.add(executor.submit(() -> {
                latch.await();
                return roomService.createRoom(RoomType.DIRECT, Duration.ofMinutes(30));
            }));
        }

        // Release all threads simultaneously
        latch.countDown();

        Set<String> generatedCodes = ConcurrentHashMap.newKeySet();
        for (Future<Room> future : futures) {
            Room room = future.get();
            assertNotNull(room);
            generatedCodes.add(room.getRoomCode());
        }

        executor.shutdown();
        assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));

        assertEquals(numThreads, generatedCodes.size(), "All 100 generated room codes must be distinct");
        assertEquals(numThreads, roomService.getActiveRoomCount(), "Active room count must equal 100");
    }
}
