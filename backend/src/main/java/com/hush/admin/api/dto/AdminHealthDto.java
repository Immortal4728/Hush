package com.hush.admin.api.dto;

public record AdminHealthDto(
    String backend,
    String websocket,
    String roomService,
    String authService,
    long jvmMemoryUsedMb,
    long jvmMemoryMaxMb,
    int activeRooms,
    int activeConnections,
    long uptimeSeconds
) {}
