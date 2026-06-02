package com.example.fitchallenge.Security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS configuration — allowed origins are driven by the property
 * {@code app.cors.allowed-origins} so each deployment profile can
 * set its own domain without code changes.
 *
 * Local default: http://localhost:5173
 * Production: set via CORS_ALLOWED_ORIGINS env var (comma-separated)
 */
@Configuration
public class CorsConfig {

    /**
     * Comma-separated list of allowed origins.
     * Defaults to localhost dev server; override via env var CORS_ALLOWED_ORIGINS in production.
     * Example: CORS_ALLOWED_ORIGINS=https://fitnit.example.com,https://www.fitnit.example.com
     */
    @Value("${app.cors.allowed-origins:http://localhost:5173}")
    private String[] allowedOrigins;

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedOrigins(allowedOrigins)
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                        .allowedHeaders("*")
                        .allowCredentials(true)
                        .maxAge(3600);
            }
        };
    }
}
