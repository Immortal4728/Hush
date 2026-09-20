package com.hush.room.api.dto;

import com.hush.room.Room;
import com.hush.room.RoomState;
import com.hush.room.RoomType;

import java.time.Instant;

public record CreateRoomResponse(
    String roomCode,
    RoomType type,
    int maxParticipants,
    Instant createdAt,
    Instant expiresAt,
    RoomState state
) {
    public static CreateRoomResponse fromDomain(Room room) {
        return new CreateRoomResponse(
            room.getRoomCode(),
            room.getRoomType(),
            room.getMaxParticipants(),
            room.getCreatedAt(),
            room.getExpiresAt(),
            room.getState()
        );
    }
}
