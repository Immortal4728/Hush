package com.hush.admin.api;

import com.hush.admin.AdminAuthService;
import com.hush.admin.api.dto.*;
import com.hush.room.Room;
import com.hush.room.RoomService;
import com.hush.room.RoomType;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminAuthService adminAuthService;
    private final RoomService roomService;
    private final com.hush.ratelimit.RateLimitingService rateLimitingService;
    private final com.hush.metrics.MetricsService metricsService;
    private final Instant startTime = Instant.now();

    public AdminController(AdminAuthService adminAuthService, RoomService roomService) {
        this(adminAuthService, roomService, null, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public AdminController(AdminAuthService adminAuthService,
                           RoomService roomService,
                           com.hush.ratelimit.RateLimitingService rateLimitingService,
                           com.hush.metrics.MetricsService metricsService) {
        this.adminAuthService = Objects.requireNonNull(adminAuthService);
        this.roomService = Objects.requireNonNull(roomService);
        this.rateLimitingService = rateLimitingService;
        this.metricsService = metricsService != null ? metricsService :
                new com.hush.metrics.MetricsService(new com.hush.config.HushRateLimitProperties());
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AdminLoginRequest request,
                                   HttpServletRequest httpRequest,
                                   HttpServletResponse httpResponse) {

        String clientIp = extractClientIp(httpRequest);

        if (adminAuthService.isRateLimited(clientIp)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(new AdminLoginResponse(null, null, "TOO MANY FAILED ATTEMPTS. TRY AGAIN IN 15 MINUTES."));
        }

        Optional<String> tokenOpt = adminAuthService.login(request.username(), request.password(), clientIp);

        if (tokenOpt.isPresent()) {
            String token = tokenOpt.get();

            // Set HttpOnly, SameSite=Strict session cookie
            ResponseCookie sessionCookie = ResponseCookie.from(AdminAuthInterceptor.COOKIE_NAME, token)
                    .httpOnly(true)
                    .secure(httpRequest.isSecure())
                    .path("/api/admin")
                    .sameSite("Strict")
                    .maxAge(Duration.ofHours(12))
                    .build();

            httpResponse.addHeader(HttpHeaders.SET_COOKIE, sessionCookie.toString());

            return ResponseEntity.ok(new AdminLoginResponse(token, request.username(), "AUTHENTICATION SUCCESSFUL"));
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new AdminLoginResponse(null, null, "INVALID ADMIN CREDENTIALS"));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        String token = extractToken(httpRequest);
        adminAuthService.logout(token);

        // Clear HttpOnly session cookie
        ResponseCookie clearCookie = ResponseCookie.from(AdminAuthInterceptor.COOKIE_NAME, "")
                .httpOnly(true)
                .secure(httpRequest.isSecure())
                .path("/api/admin")
                .sameSite("Strict")
                .maxAge(0)
                .build();

        httpResponse.addHeader(HttpHeaders.SET_COOKIE, clearCookie.toString());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/stats")
    public ResponseEntity<AdminStatsDto> getStats() {
        Collection<Room> rooms = roomService.getAllRooms();
        Instant now = Instant.now();

        int activeRooms = rooms.size();
        int directChats = 0;
        int groupRooms = 0;
        int totalParticipants = 0;
        int expiringSoon = 0;

        for (Room room : rooms) {
            if (room.getRoomType() == RoomType.DIRECT) {
                directChats++;
            } else if (room.getRoomType() == RoomType.GROUP) {
                groupRooms++;
            }

            int count = room.getParticipantCount();
            totalParticipants += count;

            long remainingSecs = Duration.between(now, room.getExpiresAt()).getSeconds();
            if (remainingSecs <= 600 && remainingSecs > 0) {
                expiringSoon++;
            }
        }

        int activeConns = rateLimitingService != null ? rateLimitingService.getActiveWebSocketConnections() : totalParticipants;

        AdminStatsDto stats = new AdminStatsDto(
                activeConns,
                activeRooms,
                directChats,
                groupRooms,
                totalParticipants,
                expiringSoon,
                now
        );

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/metrics")
    public ResponseEntity<com.hush.metrics.MetricsService.OperationalMetricsSnapshot> getOperationalMetrics() {
        Collection<Room> rooms = roomService.getAllRooms();
        int directChats = 0;
        int groupRooms = 0;
        int totalParticipants = 0;

        for (Room room : rooms) {
            if (room.getRoomType() == RoomType.DIRECT) directChats++;
            else if (room.getRoomType() == RoomType.GROUP) groupRooms++;
            totalParticipants += room.getParticipantCount();
        }

        int activeConns = rateLimitingService != null ? rateLimitingService.getActiveWebSocketConnections() : totalParticipants;

        com.hush.metrics.MetricsService.OperationalMetricsSnapshot snapshot =
                metricsService.getSnapshot(activeConns, rooms.size(), directChats, groupRooms, totalParticipants);
        return ResponseEntity.ok(snapshot);
    }

    @GetMapping("/rooms")
    public ResponseEntity<List<AdminRoomDto>> getRooms() {
        Collection<Room> rooms = roomService.getAllRooms();
        Instant now = Instant.now();

        List<AdminRoomDto> list = rooms.stream().map(room -> mapToDto(room, now)).toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/rooms/{roomId}")
    public ResponseEntity<AdminRoomDto> getRoomDetails(@PathVariable String roomId) {
        Optional<Room> roomOpt = roomService.findRoom(roomId);
        if (roomOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(mapToDto(roomOpt.get(), Instant.now()));
    }

    @GetMapping("/health")
    public ResponseEntity<AdminHealthDto> getHealth() {
        Runtime runtime = Runtime.getRuntime();
        long usedMb = (runtime.totalMemory() - runtime.freeMemory()) / (1024 * 1024);
        long maxMb = runtime.maxMemory() / (1024 * 1024);

        Collection<Room> rooms = roomService.getAllRooms();
        int totalParticipants = rooms.stream().mapToInt(Room::getParticipantCount).sum();
        int activeConns = rateLimitingService != null ? rateLimitingService.getActiveWebSocketConnections() : totalParticipants;
        long uptime = Duration.between(startTime, Instant.now()).getSeconds();

        AdminHealthDto health = new AdminHealthDto(
                "ONLINE",
                "ONLINE",
                "ONLINE",
                "ONLINE",
                usedMb,
                maxMb,
                rooms.size(),
                activeConns,
                uptime
        );

        return ResponseEntity.ok(health);
    }

    private String extractClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String extractToken(HttpServletRequest request) {
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if (AdminAuthInterceptor.COOKIE_NAME.equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return request.getHeader("X-Admin-Token");
    }

    private AdminRoomDto mapToDto(Room room, Instant now) {
        long remainingSeconds = Math.max(0, Duration.between(now, room.getExpiresAt()).getSeconds());
        boolean expiringSoon = remainingSeconds <= 600;

        List<AdminRoomDto.ParticipantMeta> participantMetas = room.getParticipants().stream()
                .map(p -> new AdminRoomDto.ParticipantMeta(
                        p.getParticipantId(),
                        p.isHost(),
                        p.getJoinedAt()
                )).toList();

        return new AdminRoomDto(
                room.getRoomCode(),
                room.getRoomType(),
                room.getParticipantCount(),
                room.getMaxParticipants(),
                room.getCreatedAt(),
                room.getExpiresAt(),
                remainingSeconds,
                room.getState().name(),
                expiringSoon,
                participantMetas
        );
    }
}
