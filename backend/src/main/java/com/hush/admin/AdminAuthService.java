package com.hush.admin;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AdminAuthService {

    private static final Logger log = LoggerFactory.getLogger(AdminAuthService.class);
    private static final Duration TOKEN_TTL = Duration.ofHours(12);

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final Duration LOCKOUT_DURATION = Duration.ofMinutes(15);

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder(12);
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${hush.admin.username:#{null}}")
    private String configuredUsername;

    @Value("${hush.admin.password-hash:#{null}}")
    private String configuredPasswordHash;

    @Value("${hush.admin.password:#{null}}")
    private String rawDevPassword;

    @Value("${spring.profiles.active:dev}")
    private String activeProfile;

    private String adminUsername;
    private String adminPasswordHash;
    private boolean adminEnabled = false;

    private final ConcurrentHashMap<String, Instant> activeTokens = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, FailedAttemptTracker> failedAttempts = new ConcurrentHashMap<>();

    private static class FailedAttemptTracker {
        int count;
        Instant lastAttempt;

        FailedAttemptTracker(Instant now) {
            this.count = 1;
            this.lastAttempt = now;
        }
    }

    public synchronized void initializeCredentials() {
        if (adminEnabled) {
            return;
        }

        String envUsername = System.getenv("HUSH_ADMIN_USERNAME");
        String envHash = System.getenv("HUSH_ADMIN_PASSWORD_HASH");
        String envRawPassword = System.getenv("HUSH_ADMIN_PASSWORD");

        if (envUsername != null && !envUsername.isBlank()) {
            this.adminUsername = envUsername.trim();
        } else if (configuredUsername != null && !configuredUsername.isBlank()) {
            this.adminUsername = configuredUsername.trim();
        } else {
            this.adminUsername = "admin";
        }

        if (envHash != null && !envHash.isBlank()) {
            this.adminPasswordHash = envHash.trim();
            this.adminEnabled = true;
            log.info("[SECURITY] Admin authentication initialized using BCrypt hash from environment.");
        } else if (configuredPasswordHash != null && !configuredPasswordHash.isBlank()) {
            this.adminPasswordHash = configuredPasswordHash.trim();
            this.adminEnabled = true;
            log.info("[SECURITY] Admin authentication initialized using BCrypt hash from application config.");
        } else if (envRawPassword != null && !envRawPassword.isBlank()) {
            this.adminPasswordHash = passwordEncoder.encode(envRawPassword);
            this.adminEnabled = true;
            log.info("[SECURITY] Admin authentication initialized using raw password from environment (hashed with BCrypt).");
        } else if (rawDevPassword != null && !rawDevPassword.isBlank()) {
            if ("prod".equalsIgnoreCase(activeProfile) || "production".equalsIgnoreCase(activeProfile)) {
                this.adminEnabled = false;
                log.error("[SECURITY CAUTION] Production environment detected without HUSH_ADMIN_PASSWORD or HUSH_ADMIN_PASSWORD_HASH. Admin access is DISABLED.");
            } else {
                this.adminPasswordHash = passwordEncoder.encode(rawDevPassword);
                this.adminEnabled = true;
                log.warn("[SECURITY NOTICE - DEV ONLY] Admin authentication initialized with development fallback password. DO NOT USE IN PRODUCTION.");
            }
        } else {
            this.adminEnabled = false;
            log.warn("[SECURITY NOTICE] No admin password configured. Admin authentication is DISABLED.");
        }
    }

    public boolean isRateLimited(String clientIp) {
        if (clientIp == null || clientIp.isBlank()) {
            clientIp = "unknown";
        }
        FailedAttemptTracker tracker = failedAttempts.get(clientIp);
        if (tracker == null) {
            return false;
        }
        Instant now = Instant.now();
        if (Duration.between(tracker.lastAttempt, now).compareTo(LOCKOUT_DURATION) > 0) {
            failedAttempts.remove(clientIp);
            return false;
        }
        return tracker.count >= MAX_FAILED_ATTEMPTS;
    }

    public Optional<String> login(String username, String password, String clientIp) {
        initializeCredentials();

        if (!adminEnabled) {
            log.warn("[SECURITY] Login attempt rejected: Admin authentication is disabled.");
            return Optional.empty();
        }

        if (isRateLimited(clientIp)) {
            log.warn("[SECURITY] Login attempt blocked by rate limiter for IP: {}", clientIp);
            return Optional.empty();
        }

        if (username == null || password == null) {
            recordFailedAttempt(clientIp);
            return Optional.empty();
        }

        if (adminUsername.equals(username.trim()) && passwordEncoder.matches(password, adminPasswordHash)) {
            resetFailedAttempts(clientIp);
            String token = generateSecureToken();
            activeTokens.put(token, Instant.now().plus(TOKEN_TTL));
            log.info("[SECURITY] Admin login successful for user: {}", username);
            return Optional.of(token);
        }

        recordFailedAttempt(clientIp);
        log.warn("[SECURITY] Failed admin login attempt for user: {} from IP: {}", username, clientIp);
        return Optional.empty();
    }

    public boolean isValidToken(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        Instant expiresAt = activeTokens.get(token);
        if (expiresAt == null) {
            return false;
        }
        if (Instant.now().isAfter(expiresAt)) {
            activeTokens.remove(token);
            return false;
        }
        return true;
    }

    public void logout(String token) {
        if (token != null) {
            activeTokens.remove(token);
        }
    }

    private String generateSecureToken() {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    private void recordFailedAttempt(String clientIp) {
        if (clientIp == null || clientIp.isBlank()) return;
        Instant now = Instant.now();
        failedAttempts.compute(clientIp, (ip, tracker) -> {
            if (tracker == null || Duration.between(tracker.lastAttempt, now).compareTo(LOCKOUT_DURATION) > 0) {
                return new FailedAttemptTracker(now);
            }
            tracker.count++;
            tracker.lastAttempt = now;
            return tracker;
        });
    }

    private void resetFailedAttempts(String clientIp) {
        if (clientIp != null) {
            failedAttempts.remove(clientIp);
        }
    }

    public boolean isAdminEnabled() {
        initializeCredentials();
        return adminEnabled;
    }
}
