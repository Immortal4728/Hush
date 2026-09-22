package com.hush.websocket.protocol;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.Collection;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ServerMessage {

    private ServerMessageType type;
    private String participantId;
    private String roomCode;
    private String username;
    private Boolean host;

    private String messageId;
    private String senderId;
    private String senderName;
    private String text;
    private String timestamp;

    private Boolean typing;

    private Collection<ParticipantDto> participants;
    private java.util.List<ChatMessageDto> messages;

    private String event;

    private String code;
    private String message;

    private Long remainingSeconds;
    private String expiresAt;
    private String reason;

    public ServerMessage() {
    }

    public static ServerMessage joined(String participantId, String roomCode, String username, boolean host) {
        ServerMessage msg = new ServerMessage();
        msg.type = ServerMessageType.JOINED;
        msg.participantId = participantId;
        msg.roomCode = roomCode;
        msg.username = username;
        msg.host = host;
        return msg;
    }

    public static ServerMessage history(java.util.List<ChatMessageDto> messages) {
        ServerMessage msg = new ServerMessage();
        msg.type = ServerMessageType.HISTORY;
        msg.messages = messages;
        return msg;
    }

    public static ServerMessage message(String messageId, String senderId, String senderName, String text, String timestamp) {
        ServerMessage msg = new ServerMessage();
        msg.type = ServerMessageType.MESSAGE;
        msg.messageId = messageId;
        msg.senderId = senderId;
        msg.senderName = senderName;
        msg.text = text;
        msg.timestamp = timestamp;
        return msg;
    }

    public static ServerMessage typing(String participantId, String username, boolean typing) {
        ServerMessage msg = new ServerMessage();
        msg.type = ServerMessageType.TYPING;
        msg.participantId = participantId;
        msg.username = username;
        msg.typing = typing;
        return msg;
    }

    public static ServerMessage presence(Collection<ParticipantDto> participants) {
        ServerMessage msg = new ServerMessage();
        msg.type = ServerMessageType.PRESENCE;
        msg.participants = participants;
        return msg;
    }

    public static ServerMessage system(String event, String username) {
        ServerMessage msg = new ServerMessage();
        msg.type = ServerMessageType.SYSTEM;
        msg.event = event;
        msg.username = username;
        return msg;
    }

    public static ServerMessage error(String code, String messageText) {
        ServerMessage msg = new ServerMessage();
        msg.type = ServerMessageType.ERROR;
        msg.code = code;
        msg.message = messageText;
        return msg;
    }

    public static ServerMessage roomExpiring(String roomCode, long remainingSeconds, String expiresAt) {
        ServerMessage msg = new ServerMessage();
        msg.type = ServerMessageType.ROOM_EXPIRING;
        msg.roomCode = roomCode;
        msg.remainingSeconds = remainingSeconds;
        msg.expiresAt = expiresAt;
        return msg;
    }

    public static ServerMessage roomDestroyed(String roomCode, String reason) {
        ServerMessage msg = new ServerMessage();
        msg.type = ServerMessageType.ROOM_DESTROYED;
        msg.roomCode = roomCode;
        msg.reason = reason;
        return msg;
    }

    // --- DTO for Presence List ---

    public static class ParticipantDto {
        private String participantId;
        private String username;
        private boolean host;

        public ParticipantDto() {
        }

        public ParticipantDto(String participantId, String username, boolean host) {
            this.participantId = participantId;
            this.username = username;
            this.host = host;
        }

        public String getParticipantId() {
            return participantId;
        }

        public void setParticipantId(String participantId) {
            this.participantId = participantId;
        }

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public boolean isHost() {
            return host;
        }

        public void setHost(boolean host) {
            this.host = host;
        }
    }

    // --- Getters & Setters ---

    public ServerMessageType getType() {
        return type;
    }

    public String getParticipantId() {
        return participantId;
    }

    public String getRoomCode() {
        return roomCode;
    }

    public String getUsername() {
        return username;
    }

    public Boolean getHost() {
        return host;
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

    public String getTimestamp() {
        return timestamp;
    }

    public Boolean getTyping() {
        return typing;
    }

    public Collection<ParticipantDto> getParticipants() {
        return participants;
    }

    public String getEvent() {
        return event;
    }

    public String getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }

    public Long getRemainingSeconds() {
        return remainingSeconds;
    }

    public String getExpiresAt() {
        return expiresAt;
    }

    public static class ChatMessageDto {
        private String messageId;
        private String senderId;
        private String senderName;
        private String text;
        private String timestamp;

        public ChatMessageDto() {
        }

        public ChatMessageDto(String messageId, String senderId, String senderName, String text, String timestamp) {
            this.messageId = messageId;
            this.senderId = senderId;
            this.senderName = senderName;
            this.text = text;
            this.timestamp = timestamp;
        }

        public String getMessageId() { return messageId; }
        public void setMessageId(String messageId) { this.messageId = messageId; }

        public String getSenderId() { return senderId; }
        public void setSenderId(String senderId) { this.senderId = senderId; }

        public String getSenderName() { return senderName; }
        public void setSenderName(String senderName) { this.senderName = senderName; }

        public String getText() { return text; }
        public void setText(String text) { this.text = text; }

        public String getTimestamp() { return timestamp; }
        public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
    }

    public java.util.List<ChatMessageDto> getMessages() {
        return messages;
    }

    public String getReason() {
        return reason;
    }
}
