package com.example.fitchallenge.Security;

import com.example.fitchallenge.Security.JWT.JwtAuthenticationEntryPoint;
import com.example.fitchallenge.Security.JWT.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.http.HttpMethod;

import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.cors.CorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationEntryPoint unauthorizedHandler;

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;


    // =============================
    //  🔥 FIX CORS CHUẨN SẢN XUẤT
    // =============================
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Get allowed origins from environment variable or use defaults
        String allowedOriginsEnv = System.getenv("CORS_ALLOWED_ORIGINS");
        if (allowedOriginsEnv != null && !allowedOriginsEnv.isEmpty()) {
            config.setAllowedOriginPatterns(List.of(allowedOriginsEnv.split(",")));
        } else {
            // Default: localhost for dev and allow Lambda API Gateway
            config.setAllowedOriginPatterns(List.of(
                "http://localhost:5173",
                "http://localhost:3000",
                "https://*.execute-api.*.amazonaws.com"  // Lambda API Gateway pattern
            ));
        }

        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);  // Cache preflight for 1 hour

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return source;
    }


    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // 🔥 Bật CORS ở đây
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                .csrf(csrf -> csrf.disable())

                .headers(headers -> headers
                        .frameOptions(frameOptions -> frameOptions.sameOrigin())
                )

                .exceptionHandling(ex -> ex.authenticationEntryPoint(unauthorizedHandler))

                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                        .authorizeHttpRequests(auth -> auth
                                // ── Preflight ────────────────────────────────────────────────
                                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                                // ── Swagger / OpenAPI (safe to expose; disable in prod via env) ─
                                .requestMatchers(
                                        "/swagger-ui.html", "/swagger-ui/**",
                                        "/api-docs/**", "/v3/api-docs/**",
                                        "/swagger-resources/**", "/webjars/**"
                                ).permitAll()

                                // ── Health check ─────────────────────────────────────────────
                                .requestMatchers("/actuator/health", "/actuator/info").permitAll()

                                // ── Public unauthenticated endpoints ─────────────────────────
                                .requestMatchers(
                                    "/api/auth/login", "/api/auth/register",
                                    "/api/auth/forgot-password", "/api/auth/reset-password",
                                    "/api/auth/google"
                                ).permitAll()
                                .requestMatchers(HttpMethod.GET, "/api/goals", "/api/goals/**").permitAll()
                                .requestMatchers(HttpMethod.GET, "/api/foods", "/api/foods/**").permitAll()
                                .requestMatchers(HttpMethod.GET, "/api/challenges/**").permitAll()
                                .requestMatchers(HttpMethod.GET, "/api/training-plans/**").permitAll()
                                .requestMatchers("/api/files/**", "/uploads/**").permitAll()
                                // AI Packages: list public, VNPay callbacks public
                                .requestMatchers(HttpMethod.GET, "/api/ai-packages", "/api/ai-packages/**").permitAll()
                                .requestMatchers("/api/ai-packages/payment/**").permitAll()

                                // ── Admin: requires ADMIN authority ──────────────────────────
                                // Authority stored as "ADMIN" (no ROLE_ prefix) in CustomUserDetailService
                                .requestMatchers("/api/admin/**").hasAuthority("ADMIN")
                                // Reward redemptions: user chỉ được tạo (POST) đơn đổi thưởng;
                                // xem toàn bộ đơn + đổi trạng thái (duyệt/huỷ→hoàn điểm) là của ADMIN
                                .requestMatchers(HttpMethod.GET, "/api/reward-redemptions").hasAuthority("ADMIN")
                                .requestMatchers(HttpMethod.PUT, "/api/reward-redemptions/*/status").hasAuthority("ADMIN")

                                // ── AI / Personalized: must be authenticated ──────────────────
                                .requestMatchers("/api/ai-plans/**", "/api/ai-analysis/**",
                                                 "/api/ai-coach/**", "/api/food-analysis/**").authenticated()

                                // ── User-specific: must be authenticated ─────────────────────
                                .requestMatchers("/api/v1/users/**", "/api/users/**",
                                                 "/api/user/**").authenticated()

                                // ── Everything else: authenticated ────────────────────────────
                                .anyRequest().authenticated()
                        );

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }


    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

}
