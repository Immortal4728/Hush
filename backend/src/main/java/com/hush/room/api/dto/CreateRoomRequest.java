package com.hush.room.api.dto;

import com.hush.room.RoomType;
import jakarta.validation.constraints.NotNull;

public record CreateRoomRequest(
    @NotNull(message = "type must be present")
    RoomType type,

    @NotNull(message = "ttlMinutes must be present")
    Integer ttlMinutes
) {}
