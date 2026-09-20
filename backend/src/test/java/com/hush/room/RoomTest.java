package com.hush.room;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class RoomTest {

    @Test
    @DisplayName("Direct room creation derives capacity of 2 and state ACTIVE")
    void testDirectRoomCreation() {
        Instant now = Instant.now();
        Instant expires = now.plusSeconds(3600);

        Room room = new Room("K7M4Q2", RoomType.DIRECT, now, expires);

        assertEquals("K7M4Q2", room.getRoomCode());
        assertEquals(RoomType.DIRECT, room.getRoomType());
        assertEquals(2, room.getMaxParticipants());
        assertEquals(RoomState.ACTIVE, room.getState());
        assertEquals(now, room.getCreatedAt());
        assertEquals(expires, room.getExpiresAt());
    }

    @Test
    @DisplayName("Group room creation derives capacity of 20 and state ACTIVE")
    void testGroupRoomCreation() {
        Instant now = Instant.now();
        Instant expires = now.plusSeconds(3600);

        Room room = new Room("K7M4Q2", RoomType.GROUP, now, expires);

        assertEquals("K7M4Q2", room.getRoomCode());
        assertEquals(RoomType.GROUP, room.getRoomType());
        assertEquals(20, room.getMaxParticipants());
        assertEquals(RoomState.ACTIVE, room.getState());
    }

    @Test
    @DisplayName("Invalid expiration timestamp before or equal to creation timestamp must be rejected")
    void testInvalidExpirationRejected() {
        Instant now = Instant.now();
        Instant past = now.minusSeconds(3600);

        assertThrows(IllegalArgumentException.class, () ->
            new Room("K7M4Q2", RoomType.DIRECT, now, past)
        );

        assertThrows(IllegalArgumentException.class, () ->
            new Room("K7M4Q2", RoomType.DIRECT, now, now)
        );
    }

    @Test
    @DisplayName("Invalid room codes must be rejected")
    void testInvalidRoomCodesRejected() {
        Instant now = Instant.now();
        Instant expires = now.plusSeconds(3600);

        // Invalid length
        assertThrows(IllegalArgumentException.class, () -> new Room("ABC", RoomType.DIRECT, now, expires));
        assertThrows(IllegalArgumentException.class, () -> new Room("ABCDEFG", RoomType.DIRECT, now, expires));

        // Invalid characters
        assertThrows(IllegalArgumentException.class, () -> new Room("ABC!23", RoomType.DIRECT, now, expires));

        // Forbidden ambiguous characters (O, 1, I, L, 0)
        assertThrows(IllegalArgumentException.class, () -> new Room("OOOOOO", RoomType.DIRECT, now, expires));
        assertThrows(IllegalArgumentException.class, () -> new Room("111111", RoomType.DIRECT, now, expires));
        assertThrows(IllegalArgumentException.class, () -> new Room("IIIIII", RoomType.DIRECT, now, expires));
        assertThrows(IllegalArgumentException.class, () -> new Room("LLLLLL", RoomType.DIRECT, now, expires));
        assertThrows(IllegalArgumentException.class, () -> new Room("000000", RoomType.DIRECT, now, expires));

        // Null
        assertThrows(NullPointerException.class, () -> new Room(null, RoomType.DIRECT, now, expires));
    }

    @Test
    @DisplayName("Valid room codes using approved alphabet are accepted")
    void testValidRoomCodesAccepted() {
        Instant now = Instant.now();
        Instant expires = now.plusSeconds(3600);

        assertDoesNotThrow(() -> new Room("K7M4Q2", RoomType.DIRECT, now, expires));
        assertDoesNotThrow(() -> new Room("234567", RoomType.GROUP, now, expires));
        assertDoesNotThrow(() -> new Room("Z9Y8X7", RoomType.DIRECT, now, expires));
    }
}
