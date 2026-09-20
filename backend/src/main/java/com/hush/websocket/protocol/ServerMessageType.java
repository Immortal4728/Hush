package com.hush.websocket.protocol;

public enum ServerMessageType {
    JOINED,
    MESSAGE,
    TYPING,
    PRESENCE,
    SYSTEM,
    ERROR,
    ROOM_EXPIRING,
    ROOM_DESTROYED
}
