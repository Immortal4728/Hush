package com.hush.room.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record ExtendRoomRequest(
    @NotNull(message = "minutes must be present")
    @Positive(message = "minutes must be positive")
    Integer minutes
) {}
