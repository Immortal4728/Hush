package com.hush.websocket.protocol;

public class ClientMessage {

    private ClientMessageType type;
    private String roomCode;
    private String username;
    private String text;
    private Boolean typing;

    public ClientMessage() {
    }

    public ClientMessage(ClientMessageType type, String roomCode, String username, String text, Boolean typing) {
        this.type = type;
        this.roomCode = roomCode;
        this.username = username;
        this.text = text;
        this.typing = typing;
    }

    public ClientMessageType getType() {
        return type;
    }

    public void setType(ClientMessageType type) {
        this.type = type;
    }

    public String getRoomCode() {
        return roomCode;
    }

    public void setRoomCode(String roomCode) {
        this.roomCode = roomCode;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public Boolean getTyping() {
        return typing;
    }

    public void setTyping(Boolean typing) {
        this.typing = typing;
    }
}
