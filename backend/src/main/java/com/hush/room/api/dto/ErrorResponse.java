package com.hush.room.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;

public record ErrorResponse(
    String timestamp,
    int status,
    String code,
    String message
) {
    public ErrorResponse(int status, String code, String message) {
        this(Instant.now().toString(), status, code, message);
    }

    @JsonProperty("error")
    public String getError() {
        return code;
    }
}
