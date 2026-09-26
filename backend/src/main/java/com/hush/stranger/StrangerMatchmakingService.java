package com.hush.stranger;

import com.hush.room.Room;
import com.hush.room.RoomService;
import com.hush.room.RoomType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

@Service
public class StrangerMatchmakingService {

    private static final Logger logger = LoggerFactory.getLogger(StrangerMatchmakingService.class);
    private static final Duration TICKET_TIMEOUT = Duration.ofSeconds(45);

    private final RoomService roomService;

    private final ConcurrentHashMap<String, MatchTicket> tickets = new ConcurrentHashMap<>();
    private final ConcurrentLinkedQueue<MatchTicket> waitingQueue = new ConcurrentLinkedQueue<>();

    public StrangerMatchmakingService(RoomService roomService) {
        this.roomService = Objects.requireNonNull(roomService, "roomService must not be null");
    }

    public static class MatchTicket {
        private final String ticketId;
        private final Instant createdAt;
        private volatile String status; // "WAITING", "MATCHED", "CANCELLED", "EXPIRED"
        private volatile String roomCode;
        private volatile String username;

        public MatchTicket(String ticketId, Instant createdAt, String status, String roomCode, String username) {
            this.ticketId = ticketId;
            this.createdAt = createdAt;
            this.status = status;
            this.roomCode = roomCode;
            this.username = username;
        }

        public String getTicketId() {
            return ticketId;
        }

        public Instant getCreatedAt() {
            return createdAt;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public String getRoomCode() {
            return roomCode;
        }

        public void setRoomCode(String roomCode) {
            this.roomCode = roomCode;
        }

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public boolean isExpired() {
            return Instant.now().isAfter(createdAt.plus(TICKET_TIMEOUT));
        }
    }

    /**
     * Atomically requests a match or joins the waiting queue.
     */
    public synchronized MatchTicket requestMatch() {
        Instant now = Instant.now();

        // Check if a valid peer is waiting in queue
        while (!waitingQueue.isEmpty()) {
            MatchTicket peerTicket = waitingQueue.poll();

            if (peerTicket != null && "WAITING".equals(peerTicket.getStatus()) && !peerTicket.isExpired()) {
                // Match found! Create a HUSH DIRECT room
                Room room = roomService.createRoom(RoomType.DIRECT, Duration.ofMinutes(60));
                String roomCode = room.getRoomCode();

                // Update peer ticket
                peerTicket.setRoomCode(roomCode);
                peerTicket.setUsername("Stranger 1");
                peerTicket.setStatus("MATCHED");

                // Create current user ticket
                String myTicketId = UUID.randomUUID().toString();
                MatchTicket myTicket = new MatchTicket(myTicketId, now, "MATCHED", roomCode, "Stranger 2");

                tickets.put(myTicketId, myTicket);
                tickets.put(peerTicket.getTicketId(), peerTicket);

                logger.info("[MATCHMAKING] Matched ticket {} and ticket {} in DIRECT room {}",
                        myTicketId, peerTicket.getTicketId(), roomCode);

                return myTicket;
            }
        }

        // No peer available -> enqueue current user
        String myTicketId = UUID.randomUUID().toString();
        MatchTicket myTicket = new MatchTicket(myTicketId, now, "WAITING", null, "Anonymous");

        tickets.put(myTicketId, myTicket);
        waitingQueue.add(myTicket);

        logger.info("[MATCHMAKING] Enqueued ticket {}. Current queue size: {}", myTicketId, waitingQueue.size());
        return myTicket;
    }

    /**
     * Cancels an active waiting match request.
     */
    public boolean cancelMatch(String ticketId) {
        if (ticketId == null || ticketId.isBlank()) {
            return false;
        }
        MatchTicket ticket = tickets.get(ticketId);
        if (ticket != null && "WAITING".equals(ticket.getStatus())) {
            ticket.setStatus("CANCELLED");
            waitingQueue.remove(ticket);
            logger.info("[MATCHMAKING] Ticket {} cancelled", ticketId);
            return true;
        }
        return false;
    }

    /**
     * Gets status of a match ticket, transitioning to EXPIRED if timed out.
     */
    public Optional<MatchTicket> getTicketStatus(String ticketId) {
        if (ticketId == null || ticketId.isBlank()) {
            return Optional.empty();
        }
        MatchTicket ticket = tickets.get(ticketId);
        if (ticket != null) {
            if ("WAITING".equals(ticket.getStatus()) && ticket.isExpired()) {
                ticket.setStatus("EXPIRED");
                waitingQueue.remove(ticket);
            }
            return Optional.of(ticket);
        }
        return Optional.empty();
    }

    /**
     * Returns the count of anonymous users currently waiting for matchmaking.
     */
    public int getLookingCount() {
        int count = 0;
        for (MatchTicket ticket : waitingQueue) {
            if ("WAITING".equals(ticket.getStatus()) && !ticket.isExpired()) {
                count++;
            }
        }
        return count;
    }

    /**
     * Periodic cleanup of expired match tickets.
     */
    @Scheduled(fixedDelay = 5000)
    public void cleanupStaleTickets() {
        Instant cutoff = Instant.now().minus(TICKET_TIMEOUT.plusSeconds(30));
        tickets.entrySet().removeIf(entry -> entry.getValue().getCreatedAt().isBefore(cutoff));
        waitingQueue.removeIf(ticket -> "CANCELLED".equals(ticket.getStatus()) || "EXPIRED".equals(ticket.getStatus()) || ticket.isExpired());
    }
}
