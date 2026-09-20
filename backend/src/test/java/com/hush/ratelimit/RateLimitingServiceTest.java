package com.hush.ratelimit;

import com.hush.config.HushRateLimitProperties;
import com.hush.exception.RateLimitExceededException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

public class RateLimitingServiceTest {

    private HushRateLimitProperties properties;
    private IpResolver ipResolver;
    private RateLimitingService rateLimitingService;

    @BeforeEach
    void setUp() {
        properties = new HushRateLimitProperties();
        properties.setEnabled(true);
        properties.setTrustForwardedFor(false);
        properties.getRoomCreation().setMaxAttempts(5);
        properties.getRoomCreation().setWindowSeconds(600);
        properties.getJoinAttempt().setMaxAttempts(20);
        properties.getJoinAttempt().setWindowSeconds(60);
        properties.getMessage().setMaxAttempts(10);
        properties.getMessage().setWindowSeconds(1);
        properties.getTyping().setMaxAttempts(5);
        properties.getTyping().setWindowSeconds(1);
        properties.getWebsocket().setMaxConnections(3);

        ipResolver = new IpResolver();
        rateLimitingService = new RateLimitingService(properties, ipResolver);
    }

    @Test
    void testRequestUnderLimitSucceeds() {
        assertDoesNotThrow(() -> rateLimitingService.checkRoomCreationAllowed("192.168.1.1"));
        assertTrue(rateLimitingService.allowJoinAttempt("192.168.1.1"));
        assertTrue(rateLimitingService.allowMessage("session-123"));
        assertTrue(rateLimitingService.allowTyping("session-123"));
    }

    @Test
    void testRoomCreationLimitExceeded() {
        String ip = "10.0.0.1";
        for (int i = 0; i < 5; i++) {
            rateLimitingService.checkRoomCreationAllowed(ip);
        }

        // 6th attempt must throw RateLimitExceededException
        assertThrows(RateLimitExceededException.class, () -> rateLimitingService.checkRoomCreationAllowed(ip));
    }

    @Test
    void testSeparateIpsHaveSeparateLimits() {
        String ip1 = "10.0.0.1";
        String ip2 = "10.0.0.2";

        for (int i = 0; i < 5; i++) {
            rateLimitingService.checkRoomCreationAllowed(ip1);
        }
        assertThrows(RateLimitExceededException.class, () -> rateLimitingService.checkRoomCreationAllowed(ip1));

        // ip2 should still be allowed
        assertDoesNotThrow(() -> rateLimitingService.checkRoomCreationAllowed(ip2));
    }

    @Test
    void testWindowExpirationAllowsRequestsAgain() {
        SlidingWindowRateLimiter limiter = new SlidingWindowRateLimiter();
        Instant now = Instant.now();

        // 5 attempts allowed in 10-second window
        for (int i = 0; i < 5; i++) {
            assertTrue(limiter.tryAcquire("key1", 5, 10000, now));
        }
        assertFalse(limiter.tryAcquire("key1", 5, 10000, now));

        // Move clock forward by 11 seconds (outside window)
        Instant future = now.plusSeconds(11);
        assertTrue(limiter.tryAcquire("key1", 5, 10000, future));
    }

    @Test
    void testConcurrentRoomCreationRateLimiting() throws Exception {
        String ip = "192.168.1.100";
        int threadCount = 100;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(1);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger rejectedCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    latch.await();
                    rateLimitingService.checkRoomCreationAllowed(ip);
                    successCount.incrementAndGet();
                } catch (RateLimitExceededException e) {
                    rejectedCount.incrementAndGet();
                } catch (Exception ignored) {
                }
            });
        }

        latch.countDown();
        executor.shutdown();
        assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));

        assertEquals(5, successCount.get(), "Exactly max-attempts (5) should succeed");
        assertEquals(95, rejectedCount.get(), "Remaining 95 attempts should be rejected");
    }

    @Test
    void testMemoryCleanupEvictsExpiredBuckets() {
        SlidingWindowRateLimiter limiter = new SlidingWindowRateLimiter();
        Instant now = Instant.now();

        limiter.tryAcquire("temp-ip-1", 5, 1000, now);
        limiter.tryAcquire("temp-ip-2", 5, 1000, now);
        assertEquals(2, limiter.getActiveKeyCount());

        // Fast forward 5 seconds and clean up
        Instant future = now.plusSeconds(5);
        limiter.cleanupExpired(1000, future);

        assertEquals(0, limiter.getActiveKeyCount(), "Expired buckets should be evicted to prevent memory leaks");
    }

    @Test
    void testWebSocketConnectionLimit() {
        assertTrue(rateLimitingService.tryIncrementWebSocketConnection()); // 1
        assertTrue(rateLimitingService.tryIncrementWebSocketConnection()); // 2
        assertTrue(rateLimitingService.tryIncrementWebSocketConnection()); // 3 (max=3)

        assertFalse(rateLimitingService.tryIncrementWebSocketConnection(), "Connection exceeding max-connections (3) must be rejected");

        // Decrement one connection
        rateLimitingService.decrementWebSocketConnection();
        assertTrue(rateLimitingService.tryIncrementWebSocketConnection(), "Freed connection capacity should allow new connection");
    }
}
