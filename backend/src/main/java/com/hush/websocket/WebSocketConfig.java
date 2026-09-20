package com.hush.websocket;

import com.hush.config.HushCorsProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean;

import java.util.List;
import java.util.Objects;

@Configuration
@EnableWebSocket
@SuppressWarnings("null")
public class WebSocketConfig implements WebSocketConfigurer {

    private final ChatWebSocketHandler chatWebSocketHandler;
    private final HushCorsProperties corsProperties;

    public WebSocketConfig(ChatWebSocketHandler chatWebSocketHandler, HushCorsProperties corsProperties) {
        this.chatWebSocketHandler = Objects.requireNonNull(chatWebSocketHandler, "chatWebSocketHandler must not be null");
        this.corsProperties = Objects.requireNonNull(corsProperties, "corsProperties must not be null");
    }

    @Override
    public void registerWebSocketHandlers(@org.springframework.lang.NonNull WebSocketHandlerRegistry registry) {
        List<String> origins = corsProperties.getAllowedOrigins();
        if (origins == null || origins.isEmpty()) {
            registry.addHandler(chatWebSocketHandler, "/ws/chat").setAllowedOriginPatterns("*");
        } else {
            registry.addHandler(chatWebSocketHandler, "/ws/chat").setAllowedOriginPatterns(origins.toArray(new String[0]));
        }
    }

    @Bean
    public ServletServerContainerFactoryBean createWebSocketContainer() {
        ServletServerContainerFactoryBean container = new ServletServerContainerFactoryBean() {
            @Override
            public void afterPropertiesSet() {
                try {
                    super.afterPropertiesSet();
                } catch (IllegalStateException ex) {
                    // Gracefully ignore missing ServerContainer attribute when running in mock servlet context (e.g. MockMvc)
                }
            }
        };
        container.setMaxTextMessageBufferSize(8192);
        container.setMaxBinaryMessageBufferSize(8192);
        return container;
    }
}
