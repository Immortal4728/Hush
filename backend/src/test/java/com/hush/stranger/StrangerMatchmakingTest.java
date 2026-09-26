package com.hush.stranger;

import com.hush.config.HushRoomProperties;
import com.hush.room.CodeGenerator;
import com.hush.room.Room;
import com.hush.room.RoomService;
import com.hush.room.RoomType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

class StrangerMatchmakingTest {

    private RoomService roomService;
    private StrangerMatchmakingService matchmakingService;

    @BeforeEach
    void setUp() {
        CodeGenerator codeGenerator = new CodeGenerator();
        HushRoomProperties roomProperties = new HushRoomProperties();
        roomService = new RoomService(codeGenerator, roomProperties);
        matchmakingService = new StrangerMatchmakingService(roomService);
    }

    @Test
    @DisplayName("First user entering queue receives WAITING status")
    void testFirstUserEntersQueue() {
        StrangerMatchmakingService.MatchTicket ticket = matchmakingService.requestMatch();

        assertNotNull(ticket);
        assertNotNull(ticket.getTicketId());
        assertEquals("WAITING", ticket.getStatus());
        assertNull(ticket.getRoomCode());
        assertEquals(1, matchmakingService.getLookingCount());
    }

    @Test
    @DisplayName("Second user entering queue triggers match and creates a Direct Room")
    void testSecondUserTriggersMatch() {
        StrangerMatchmakingService.MatchTicket user1 = matchmakingService.requestMatch();
        assertEquals("WAITING", user1.getStatus());

        StrangerMatchmakingService.MatchTicket user2 = matchmakingService.requestMatch();

        assertEquals("MATCHED", user2.getStatus());
        assertNotNull(user2.getRoomCode());

        // Verify user1 status updated to MATCHED
        Optional<StrangerMatchmakingService.MatchTicket> user1Updated = matchmakingService.getTicketStatus(user1.getTicketId());
        assertTrue(user1Updated.isPresent());
        assertEquals("MATCHED", user1Updated.get().getStatus());
        assertEquals(user2.getRoomCode(), user1Updated.get().getRoomCode());

        // Queue should now be empty
        assertEquals(0, matchmakingService.getLookingCount());

        // Verify Direct Room properties
        Optional<Room> roomOpt = roomService.findRoom(user2.getRoomCode());
        assertTrue(roomOpt.isPresent());
        Room room = roomOpt.get();
        assertEquals(RoomType.DIRECT, room.getRoomType());
        assertEquals(2, room.getMaxParticipants());
    }

    @Test
    @DisplayName("Cancellation removes user from queue")
    void testCancelMatch() {
        StrangerMatchmakingService.MatchTicket user1 = matchmakingService.requestMatch();
        assertEquals(1, matchmakingService.getLookingCount());

        boolean cancelled = matchmakingService.cancelMatch(user1.getTicketId());
        assertTrue(cancelled);

        assertEquals(0, matchmakingService.getLookingCount());
        Optional<StrangerMatchmakingService.MatchTicket> status = matchmakingService.getTicketStatus(user1.getTicketId());
        assertTrue(status.isPresent());
        assertEquals("CANCELLED", status.get().getStatus());
    }

    @Test
    @DisplayName("Cancelled user is skipped when next user searches")
    void testCancelledUserIsSkipped() {
        StrangerMatchmakingService.MatchTicket user1 = matchmakingService.requestMatch();
        matchmakingService.cancelMatch(user1.getTicketId());

        StrangerMatchmakingService.MatchTicket user2 = matchmakingService.requestMatch();
        // User 2 should be WAITING because User 1 was cancelled
        assertEquals("WAITING", user2.getStatus());
        assertEquals(1, matchmakingService.getLookingCount());
    }

    @Test
    @DisplayName("Simultaneous matchmaking requests execute atomically with no double matches")
    void testSimultaneousMatchmakingRequests() throws Exception {
        int userCount = 20;
        ExecutorService executor = Executors.newFixedThreadPool(10);
        CountDownLatch latch = new CountDownLatch(1);
        List<Future<StrangerMatchmakingService.MatchTicket>> futures = new ArrayList<>();

        for (int i = 0; i < userCount; i++) {
            futures.add(executor.submit(() -> {
                latch.await();
                return matchmakingService.requestMatch();
            }));
        }

        latch.countDown();
        executor.shutdown();
        assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));

        List<StrangerMatchmakingService.MatchTicket> results = new ArrayList<>();
        for (Future<StrangerMatchmakingService.MatchTicket> future : futures) {
            results.add(future.get());
        }

        // 20 users should produce exactly 10 pairs matched in 10 unique rooms
        long matchedCount = results.stream().filter(t -> "MATCHED".equals(t.getStatus())).count();
        assertEquals(20, matchedCount);

        long uniqueRooms = results.stream().map(StrangerMatchmakingService.MatchTicket::getRoomCode).distinct().count();
        assertEquals(10, uniqueRooms);
        assertEquals(0, matchmakingService.getLookingCount());
    }

    @Test
    @DisplayName("NEXT STRANGER flow creates successive matches")
    void testNextStrangerFlow() {
        // Pair 1
        StrangerMatchmakingService.MatchTicket u1 = matchmakingService.requestMatch();
        StrangerMatchmakingService.MatchTicket u2 = matchmakingService.requestMatch();
        assertEquals("MATCHED", u2.getStatus());
        String firstRoom = u2.getRoomCode();

        // User 1 clicks NEXT STRANGER -> requests new match
        StrangerMatchmakingService.MatchTicket u1Next = matchmakingService.requestMatch();
        assertEquals("WAITING", u1Next.getStatus());

        // User 3 arrives
        StrangerMatchmakingService.MatchTicket u3 = matchmakingService.requestMatch();
        assertEquals("MATCHED", u3.getStatus());
        assertNotEquals(firstRoom, u3.getRoomCode());
    }
}
