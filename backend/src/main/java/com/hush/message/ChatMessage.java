package com.hush.message;

import java.time.Instant;
import java.util.Objects;

public class ChatMessage {

    private final String messageId;
    private final String senderId;
    private final String senderName;
    private final String text;
    private final Instant timestamp;

    public ChatMessage(String messageId, String senderId, String senderName, String text, Instant timestamp) {
        if (messageId == null || messageId.isBlank()) {
            throw new IllegalArgumentException("messageId must not be null or blank");
        }
        if (senderId == null || senderId.isBlank()) {
            throw new IllegalArgumentException("senderId must not be null or blank");
        }
        if (senderName == null || senderName.isBlank()) {
            throw new IllegalArgumentException("senderName must not be null or blank");
        }
        if (text == null || text.isBlank()) {
            throw new IllegalArgumentException("text must not be null or blank");
        }
        if (text.length() > 2000) {
            throw new IllegalArgumentException("text must not exceed 2000 characters");
        }
        if (timestamp == null) {
            throw new IllegalArgumentException("timestamp must not be null");
        }

        this.messageId = messageId.trim();
        this.senderId = senderId.trim();
        this.senderName = senderName.trim();
        this.text = text;
        this.timestamp = timestamp;
    }

    public String getMessageId() {
        return messageId;
    }

    public String getSenderId() {
        return senderId;
    }

    public String getSenderName() {
        return senderName;
    }

    public String getText() {
        return text;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ChatMessage that = (ChatMessage) o;
        return Objects.equals(messageId, that.messageId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(messageId);
    }
}
