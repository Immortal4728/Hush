package com.hush.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Configuration
public class WebCorsConfig implements WebMvcConfigurer {

    private final HushCorsProperties corsProperties;

    public WebCorsConfig(HushCorsProperties corsProperties) {
        this.corsProperties = Objects.requireNonNull(corsProperties, "corsProperties must not be null");
    }

    @Override
    public void addCorsMappings(@org.springframework.lang.NonNull CorsRegistry registry) {
        List<String> patterns = new ArrayList<>(corsProperties.getAllowedOrigins());
        patterns.add("http://localhost:*");
        patterns.add("http://127.0.0.1:*");

        registry.addMapping("/**")
                .allowedOriginPatterns(patterns.toArray(new String[0]))
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
