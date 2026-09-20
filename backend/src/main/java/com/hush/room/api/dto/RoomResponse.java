package com.hush.room.api.dto;

import com.hush.room.Room;
import com.hush.room.RoomState;
import com.hush.room.RoomType;

import java.time.Instant;

public record RoomResponse(
    String roomCode,
    RoomType type,
    int maxParticipants,
    int participantCount,
    RoomState state,
    Instant createdAt,
    Instant expiresAt
) {
    public static RoomResponse fromDomain(Room room) {
        return new RoomResponse(
            room.getRoomCode(),
            room.getRoomType(),
            room.getMaxParticipants(),
            room.getParticipantCount(),
            room.getState(),
            room.getCreatedAt(),
            room.getExpiresAt()
        );
    }
}
