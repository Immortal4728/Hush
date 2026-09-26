package com.hush.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "hush.websocket")
public class HushWebSocketProperties {

    private int unjoinedTimeoutSeconds = 10;
    private int maxMessageLength = 2000;

    public int getUnjoinedTimeoutSeconds() {
        return unjoinedTimeoutSeconds;
    }

    public void setUnjoinedTimeoutSeconds(int unjoinedTimeoutSeconds) {
        this.unjoinedTimeoutSeconds = Math.max(1, Math.min(300, unjoinedTimeoutSeconds));
    }

    public int getMaxMessageLength() {
        return maxMessageLength;
    }

    public void setMaxMessageLength(int maxMessageLength) {
        this.maxMessageLength = Math.max(10, Math.min(10000, maxMessageLength));
    }
}
