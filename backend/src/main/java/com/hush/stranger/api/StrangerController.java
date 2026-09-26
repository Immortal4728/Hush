package com.hush.stranger.api;

import com.hush.ratelimit.RateLimitingService;
import com.hush.stranger.StrangerMatchmakingService;
import com.hush.stranger.api.dto.StrangerCancelRequest;
import com.hush.stranger.api.dto.StrangerMatchResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Objects;
import java.util.Optional;

@RestController
@RequestMapping("/api/stranger")
public class StrangerController {

    private final StrangerMatchmakingService matchmakingService;
    private final RateLimitingService rateLimitingService;

    public StrangerController(StrangerMatchmakingService matchmakingService, RateLimitingService rateLimitingService) {
        this.matchmakingService = Objects.requireNonNull(matchmakingService, "matchmakingService must not be null");
        this.rateLimitingService = Objects.requireNonNull(rateLimitingService, "rateLimitingService must not be null");
    }

    @PostMapping("/match")
    public ResponseEntity<StrangerMatchResponse> requestMatch(HttpServletRequest httpRequest) {
        String clientIp = rateLimitingService.getIpResolver().resolveIp(httpRequest, rateLimitingService.isTrustForwardedFor());
        rateLimitingService.checkRoomCreationAllowed(clientIp);

        StrangerMatchmakingService.MatchTicket ticket = matchmakingService.requestMatch();
        int lookingCount = matchmakingService.getLookingCount();

        return ResponseEntity.ok(new StrangerMatchResponse(
                ticket.getTicketId(),
                ticket.getStatus(),
                ticket.getRoomCode(),
                ticket.getUsername(),
                lookingCount
        ));
    }

    @PostMapping("/cancel")
    public ResponseEntity<Void> cancelMatch(@Valid @RequestBody StrangerCancelRequest request) {
        matchmakingService.cancelMatch(request.ticketId());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/status")
    public ResponseEntity<StrangerMatchResponse> getStatus(@RequestParam("ticketId") String ticketId) {
        Optional<StrangerMatchmakingService.MatchTicket> ticketOpt = matchmakingService.getTicketStatus(ticketId);
        if (ticketOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        StrangerMatchmakingService.MatchTicket ticket = ticketOpt.get();
        int lookingCount = matchmakingService.getLookingCount();

        return ResponseEntity.ok(new StrangerMatchResponse(
                ticket.getTicketId(),
                ticket.getStatus(),
                ticket.getRoomCode(),
                ticket.getUsername(),
                lookingCount
        ));
    }
}
