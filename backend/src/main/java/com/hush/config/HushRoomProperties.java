package com.hush.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "hush.room")
public class HushRoomProperties {

    private int maxHistoryMessages = 500;
    private int directMaxParticipants = 2;
    private int groupMaxParticipants = 20;
    private long defaultTtlMinutes = 60;

    public int getMaxHistoryMessages() {
        return maxHistoryMessages;
    }

    public void setMaxHistoryMessages(int maxHistoryMessages) {
        this.maxHistoryMessages = Math.max(10, Math.min(5000, maxHistoryMessages));
    }

    public int getDirectMaxParticipants() {
        return directMaxParticipants;
    }

    public void setDirectMaxParticipants(int directMaxParticipants) {
        this.directMaxParticipants = Math.max(2, Math.min(10, directMaxParticipants));
    }

    public int getGroupMaxParticipants() {
        return groupMaxParticipants;
    }

    public void setGroupMaxParticipants(int groupMaxParticipants) {
        this.groupMaxParticipants = Math.max(2, Math.min(500, groupMaxParticipants));
    }

    public long getDefaultTtlMinutes() {
        return defaultTtlMinutes;
    }

    public void setDefaultTtlMinutes(long defaultTtlMinutes) {
        this.defaultTtlMinutes = Math.max(1, Math.min(1440, defaultTtlMinutes));
    }
}
