package com.hush.participant;

import com.hush.exception.InvalidParticipantException;

import java.time.Instant;
import java.util.Objects;

public class Participant {

    private final String participantId;
    private final String username;
    private final Instant joinedAt;
    private final boolean host;

    public Participant(String participantId, String username, Instant joinedAt, boolean host) {
        if (participantId == null || participantId.isBlank()) {
            throw new InvalidParticipantException("participantId must not be null or blank");
        }
        if (username == null || username.isBlank()) {
            throw new InvalidParticipantException("username must not be null or blank");
        }
        String trimmedUsername = username.trim();
        if (trimmedUsername.length() > 32) {
            throw new InvalidParticipantException("username must not exceed 32 characters");
        }
        if (joinedAt == null) {
            throw new InvalidParticipantException("joinedAt must not be null");
        }

        this.participantId = participantId.trim();
        this.username = trimmedUsername;
        this.joinedAt = joinedAt;
        this.host = host;
    }

    public String getParticipantId() {
        return participantId;
    }

    public String getUsername() {
        return username;
    }

    public Instant getJoinedAt() {
        return joinedAt;
    }

    public boolean isHost() {
        return host;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Participant that = (Participant) o;
        return Objects.equals(participantId, that.participantId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(participantId);
    }
}
