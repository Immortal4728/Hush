package com.hush.ratelimit;

import com.hush.config.HushRateLimitProperties;
import com.hush.exception.RateLimitExceededException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Objects;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class RateLimitingService {

    private static final Logger logger = LoggerFactory.getLogger(RateLimitingService.class);

    private final HushRateLimitProperties properties;
    private final IpResolver ipResolver;

    private final SlidingWindowRateLimiter roomCreationLimiter = new SlidingWindowRateLimiter();
    private final SlidingWindowRateLimiter joinAttemptLimiter = new SlidingWindowRateLimiter();
    private final SlidingWindowRateLimiter messageLimiter = new SlidingWindowRateLimiter();
    private final SlidingWindowRateLimiter typingLimiter = new SlidingWindowRateLimiter();

    private final AtomicInteger activeWebsocketConnections = new AtomicInteger(0);

    public RateLimitingService(HushRateLimitProperties properties, IpResolver ipResolver) {
        this.properties = Objects.requireNonNull(properties, "properties must not be null");
        this.ipResolver = Objects.requireNonNull(ipResolver, "ipResolver must not be null");
    }

    public boolean isTrustForwardedFor() {
        return properties.isTrustForwardedFor();
    }

    public IpResolver getIpResolver() {
        return ipResolver;
    }

    // --- Room Creation Limit ---

    public void checkRoomCreationAllowed(String clientIp) {
        if (!properties.isEnabled()) {
            return;
        }
        long windowMs = properties.getRoomCreation().getWindowSeconds() * 1000;
        int maxAttempts = properties.getRoomCreation().getMaxAttempts();

        if (!roomCreationLimiter.tryAcquire(clientIp, maxAttempts, windowMs)) {
            logger.warn("Room creation rate limit exceeded for IP {}", clientIp);
            throw new RateLimitExceededException("Room creation rate limit exceeded. Please try again later.");
        }
    }

    // --- Join Attempt Limit ---

    public boolean allowJoinAttempt(String clientIp) {
        if (!properties.isEnabled()) {
            return true;
        }
        long windowMs = properties.getJoinAttempt().getWindowSeconds() * 1000;
        int maxAttempts = properties.getJoinAttempt().getMaxAttempts();
        return joinAttemptLimiter.tryAcquire(clientIp, maxAttempts, windowMs);
    }

    // --- WebSocket Message Limit ---

    public boolean allowMessage(String sessionId) {
        if (!properties.isEnabled()) {
            return true;
        }
        long windowMs = properties.getMessage().getWindowSeconds() * 1000;
        int maxAttempts = properties.getMessage().getMaxAttempts();
        return messageLimiter.tryAcquire(sessionId, maxAttempts, windowMs);
    }

    // --- WebSocket Typing Limit ---

    public boolean allowTyping(String sessionId) {
        if (!properties.isEnabled()) {
            return true;
        }
        long windowMs = properties.getTyping().getWindowSeconds() * 1000;
        int maxAttempts = properties.getTyping().getMaxAttempts();
        return typingLimiter.tryAcquire(sessionId, maxAttempts, windowMs);
    }

    // --- WebSocket Active Connections Limit ---

    public boolean tryIncrementWebSocketConnection() {
        if (!properties.isEnabled()) {
            return true;
        }
        int maxConnections = properties.getWebsocket().getMaxConnections();
        while (true) {
            int current = activeWebsocketConnections.get();
            if (current >= maxConnections) {
                logger.warn("Global WebSocket connection limit of {} reached.", maxConnections);
                return false;
            }
            if (activeWebsocketConnections.compareAndSet(current, current + 1)) {
                return true;
            }
        }
    }

    public void decrementWebSocketConnection() {
        activeWebsocketConnections.updateAndGet(current -> Math.max(0, current - 1));
    }

    public int getActiveWebSocketConnections() {
        return activeWebsocketConnections.get();
    }

    // --- Memory Cleanup ---

    @Scheduled(fixedRateString = "${hush.rate-limit.cleanup-interval-seconds:60}000")
    public void cleanupExpiredBuckets() {
        try {
            roomCreationLimiter.cleanupExpired(properties.getRoomCreation().getWindowSeconds() * 1000);
            joinAttemptLimiter.cleanupExpired(properties.getJoinAttempt().getWindowSeconds() * 1000);
            messageLimiter.cleanupExpired(properties.getMessage().getWindowSeconds() * 1000);
            typingLimiter.cleanupExpired(properties.getTyping().getWindowSeconds() * 1000);

            logger.debug("Cleaned up expired rate-limiting buckets.");
        } catch (Exception e) {
            logger.error("Error during rate limiter bucket cleanup", e);
        }
    }

    public void clearAllLimiters() {
        roomCreationLimiter.clear();
        joinAttemptLimiter.clear();
        messageLimiter.clear();
        typingLimiter.clear();
        activeWebsocketConnections.set(0);
    }
}
