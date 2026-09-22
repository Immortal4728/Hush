package com.hush.room;

import com.hush.message.ChatMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RoomMessageHistoryTest {

    private Room room;

    @BeforeEach
    void setUp() {
        room = new Room("UFHNN5", RoomType.GROUP, Instant.now(), Instant.now().plus(Duration.ofHours(1)));
    }

    @Test
    @DisplayName("Should store messages in-memory for active room")
    void testStoreMessagesInRoom() {
        ChatMessage msg1 = new ChatMessage("msg-1", "user-1", "Alice", "Hello World", Instant.now());
        ChatMessage msg2 = new ChatMessage("msg-2", "user-2", "Bob", "Hi Alice", Instant.now());

        room.addMessage(msg1);
        room.addMessage(msg2);

        List<ChatMessage> history = room.getMessages();
        assertEquals(2, history.size());
        assertEquals("msg-1", history.get(0).getMessageId());
        assertEquals("msg-2", history.get(1).getMessageId());
    }

    @Test
    @DisplayName("Should enforce per-room message capacity limit (500 max)")
    void testMessageLimitFifo() {
        for (int i = 0; i < 550; i++) {
            room.addMessage(new ChatMessage("msg-" + i, "user-1", "Alice", "Message " + i, Instant.now()));
        }

        List<ChatMessage> history = room.getMessages();
        assertEquals(500, history.size());
        assertEquals("msg-50", history.get(0).getMessageId(), "Oldest 50 messages should be evicted");
        assertEquals("msg-549", history.get(499).getMessageId());
    }

    @Test
    @DisplayName("Should clear message history when room is destroyed")
    void testClearMessagesOnDestroy() {
        room.addMessage(new ChatMessage("msg-1", "user-1", "Alice", "Hello", Instant.now()));
        assertEquals(1, room.getMessages().size());

        assertTrue(room.markDestroyed());
        assertEquals(0, room.getMessages().size(), "Messages must be cleared on destruction");
    }

    @Test
    @DisplayName("Newly created room has empty message history")
    void testNewRoomHasNoMessages() {
        Room newRoom = new Room("K7M4Q2", RoomType.DIRECT, Instant.now(), Instant.now().plus(Duration.ofHours(1)));
        assertTrue(newRoom.getMessages().isEmpty());
    }
}
