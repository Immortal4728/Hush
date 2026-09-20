package com.hush.room.api.dto;

import com.hush.participant.Participant;

import java.time.Instant;

public record ParticipantResponse(
    String participantId,
    String username,
    Instant joinedAt,
    boolean host
) {
    public static ParticipantResponse fromDomain(Participant participant) {
        return new ParticipantResponse(
            participant.getParticipantId(),
            participant.getUsername(),
            participant.getJoinedAt(),
            participant.isHost()
        );
    }
}
