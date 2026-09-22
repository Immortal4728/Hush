package com.hush.admin.api.dto;

import java.time.Instant;

public record AdminStatsDto(
    int activeConnections,
    int activeRooms,
    int directChats,
    int groupRooms,
    int totalParticipants,
    int expiringSoonCount,
    Instant serverTime
) {}
