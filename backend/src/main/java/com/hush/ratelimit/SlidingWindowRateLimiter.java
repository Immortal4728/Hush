package com.hush.ratelimit;

import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.Queue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.atomic.AtomicBoolean;

public class SlidingWindowRateLimiter {

    private static final int DEFAULT_MAX_KEYS = 50000;

    private final int maxKeys;
    private final ConcurrentHashMap<String, Queue<Long>> windowMap = new ConcurrentHashMap<>();

    public SlidingWindowRateLimiter() {
        this(DEFAULT_MAX_KEYS);
    }

    public SlidingWindowRateLimiter(int maxKeys) {
        if (maxKeys <= 0) {
            throw new IllegalArgumentException("maxKeys must be positive");
        }
        this.maxKeys = maxKeys;
    }

    public boolean tryAcquire(String key, int maxAttempts, long windowMs) {
        return tryAcquire(key, maxAttempts, windowMs, Instant.now());
    }

    public boolean tryAcquire(String key, int maxAttempts, long windowMs, Instant now) {
        Objects.requireNonNull(now, "now must not be null");
        if (key == null || key.isBlank() || maxAttempts <= 0 || windowMs <= 0) {
            return true;
        }

        String trimmedKey = key.trim();
        long nowEpoch = now.toEpochMilli();
        long cutoff = nowEpoch - windowMs;
        AtomicBoolean allowed = new AtomicBoolean(false);

        if (!windowMap.containsKey(trimmedKey) && windowMap.size() >= maxKeys) {
            // Memory safety guard: cleanup expired entries before rejecting
            cleanupExpired(windowMs, now);
            if (!windowMap.containsKey(trimmedKey) && windowMap.size() >= maxKeys) {
                return false; // Rejection on key capacity overflow under attack
            }
        }

        windowMap.compute(trimmedKey, (k, timestamps) -> {
            if (timestamps == null) {
                timestamps = new ConcurrentLinkedQueue<>();
            }
            while (!timestamps.isEmpty() && timestamps.peek() <= cutoff) {
                timestamps.poll();
            }
            if (timestamps.size() < maxAttempts) {
                timestamps.add(nowEpoch);
                allowed.set(true);
            } else {
                allowed.set(false);
            }
            return timestamps;
        });

        return allowed.get();
    }

    public void cleanupExpired(long maxWindowMs) {
        cleanupExpired(maxWindowMs, Instant.now());
    }

    public void cleanupExpired(long maxWindowMs, Instant now) {
        long cutoff = now.toEpochMilli() - maxWindowMs;
        for (Map.Entry<String, Queue<Long>> entry : windowMap.entrySet()) {
            Queue<Long> timestamps = entry.getValue();
            if (timestamps != null) {
                while (!timestamps.isEmpty() && timestamps.peek() <= cutoff) {
                    timestamps.poll();
                }
                if (timestamps.isEmpty()) {
                    windowMap.remove(entry.getKey(), timestamps);
                }
            }
        }
    }

    public int getActiveKeyCount() {
        return windowMap.size();
    }

    public void clear() {
        windowMap.clear();
    }
}
