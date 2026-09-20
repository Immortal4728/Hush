package com.hush.room.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record JoinRoomRequest(
    @NotBlank(message = "username must not be blank")
    @Size(max = 32, message = "username must not exceed 32 characters")
    String username
) {}
