package com.hush.stranger.api.dto;

import jakarta.validation.constraints.NotBlank;

public record StrangerCancelRequest(
        @NotBlank(message = "ticketId must not be blank")
        String ticketId
) {}
