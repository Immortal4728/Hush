package com.hush.room.api.dto;

import com.hush.room.Room;
import com.hush.room.RoomState;
import com.hush.room.RoomType;

import java.time.Instant;

public record RoomStatusResponse(
    boolean exists,
    String roomCode,
    RoomType type,
    int maxParticipants,
    int participantCount,
    Instant expiresAt,
    RoomState state
) {
    public static RoomStatusResponse fromDomain(Room room) {
        return new RoomStatusResponse(
            true,
            room.getRoomCode(),
            room.getRoomType(),
            room.getMaxParticipants(),
            room.getParticipantCount(),
            room.getExpiresAt(),
            room.getState()
        );
    }
}
