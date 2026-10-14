package com.example.fitchallenge.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.fitchallenge.service.SepayWebhookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Map;

/**
 * Webhook nhận biến động số dư từ SePay (sepay.vn) → tự động kích hoạt gói AI.
 *
 * Đặt dưới /api/ai-packages/payment/** nên đã được permitAll trong SecurityConfig.
 * Xác thực bằng HMAC-SHA256 (khuyến nghị) hoặc fallback API Key.
 *
 * Cấu hình SePay dashboard → Webhooks → URL:
 *   https://app.viway.id.vn/api/ai-packages/payment/webhook/sepay
 */
@Slf4j
@RestController
@RequestMapping("/api/ai-packages/payment/webhook")
@RequiredArgsConstructor
@Tag(name = "SePay Webhook", description = "Tự động kích hoạt gói khi nhận chuyển khoản")
public class SepayWebhookController {

    private final SepayWebhookService sepayWebhookService;
    private final ObjectMapper objectMapper;

    @Value("${app.payment.sepay.api-key:}")
    private String sepayApiKey;

    @Value("${app.payment.sepay.webhook-secret:}")
    private String sepayWebhookSecret;

    @PostMapping(value = "/sepay", consumes = MediaType.ALL_VALUE)
    @Operation(summary = "SePay webhook — biến động số dư")
    public ResponseEntity<Map<String, Object>> sepay(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestHeader(value = "X-SePay-Signature", required = false) String sepaySignature,
            @RequestHeader(value = "X-SePay-Timestamp", required = false) String sepayTimestamp,
            @RequestBody(required = false) String rawBody) {

        if (!hasWebhookAuthConfigured()) {
            log.error("SePay webhook bị gọi nhưng chưa cấu hình SEPAY_WEBHOOK_SECRET hoặc SEPAY_API_KEY — từ chối");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("success", false, "message", "webhook not configured"));
        }

        if (rawBody == null || rawBody.isBlank()) {
            log.warn("SePay webhook: payload rỗng");
            return ResponseEntity.ok(Map.of("success", false, "message", "empty payload"));
        }

        if (!isAuthorized(rawBody, authorization, sepaySignature, sepayTimestamp)) {
            log.warn("SePay webhook: xác thực thất bại (auth={}, signaturePresent={}, timestamp={})",
                    authorization != null ? "present" : "missing",
                    sepaySignature != null && !sepaySignature.isBlank(),
                    sepayTimestamp);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "unauthorized"));
        }

        try {
            Map<String, Object> payload = objectMapper.readValue(
                    rawBody, new TypeReference<Map<String, Object>>() {});
            log.info("SePay webhook received: ref={}, code={}, transferType={}, amount={}, content={}",
                    payload.get("referenceCode"), payload.get("code"), payload.get("transferType"),
                    payload.get("transferAmount"), payload.get("content"));

            SepayWebhookService.Result r = sepayWebhookService.handle(payload);
            return ResponseEntity.ok(Map.of("success", r.success(), "message", r.message()));
        } catch (Exception e) {
            log.error("SePay webhook xử lý lỗi. rawBody={}", rawBody, e);
            // Trả 200 có success=false để SePay Dashboard hiển thị lỗi rõ, không rơi vào GlobalExceptionHandler 500.
            return ResponseEntity.ok(Map.of("success", false, "message", "error: " + e.getMessage()));
        }
    }

    private boolean hasWebhookAuthConfigured() {
        return (sepayWebhookSecret != null && !sepayWebhookSecret.isBlank())
                || (sepayApiKey != null && !sepayApiKey.isBlank());
    }

    private boolean isAuthorized(String rawBody, String authorization,
                                 String sepaySignature, String sepayTimestamp) {
        if (sepayWebhookSecret != null && !sepayWebhookSecret.isBlank()) {
            return verifyHmac(rawBody, sepaySignature, sepayTimestamp);
        }

        String expected = "Apikey " + sepayApiKey;
        return authorization != null && MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                authorization.trim().getBytes(StandardCharsets.UTF_8));
    }

    private boolean verifyHmac(String rawBody, String signature, String timestamp) {
        if (signature == null || signature.isBlank() || timestamp == null || timestamp.isBlank()) {
            return false;
        }

        long signedAt;
        try {
            signedAt = Long.parseLong(timestamp.trim());
        } catch (NumberFormatException e) {
            return false;
        }

        long driftSeconds = Math.abs(Instant.now().getEpochSecond() - signedAt);
        if (driftSeconds > 300) {
            log.warn("SePay webhook: timestamp lệch {} giây", driftSeconds);
            return false;
        }

        String expected = "sha256=" + hmacSha256(sepayWebhookSecret, timestamp.trim() + "." + rawBody);
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                signature.trim().getBytes(StandardCharsets.UTF_8));
    }

    private String hmacSha256(String secret, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Cannot verify SePay webhook signature", e);
        }
    }
}
