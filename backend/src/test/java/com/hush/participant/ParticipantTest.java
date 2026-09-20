package com.hush.participant;

import com.hush.exception.InvalidParticipantException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class ParticipantTest {

    @Test
    @DisplayName("Valid participant is constructed correctly")
    void testValidParticipant() {
        Instant now = Instant.now();
        Participant p = new Participant("p-101", "Alex", now, true);

        assertEquals("p-101", p.getParticipantId());
        assertEquals("Alex", p.getUsername());
        assertEquals(now, p.getJoinedAt());
        assertTrue(p.isHost());
    }

    @Test
    @DisplayName("Null or blank participantId is rejected")
    void testInvalidParticipantId() {
        Instant now = Instant.now();
        assertThrows(InvalidParticipantException.class, () -> new Participant(null, "Alex", now, true));
        assertThrows(InvalidParticipantException.class, () -> new Participant("   ", "Alex", now, true));
    }

    @Test
    @DisplayName("Null, blank, or long usernames (> 32 chars) are rejected")
    void testInvalidUsername() {
        Instant now = Instant.now();
        assertThrows(InvalidParticipantException.class, () -> new Participant("p-1", null, now, true));
        assertThrows(InvalidParticipantException.class, () -> new Participant("p-1", "   ", now, true));

        String longUsername = "a".repeat(33);
        assertThrows(InvalidParticipantException.class, () -> new Participant("p-1", longUsername, now, true));

        // 32 chars is valid
        String exact32Username = "a".repeat(32);
        assertDoesNotThrow(() -> new Participant("p-1", exact32Username, now, true));
    }

    @Test
    @DisplayName("Null joinedAt timestamp is rejected")
    void testNullJoinedAt() {
        assertThrows(InvalidParticipantException.class, () -> new Participant("p-1", "Alex", null, true));
    }

    @Test
    @DisplayName("Host flag is preserved accurately")
    void testHostFlagPreserved() {
        Instant now = Instant.now();
        Participant host = new Participant("p-1", "HostUser", now, true);
        Participant peer = new Participant("p-2", "PeerUser", now, false);

        assertTrue(host.isHost());
        assertFalse(peer.isHost());
    }
}
