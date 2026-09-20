package com.hush.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "hush.lifecycle")
public class HushLifecycleProperties {

    private long checkIntervalMs = 1000;
    private long expiringWarningThresholdSeconds = 60;
    private long emptyRoomGracePeriodSeconds = 30;

    public long getCheckIntervalMs() {
        return checkIntervalMs;
    }

    public void setCheckIntervalMs(long checkIntervalMs) {
        this.checkIntervalMs = checkIntervalMs;
    }

    public long getExpiringWarningThresholdSeconds() {
        return expiringWarningThresholdSeconds;
    }

    public void setExpiringWarningThresholdSeconds(long expiringWarningThresholdSeconds) {
        this.expiringWarningThresholdSeconds = expiringWarningThresholdSeconds;
    }

    public long getEmptyRoomGracePeriodSeconds() {
        return emptyRoomGracePeriodSeconds;
    }

    public void setEmptyRoomGracePeriodSeconds(long emptyRoomGracePeriodSeconds) {
        this.emptyRoomGracePeriodSeconds = emptyRoomGracePeriodSeconds;
    }
}
