package com.hush.exception;

public class IllegalRoomStateException extends RuntimeException {
    public IllegalRoomStateException(String message) {
        super(message);
    }
}
