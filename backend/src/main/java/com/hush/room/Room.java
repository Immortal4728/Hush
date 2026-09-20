package com.hush.room;

import com.hush.exception.IllegalRoomStateException;
import com.hush.exception.RoomFullException;
import com.hush.participant.Participant;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

public class Room {

    private static final Pattern VALID_CODE_PATTERN = Pattern.compile("^[2-9A-HJKMNP-Z]{6}$");

    private final String roomCode;
    private final RoomType roomType;
    private final int maxParticipants;
    private final Instant createdAt;
    private final Instant expiresAt;
    private RoomState state;

    private Instant emptySince;
    private boolean expiringNotified;

    private final ConcurrentHashMap<String, Participant> participants = new ConcurrentHashMap<>();

    public Room(String roomCode, RoomType roomType, Instant createdAt, Instant expiresAt) {
        this.roomCode = validateRoomCode(roomCode);
        this.roomType = Objects.requireNonNull(roomType, "roomType must not be null");
        this.maxParticipants = roomType.getMaxParticipants();
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt must not be null");
        this.expiresAt = Objects.requireNonNull(expiresAt, "expiresAt must not be null");

        if (!expiresAt.isAfter(createdAt)) {
            throw new IllegalArgumentException("expiresAt must be after createdAt");
        }

        this.state = RoomState.ACTIVE;
        this.emptySince = null;
        this.expiringNotified = false;
    }

    private static String validateRoomCode(String code) {
        Objects.requireNonNull(code, "roomCode must not be null");
        String trimmed = code.trim();
        if (!VALID_CODE_PATTERN.matcher(trimmed).matches()) {
            throw new IllegalArgumentException("Invalid room code format: " + code);
        }
        return trimmed;
    }

    public String getRoomCode() {
        return roomCode;
    }

    public RoomType getRoomType() {
        return roomType;
    }

    public int getMaxParticipants() {
        return maxParticipants;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public synchronized RoomState getState() {
        return state;
    }

    public synchronized void setState(RoomState state) {
        this.state = Objects.requireNonNull(state, "state must not be null");
    }

    public boolean isExpired() {
        return isExpired(Instant.now());
    }

    public boolean isExpired(Instant now) {
        return !now.isBefore(expiresAt);
    }

    public synchronized Instant getEmptySince() {
        return emptySince;
    }

    public synchronized boolean isExpiringNotified() {
        return expiringNotified;
    }

    public synchronized void setExpiringNotified(boolean expiringNotified) {
        this.expiringNotified = expiringNotified;
    }

    /**
     * Atomically marks the room as DESTROYED.
     * @return true if the state was transitioned to DESTROYED; false if already DESTROYED.
     */
    public synchronized boolean markDestroyed() {
        if (this.state == RoomState.DESTROYED) {
            return false;
        }
        this.state = RoomState.DESTROYED;
        return true;
    }

    // --- Participant Management (Atomic per-room) ---

    public int getParticipantCount() {
        return participants.size();
    }

    public boolean isFull() {
        return participants.size() >= maxParticipants;
    }

    /**
     * Atomically admits a new participant to this room.
     * Enforces capacity bounds and single-host assignment safely under concurrent calls.
     */
    public synchronized Participant addParticipant(String username) {
        if (isExpired()) {
            this.state = RoomState.DESTROYED;
            throw new IllegalRoomStateException("Room " + roomCode + " has expired.");
        }
        if (state == RoomState.DESTROYED) {
            throw new IllegalRoomStateException("Room is destroyed. Current state: " + state);
        }
        if (isFull()) {
            throw new RoomFullException("Room " + roomCode + " is full. Max capacity: " + maxParticipants);
        }

        boolean isHost = participants.isEmpty();
        String pId;
        int attempts = 0;
        do {
            pId = UUID.randomUUID().toString();
            attempts++;
            if (attempts > 50) {
                throw new IllegalStateException("Failed to generate unique participant ID");
            }
        } while (participants.containsKey(pId));

        Participant participant = new Participant(pId, username, Instant.now(), isHost);
        participants.put(pId, participant);

        this.emptySince = null;
        this.state = RoomState.ACTIVE;
        return participant;
    }

    public synchronized Optional<Participant> removeParticipant(String participantId) {
        if (participantId == null || participantId.isBlank()) {
            return Optional.empty();
        }
        Participant removed = participants.remove(participantId.trim());
        if (removed != null && participants.isEmpty() && this.state != RoomState.DESTROYED) {
            this.emptySince = Instant.now();
            this.state = RoomState.EMPTY;
        }
        return Optional.ofNullable(removed);
    }

    public synchronized void clearParticipants() {
        participants.clear();
    }

    public Optional<Participant> findParticipant(String participantId) {
        if (participantId == null || participantId.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(participants.get(participantId.trim()));
    }

    public Collection<Participant> getParticipants() {
        return List.copyOf(participants.values());
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Room room = (Room) o;
        return Objects.equals(roomCode, room.roomCode);
    }

    @Override
    public int hashCode() {
        return Objects.hash(roomCode);
    }
}
