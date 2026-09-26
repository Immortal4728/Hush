package com.hush.stranger.api.dto;

public record StrangerMatchResponse(
        String ticketId,
        String status, // "WAITING", "MATCHED", "CANCELLED", "EXPIRED"
        String roomCode,
        String username,
        int lookingCount
) {}
