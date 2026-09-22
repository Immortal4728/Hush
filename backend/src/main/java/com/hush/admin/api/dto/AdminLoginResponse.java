package com.hush.admin.api.dto;

public record AdminLoginResponse(
    String token,
    String username,
    String message
) {}
