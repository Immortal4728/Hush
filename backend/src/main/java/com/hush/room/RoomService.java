package com.hush.room;

import com.hush.exception.RoomNotFoundException;
import com.hush.participant.Participant;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RoomService {

    private static final int MAX_COLLISION_RETRIES = 100;

    private final ConcurrentHashMap<String, Room> activeRooms = new ConcurrentHashMap<>();
    private final CodeGenerator codeGenerator;

    public RoomService(CodeGenerator codeGenerator) {
        this.codeGenerator = Objects.requireNonNull(codeGenerator, "codeGenerator must not be null");
    }

    public Room createRoom(RoomType roomType, Duration ttl) {
        Objects.requireNonNull(roomType, "roomType must not be null");
        Objects.requireNonNull(ttl, "ttl must not be null");

        if (ttl.isZero() || ttl.isNegative() || ttl.compareTo(Duration.ofMinutes(1440)) > 0) {
            throw new IllegalArgumentException("ttl must be positive and at most 24 hours (1440 minutes)");
        }

        int attempts = 0;
        while (attempts < MAX_COLLISION_RETRIES) {
            String candidateCode = codeGenerator.generateCode();
            Instant createdAt = Instant.now();
            Instant expiresAt = createdAt.plus(ttl);

            Room room = new Room(candidateCode, roomType, createdAt, expiresAt);

            if (activeRooms.putIfAbsent(candidateCode, room) == null) {
                return room;
            }
            attempts++;
        }

        throw new IllegalStateException("Failed to generate a unique room code after " + MAX_COLLISION_RETRIES + " attempts");
    }

    public Room extendRoom(String roomCode, Duration additionalDuration) {
        String normalized = normalizeCode(roomCode);
        if (normalized == null) {
            throw new RoomNotFoundException("Room code must not be null or blank");
        }
        Room room = activeRooms.get(normalized);
        if (room == null) {
            throw new RoomNotFoundException("Room not found: " + roomCode);
        }
        room.extendExpiration(additionalDuration);
        return room;
    }

    public Optional<Room> findRoom(String roomCode) {
        String normalized = normalizeCode(roomCode);
        if (normalized == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(activeRooms.get(normalized));
    }

    public boolean roomExists(String roomCode) {
        String normalized = normalizeCode(roomCode);
        return normalized != null && activeRooms.containsKey(normalized);
    }

    public boolean removeRoom(String roomCode) {
        String normalized = normalizeCode(roomCode);
        if (normalized == null) {
            return false;
        }
        return activeRooms.remove(normalized) != null;
    }

    public int getActiveRoomCount() {
        return activeRooms.size();
    }

    public Collection<Room> getAllRooms() {
        return List.copyOf(activeRooms.values());
    }

    // --- Participant Operations ---

    public Participant addParticipant(String roomCode, String username) {
        String normalized = normalizeCode(roomCode);
        if (normalized == null) {
            throw new RoomNotFoundException("Room code must not be null or blank");
        }

        Room room = activeRooms.get(normalized);
        if (room == null) {
            throw new RoomNotFoundException("Room not found: " + roomCode);
        }

        return room.addParticipant(username);
    }

    public Optional<Participant> removeParticipant(String roomCode, String participantId) {
        String normalized = normalizeCode(roomCode);
        if (normalized == null) {
            return Optional.empty();
        }
        Room room = activeRooms.get(normalized);
        if (room == null) {
            return Optional.empty();
        }
        return room.removeParticipant(participantId);
    }

    public Optional<Participant> findParticipant(String roomCode, String participantId) {
        String normalized = normalizeCode(roomCode);
        if (normalized == null) {
            return Optional.empty();
        }
        Room room = activeRooms.get(normalized);
        if (room == null) {
            return Optional.empty();
        }
        return room.findParticipant(participantId);
    }

    public Collection<Participant> getParticipants(String roomCode) {
        String normalized = normalizeCode(roomCode);
        if (normalized == null) {
            return List.of();
        }
        Room room = activeRooms.get(normalized);
        if (room == null) {
            return List.of();
        }
        return room.getParticipants();
    }

    private String normalizeCode(String roomCode) {
        if (roomCode == null || roomCode.isBlank()) {
            return null;
        }
        return roomCode.trim().toUpperCase();
    }
}
