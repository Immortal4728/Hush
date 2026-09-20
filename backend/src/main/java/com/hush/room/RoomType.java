package com.hush.room;

public enum RoomType {
    DIRECT(2),
    GROUP(20);

    private final int maxParticipants;

    RoomType(int maxParticipants) {
        this.maxParticipants = maxParticipants;
    }

    public int getMaxParticipants() {
        return maxParticipants;
    }
}
