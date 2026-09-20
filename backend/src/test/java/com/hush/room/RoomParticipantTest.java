package com.hush.room;

import com.hush.exception.IllegalRoomStateException;
import com.hush.exception.RoomFullException;
import com.hush.participant.Participant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class RoomParticipantTest {

    @Test
    @DisplayName("Empty room has participantCount 0 and isFull false")
    void testEmptyRoom() {
        Room room = new Room("K7M4Q2", RoomType.DIRECT, Instant.now(), Instant.now().plusSeconds(3600));

        assertEquals(0, room.getParticipantCount());
        assertFalse(room.isFull());
        assertTrue(room.getParticipants().isEmpty());
    }

    @Test
    @DisplayName("DIRECT room capacity 2 becomes full after 2 additions")
    void testDirectRoomCapacity() {
        Room room = new Room("K7M4Q2", RoomType.DIRECT, Instant.now(), Instant.now().plusSeconds(3600));

        room.addParticipant("Conan");
        assertFalse(room.isFull());
        assertEquals(1, room.getParticipantCount());

        room.addParticipant("Alex");
        assertTrue(room.isFull());
        assertEquals(2, room.getParticipantCount());
    }

    @Test
    @DisplayName("GROUP room capacity 20 becomes full after 20 additions")
    void testGroupRoomCapacity() {
        Room room = new Room("K7M4Q2", RoomType.GROUP, Instant.now(), Instant.now().plusSeconds(3600));

        for (int i = 1; i <= 20; i++) {
            room.addParticipant("User" + i);
        }

        assertTrue(room.isFull());
        assertEquals(20, room.getParticipantCount());
    }

    @Test
    @DisplayName("Exceeding capacity throws RoomFullException")
    void testCapacityRejection() {
        Room directRoom = new Room("K7M4Q2", RoomType.DIRECT, Instant.now(), Instant.now().plusSeconds(3600));
        directRoom.addParticipant("User1");
        directRoom.addParticipant("User2");

        assertThrows(RoomFullException.class, () -> directRoom.addParticipant("User3"));

        Room groupRoom = new Room("Z9Y8X7", RoomType.GROUP, Instant.now(), Instant.now().plusSeconds(3600));
        for (int i = 1; i <= 20; i++) {
            groupRoom.addParticipant("User" + i);
        }

        assertThrows(RoomFullException.class, () -> groupRoom.addParticipant("User21"));
    }

    @Test
    @DisplayName("Host status is assigned to first participant only")
    void testHostAssignment() {
        Room room = new Room("K7M4Q2", RoomType.DIRECT, Instant.now(), Instant.now().plusSeconds(3600));

        Participant p1 = room.addParticipant("Conan");
        Participant p2 = room.addParticipant("Alex");

        assertTrue(p1.isHost(), "First participant must be host");
        assertFalse(p2.isHost(), "Second participant must not be host");
    }

    @Test
    @DisplayName("Removing participant decreases count and removes target participant")
    void testParticipantRemoval() {
        Room room = new Room("K7M4Q2", RoomType.DIRECT, Instant.now(), Instant.now().plusSeconds(3600));

        Participant p1 = room.addParticipant("Conan");
        Participant p2 = room.addParticipant("Alex");

        assertEquals(2, room.getParticipantCount());

        Optional<Participant> removed = room.removeParticipant(p1.getParticipantId());
        assertTrue(removed.isPresent());
        assertEquals(p1, removed.get());

        assertEquals(1, room.getParticipantCount());
        assertTrue(room.findParticipant(p1.getParticipantId()).isEmpty());
        assertTrue(room.findParticipant(p2.getParticipantId()).isPresent());

        // Nonexistent removal
        assertTrue(room.removeParticipant("non-existent-id").isEmpty());
    }

    @Test
    @DisplayName("Adding participant to non-ACTIVE room throws IllegalRoomStateException")
    void testNonActiveRoomAdditionRejected() {
        Room room = new Room("K7M4Q2", RoomType.DIRECT, Instant.now(), Instant.now().plusSeconds(3600));
        room.setState(RoomState.DESTROYED);

        assertThrows(IllegalRoomStateException.class, () -> room.addParticipant("Conan"));
    }
}
