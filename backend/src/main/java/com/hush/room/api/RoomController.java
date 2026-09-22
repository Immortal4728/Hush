package com.hush.room.api;

import com.hush.exception.RateLimitExceededException;
import com.hush.exception.RoomNotFoundException;
import com.hush.participant.Participant;
import com.hush.ratelimit.RateLimitingService;
import com.hush.room.Room;
import com.hush.room.RoomService;
import com.hush.room.RoomState;
import com.hush.room.api.dto.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Objects;
import java.util.Set;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private static final Set<Integer> SUPPORTED_TTL_MINUTES = Set.of(30, 60, 180);

    private final RoomService roomService;
    private final RateLimitingService rateLimitingService;

    public RoomController(RoomService roomService, RateLimitingService rateLimitingService) {
        this.roomService = Objects.requireNonNull(roomService, "roomService must not be null");
        this.rateLimitingService = Objects.requireNonNull(rateLimitingService, "rateLimitingService must not be null");
    }

    @PostMapping
    public ResponseEntity<CreateRoomResponse> createRoom(
            @Valid @RequestBody CreateRoomRequest request,
            HttpServletRequest httpRequest) {

        String clientIp = rateLimitingService.getIpResolver().resolveIp(httpRequest, rateLimitingService.isTrustForwardedFor());
        rateLimitingService.checkRoomCreationAllowed(clientIp);

        if (request.ttlMinutes() == null || !SUPPORTED_TTL_MINUTES.contains(request.ttlMinutes())) {
            throw new IllegalArgumentException("ttlMinutes must be one of [30, 60, 180]");
        }

        Room room = roomService.createRoom(request.type(), Duration.ofMinutes(request.ttlMinutes()));
        return ResponseEntity.status(HttpStatus.CREATED).body(CreateRoomResponse.fromDomain(room));
    }

    @GetMapping("/{roomCode}")
    public ResponseEntity<RoomStatusResponse> getRoom(
            @PathVariable String roomCode,
            HttpServletRequest httpRequest) {

        String clientIp = rateLimitingService.getIpResolver().resolveIp(httpRequest, rateLimitingService.isTrustForwardedFor());
        if (!rateLimitingService.allowJoinAttempt(clientIp)) {
            throw new RateLimitExceededException("Join attempt limit exceeded. Please try again later.");
        }

        Room room = roomService.findRoom(roomCode)
                .orElseThrow(() -> new RoomNotFoundException("Room not found: " + roomCode));

        if (room.isExpired() || room.getState() == RoomState.DESTROYED) {
            throw new RoomNotFoundException("Room does not exist or has expired.");
        }

        return ResponseEntity.ok(RoomStatusResponse.fromDomain(room));
    }

    @PostMapping("/{roomCode}/participants")
    public ResponseEntity<ParticipantResponse> joinRoom(
            @PathVariable String roomCode,
            @Valid @RequestBody JoinRoomRequest request,
            HttpServletRequest httpRequest) {

        String clientIp = rateLimitingService.getIpResolver().resolveIp(httpRequest, rateLimitingService.isTrustForwardedFor());
        if (!rateLimitingService.allowJoinAttempt(clientIp)) {
            throw new RateLimitExceededException("Join attempt limit exceeded. Please try again later.");
        }

        Participant participant = roomService.addParticipant(roomCode, request.username());
        return ResponseEntity.status(HttpStatus.CREATED).body(ParticipantResponse.fromDomain(participant));
    }

    @DeleteMapping("/{roomCode}/participants/{participantId}")
    public ResponseEntity<Void> removeParticipant(
            @PathVariable String roomCode,
            @PathVariable String participantId) {

        if (!roomService.roomExists(roomCode)) {
            throw new RoomNotFoundException("Room not found: " + roomCode);
        }

        boolean removed = roomService.removeParticipant(roomCode, participantId)
                .isPresent();

        if (!removed) {
            throw new RoomNotFoundException("Participant not found: " + participantId);
        }

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{roomCode}/extend")
    public ResponseEntity<RoomStatusResponse> extendRoom(
            @PathVariable String roomCode,
            @Valid @RequestBody ExtendRoomRequest request) {

        if (request == null || request.minutes() == null || request.minutes() <= 0 || request.minutes() > 1440) {
            throw new IllegalArgumentException("Minutes must be a positive integer up to 1440.");
        }

        Room room = roomService.extendRoom(roomCode, Duration.ofMinutes(request.minutes()));
        return ResponseEntity.ok(RoomStatusResponse.fromDomain(room));
    }
}
