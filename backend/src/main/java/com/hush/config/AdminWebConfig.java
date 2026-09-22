package com.hush.config;

import com.hush.admin.api.AdminAuthInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Objects;

@Configuration
public class AdminWebConfig implements WebMvcConfigurer {

    private final AdminAuthInterceptor adminAuthInterceptor;

    public AdminWebConfig(AdminAuthInterceptor adminAuthInterceptor) {
        this.adminAuthInterceptor = Objects.requireNonNull(adminAuthInterceptor);
    }

    @Override
    public void addInterceptors(@org.springframework.lang.NonNull InterceptorRegistry registry) {
        registry.addInterceptor(adminAuthInterceptor)
                .addPathPatterns("/api/admin/**")
                .excludePathPatterns("/api/admin/login");
    }
}
