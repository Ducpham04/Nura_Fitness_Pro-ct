package com.example.fitchallenge.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.context.request.WebRequest;

import jakarta.persistence.EntityNotFoundException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Centralized exception handler — returns consistent JSON error envelopes.
 *
 * Shape:
 * {
 *   "status":    404,
 *   "error":     "NOT_FOUND",
 *   "message":   "User not found: 42",
 *   "timestamp": "2025-05-29T10:00:00Z",
 *   "path":      "/api/users/42"
 * }
 *
 * Production note: never include stack traces or internal details here.
 * All sensitive context goes to the SLF4J log (server-side only).
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // ── 400 Bad Request ────────────────────────────────────────────────────────

    @ExceptionHandler(MissingRequestHeaderException.class)
    public ResponseEntity<Map<String, Object>> handleMissingHeader(
            MissingRequestHeaderException ex, WebRequest request) {
        log.warn("Missing required header [{}]: {}", path(request), ex.getHeaderName());
        return build(HttpStatus.BAD_REQUEST, "MISSING_HEADER",
                "Required header '" + ex.getHeaderName() + "' is missing", request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(
            IllegalArgumentException ex, WebRequest request) {
        log.warn("Bad request [{}]: {}", path(request), ex.getMessage());
        return build(HttpStatus.BAD_REQUEST, "BAD_REQUEST", ex.getMessage(), request);
    }

    /** Bean Validation failures from @Valid on request bodies */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(
            MethodArgumentNotValidException ex, WebRequest request) {
        String fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining("; "));
        log.warn("Validation failed [{}]: {}", path(request), fieldErrors);
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", fieldErrors, request);
    }

    // ── 401 Unauthorized ───────────────────────────────────────────────────────

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuth(
            AuthenticationException ex, WebRequest request) {
        log.warn("Authentication failed [{}]: {}", path(request), ex.getMessage());
        // For login endpoint: surface a safe, user-friendly message.
        // For all other endpoints (expired token etc.) use the generic message.
        String p = path(request);
        String msg = (p != null && p.contains("/auth/login"))
                ? "Email hoặc mật khẩu không đúng"
                : "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.";
        return build(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", msg, request);
    }

    // ── 403 Forbidden ──────────────────────────────────────────────────────────

    /** Tài khoản bị vô hiệu hoá (xoá mềm / admin khoá) — báo rõ lý do thay vì "sai mật khẩu". */
    @ExceptionHandler(org.springframework.security.authentication.DisabledException.class)
    public ResponseEntity<Map<String, Object>> handleDisabled(
            org.springframework.security.authentication.DisabledException ex, WebRequest request) {
        log.warn("Disabled account [{}]: {}", path(request), ex.getMessage());
        return build(HttpStatus.FORBIDDEN, "ACCOUNT_DISABLED", ex.getMessage(), request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(
            AccessDeniedException ex, WebRequest request) {
        log.warn("Access denied [{}]", path(request));
        return build(HttpStatus.FORBIDDEN, "FORBIDDEN", "You don't have permission to access this resource", request);
    }

    // ── 404 Not Found ──────────────────────────────────────────────────────────

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(
            EntityNotFoundException ex, WebRequest request) {
        log.warn("Not found [{}]: {}", path(request), ex.getMessage());
        return build(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage(), request);
    }

    // ── 409 Conflict ───────────────────────────────────────────────────────────

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<Map<String, Object>> handleDuplicate(
            DuplicateResourceException ex, WebRequest request) {
        log.warn("Conflict [{}]: {}", path(request), ex.getMessage());
        return build(HttpStatus.CONFLICT, "CONFLICT", ex.getMessage(), request);
    }

    // ── 429 Too Many Requests (AI quota exceeded) ─────────────────────────────

    @ExceptionHandler(QuotaExceededException.class)
    public ResponseEntity<Map<String, Object>> handleQuotaExceeded(
            QuotaExceededException ex, WebRequest request) {
        log.warn("AI quota exceeded [{}]: {}", path(request), ex.getMessage());
        return build(HttpStatus.TOO_MANY_REQUESTS, "QUOTA_EXCEEDED", ex.getMessage(), request);
    }

    // ── 503 Service Unavailable (AI service down, etc.) ───────────────────────

    @ExceptionHandler(ExternalServiceException.class)
    public ResponseEntity<Map<String, Object>> handleExternalService(
            ExternalServiceException ex, WebRequest request) {
        log.error("External service error [{}]: {}", path(request), ex.getMessage());
        return build(HttpStatus.SERVICE_UNAVAILABLE, "SERVICE_UNAVAILABLE",
                "Dependent service is temporarily unavailable. Please retry.", request);
    }

    // ── 500 Internal Server Error (catch-all) ─────────────────────────────────

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleAll(
            Exception ex, WebRequest request) {
        // Log full stack trace server-side only — never expose to client
        log.error("Unhandled exception [{}]", path(request), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
                "An unexpected error occurred. Our team has been notified.", request);
    }

    // ── Builder ────────────────────────────────────────────────────────────────

    private ResponseEntity<Map<String, Object>> build(
            HttpStatus status, String error, String message, WebRequest request) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", status.value());
        body.put("error", error);
        body.put("message", message);
        body.put("timestamp", Instant.now().toString());
        body.put("path", path(request));
        return ResponseEntity.status(status).body(body);
    }

    private String path(WebRequest request) {
        // WebRequest description looks like "uri=/api/users/42"
        String desc = request.getDescription(false);
        return desc.startsWith("uri=") ? desc.substring(4) : desc;
    }
}
