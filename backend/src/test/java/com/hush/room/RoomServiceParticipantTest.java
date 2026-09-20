package com.hush.room;

import com.hush.exception.RoomFullException;
import com.hush.exception.RoomNotFoundException;
import com.hush.participant.Participant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@SuppressWarnings("null")
class RoomServiceParticipantTest {

    private RoomService roomService;

    @BeforeEach
    void setUp() {
        CodeGenerator codeGenerator = new CodeGenerator();
        roomService = new RoomService(codeGenerator);
    }

    @Test
    @DisplayName("RoomService addParticipant and removeParticipant working end to end")
    void testBasicParticipantOperations() {
        Room room = roomService.createRoom(RoomType.DIRECT, Duration.ofMinutes(30));
        String code = room.getRoomCode();

        Participant p1 = roomService.addParticipant(code, "Conan");
        assertNotNull(p1);
        assertTrue(p1.isHost());

        Participant p2 = roomService.addParticipant(code, "Alex");
        assertNotNull(p2);
        assertFalse(p2.isHost());

        assertEquals(2, roomService.getParticipants(code).size());

        Optional<Participant> found = roomService.findParticipant(code, p1.getParticipantId());
        assertTrue(found.isPresent());
        assertEquals("Conan", found.get().getUsername());

        Optional<Participant> removed = roomService.removeParticipant(code, p1.getParticipantId());
        assertTrue(removed.isPresent());
        assertEquals(1, roomService.getParticipants(code).size());
    }

    @Test
    @DisplayName("Adding participant to non-existent room throws RoomNotFoundException")
    void testNonExistentRoomAddition() {
        assertThrows(RoomNotFoundException.class, () -> roomService.addParticipant("UNKNOWN", "Conan"));
    }

    @Test
    @DisplayName("Concurrent Capacity Test — DIRECT room capacity is strictly bounded under 50 simultaneous joins")
    void testConcurrentDirectRoomCapacity() throws InterruptedException {
        Room room = roomService.createRoom(RoomType.DIRECT, Duration.ofMinutes(30));
        String code = room.getRoomCode();

        int threadCount = 50;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(1);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger fullExceptionCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            final int id = i;
            executor.submit(() -> {
                try {
                    latch.await();
                    roomService.addParticipant(code, "User" + id);
                    successCount.incrementAndGet();
                } catch (RoomFullException e) {
                    fullExceptionCount.incrementAndGet();
                } catch (Exception e) {
                    fail("Unexpected exception: " + e.getMessage());
                }
            });
        }

        latch.countDown();
        executor.shutdown();
        assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));

        assertEquals(2, successCount.get(), "Exactly 2 joins must succeed for DIRECT room");
        assertEquals(48, fullExceptionCount.get(), "Exactly 48 join attempts must be rejected with RoomFullException");
        assertEquals(2, room.getParticipantCount(), "Final room participant count must be exactly 2");
    }

    @Test
    @DisplayName("Concurrent Capacity Test — GROUP room capacity is strictly bounded under 100 simultaneous joins")
    void testConcurrentGroupRoomCapacity() throws InterruptedException {
        Room room = roomService.createRoom(RoomType.GROUP, Duration.ofMinutes(30));
        String code = room.getRoomCode();

        int threadCount = 100;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(1);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger fullExceptionCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            final int id = i;
            executor.submit(() -> {
                try {
                    latch.await();
                    roomService.addParticipant(code, "GroupUser" + id);
                    successCount.incrementAndGet();
                } catch (RoomFullException e) {
                    fullExceptionCount.incrementAndGet();
                } catch (Exception e) {
                    fail("Unexpected exception: " + e.getMessage());
                }
            });
        }

        latch.countDown();
        executor.shutdown();
        assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));

        assertEquals(20, successCount.get(), "Exactly 20 joins must succeed for GROUP room");
        assertEquals(80, fullExceptionCount.get(), "Exactly 80 join attempts must be rejected with RoomFullException");
        assertEquals(20, room.getParticipantCount(), "Final room participant count must be exactly 20");
    }

    @Test
    @DisplayName("Concurrent Host Assignment Test — Exactly one participant is assigned host=true under simultaneous joins")
    void testConcurrentHostAssignment() throws InterruptedException {
        Room room = roomService.createRoom(RoomType.GROUP, Duration.ofMinutes(30));
        String code = room.getRoomCode();

        int threadCount = 20;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(1);

        for (int i = 0; i < threadCount; i++) {
            final int id = i;
            executor.submit(() -> {
                try {
                    latch.await();
                    roomService.addParticipant(code, "User" + id);
                } catch (Exception ignored) {
                }
            });
        }

        latch.countDown();
        executor.shutdown();
        assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));

        long hostCount = room.getParticipants().stream().filter(Participant::isHost).count();
        assertEquals(1, hostCount, "Exactly 1 participant must have host=true");
    }

    @Test
    @DisplayName("Concurrent Joins Across Multiple Independent Rooms execute cleanly")
    void testConcurrentMultipleRooms() throws InterruptedException, ExecutionException {
        int numRooms = 5;
        List<Room> rooms = new ArrayList<>();
        for (int i = 0; i < numRooms; i++) {
            rooms.add(roomService.createRoom(RoomType.DIRECT, Duration.ofMinutes(30)));
        }

        int threadCount = 50;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(1);

        for (int i = 0; i < threadCount; i++) {
            final int id = i;
            executor.submit(() -> {
                try {
                    latch.await();
                    Room target = rooms.get(id % numRooms);
                    roomService.addParticipant(target.getRoomCode(), "User" + id);
                } catch (Exception ignored) {
                }
            });
        }

        latch.countDown();
        executor.shutdown();
        assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));

        for (Room r : rooms) {
            assertTrue(r.getParticipantCount() <= 2, "Room " + r.getRoomCode() + " capacity must not exceed 2");
        }
    }
}
