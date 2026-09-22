package com.hush.admin.api.dto;

import com.hush.room.RoomType;
import java.time.Instant;
import java.util.List;

public record AdminRoomDto(
    String roomCode,
    RoomType type,
    int participantCount,
    int maxParticipants,
    Instant createdAt,
    Instant expiresAt,
    long remainingSeconds,
    String status,
    boolean expiringSoon,
    List<ParticipantMeta> participants
) {
    public record ParticipantMeta(
        String participantId,
        boolean isHost,
        Instant joinedAt
    ) {}
}
