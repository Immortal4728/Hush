package com.hush.admin.api;

import com.hush.admin.AdminAuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AdminAuthInterceptor implements HandlerInterceptor {

    public static final String COOKIE_NAME = "HUSH_ADMIN_SESSION";

    private final AdminAuthService adminAuthService;

    public AdminAuthInterceptor(AdminAuthService adminAuthService) {
        this.adminAuthService = adminAuthService;
    }

    @Override
    public boolean preHandle(@NonNull HttpServletRequest request,
                             @NonNull HttpServletResponse response,
                             @NonNull Object handler) throws Exception {

        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String path = request.getRequestURI();
        if (path.endsWith("/api/admin/login")) {
            return true;
        }

        String token = null;

        // 1. Check HttpOnly Session Cookie first
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if (COOKIE_NAME.equals(cookie.getName())) {
                    token = cookie.getValue();
                    break;
                }
            }
        }

        // 2. Fallback to X-Admin-Token header
        if (token == null || token.isBlank()) {
            token = request.getHeader("X-Admin-Token");
        }

        if (token != null && adminAuthService.isValidToken(token)) {
            return true;
        }

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\": \"UNAUTHORIZED\", \"message\": \"Admin authentication required\"}");
        return false;
    }
}
