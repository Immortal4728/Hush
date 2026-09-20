package com.hush.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "hush.rate-limit")
public class HushRateLimitProperties {

    private boolean enabled = true;
    private boolean trustForwardedFor = false;
    private long cleanupIntervalSeconds = 60;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    private LimitPolicy roomCreation = new LimitPolicy(5, 600);
    private LimitPolicy joinAttempt = new LimitPolicy(20, 60);
    private LimitPolicy message = new LimitPolicy(10, 1);
    private LimitPolicy typing = new LimitPolicy(5, 1);
    private WebsocketPolicy websocket = new WebsocketPolicy(1000);

    public boolean isTrustForwardedFor() {
        return trustForwardedFor;
    }

    public void setTrustForwardedFor(boolean trustForwardedFor) {
        this.trustForwardedFor = trustForwardedFor;
    }

    public long getCleanupIntervalSeconds() {
        return cleanupIntervalSeconds;
    }

    public void setCleanupIntervalSeconds(long cleanupIntervalSeconds) {
        this.cleanupIntervalSeconds = cleanupIntervalSeconds;
    }

    public LimitPolicy getRoomCreation() {
        return roomCreation;
    }

    public void setRoomCreation(LimitPolicy roomCreation) {
        this.roomCreation = roomCreation;
    }

    public LimitPolicy getJoinAttempt() {
        return joinAttempt;
    }

    public void setJoinAttempt(LimitPolicy joinAttempt) {
        this.joinAttempt = joinAttempt;
    }

    public LimitPolicy getMessage() {
        return message;
    }

    public void setMessage(LimitPolicy message) {
        this.message = message;
    }

    public LimitPolicy getTyping() {
        return typing;
    }

    public void setTyping(LimitPolicy typing) {
        this.typing = typing;
    }

    public WebsocketPolicy getWebsocket() {
        return websocket;
    }

    public void setWebsocket(WebsocketPolicy websocket) {
        this.websocket = websocket;
    }

    public static class LimitPolicy {
        private int maxAttempts;
        private long windowSeconds;

        public LimitPolicy() {
        }

        public LimitPolicy(int maxAttempts, long windowSeconds) {
            this.maxAttempts = maxAttempts;
            this.windowSeconds = windowSeconds;
        }

        public int getMaxAttempts() {
            return maxAttempts;
        }

        public void setMaxAttempts(int maxAttempts) {
            this.maxAttempts = maxAttempts;
        }

        public long getWindowSeconds() {
            return windowSeconds;
        }

        public void setWindowSeconds(long windowSeconds) {
            this.windowSeconds = windowSeconds;
        }
    }

    public static class WebsocketPolicy {
        private int maxConnections;

        public WebsocketPolicy() {
        }

        public WebsocketPolicy(int maxConnections) {
            this.maxConnections = maxConnections;
        }

        public int getMaxConnections() {
            return maxConnections;
        }

        public void setMaxConnections(int maxConnections) {
            this.maxConnections = maxConnections;
        }
    }
}
