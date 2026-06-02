package com.example.fitchallenge.Security.JWT;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Returns a JSON 401 response consistent with GlobalExceptionHandler's format
 * whenever Spring Security rejects an unauthenticated request.
 */
@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", 401);
        body.put("error", "UNAUTHORIZED");
        body.put("message", "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
        body.put("timestamp", Instant.now().toString());
        body.put("path", request.getRequestURI());

        MAPPER.writeValue(response.getOutputStream(), body);
    }
}
