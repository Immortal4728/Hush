package com.hush.ratelimit;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.net.InetSocketAddress;

@Component
public class IpResolver {

    public String resolveIp(HttpServletRequest request, boolean trustForwardedFor) {
        if (request == null) {
            return "UNKNOWN";
        }
        if (trustForwardedFor) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                String[] ips = forwarded.split(",");
                if (ips.length > 0 && !ips[0].isBlank()) {
                    return ips[0].trim();
                }
            }
        }
        String remoteAddr = request.getRemoteAddr();
        return (remoteAddr != null && !remoteAddr.isBlank()) ? remoteAddr : "UNKNOWN";
    }

    public String resolveIp(WebSocketSession session, boolean trustForwardedFor) {
        if (session == null) {
            return "UNKNOWN";
        }
        if (trustForwardedFor && session.getHandshakeHeaders() != null) {
            String forwarded = session.getHandshakeHeaders().getFirst("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                String[] ips = forwarded.split(",");
                if (ips.length > 0 && !ips[0].isBlank()) {
                    return ips[0].trim();
                }
            }
        }
        InetSocketAddress remoteAddress = session.getRemoteAddress();
        if (remoteAddress != null && remoteAddress.getAddress() != null) {
            return remoteAddress.getAddress().getHostAddress();
        }
        return "UNKNOWN";
    }
}
