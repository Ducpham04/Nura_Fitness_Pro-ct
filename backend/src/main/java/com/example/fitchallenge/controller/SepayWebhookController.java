package com.example.fitchallenge.controller;

import com.example.fitchallenge.service.SepayWebhookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Webhook nhận biến động số dư từ SePay (sepay.vn) → tự động kích hoạt gói AI.
 *
 * Đặt dưới /api/ai-packages/payment/** nên đã được permitAll trong SecurityConfig.
 * Xác thực bằng header: Authorization: Apikey <SEPAY_API_KEY>.
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

    @Value("${app.payment.sepay.api-key:}")
    private String sepayApiKey;

    @PostMapping("/sepay")
    @Operation(summary = "SePay webhook — biến động số dư")
    public ResponseEntity<Map<String, Object>> sepay(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody Map<String, Object> payload) {

        // ── Xác thực: bắt buộc cấu hình SEPAY_API_KEY, khớp "Apikey <key>" ──
        if (sepayApiKey == null || sepayApiKey.isBlank()) {
            log.error("SePay webhook bị gọi nhưng SEPAY_API_KEY chưa cấu hình — từ chối");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("success", false, "message", "webhook not configured"));
        }
        String expected = "Apikey " + sepayApiKey;
        if (authorization == null || !expected.equals(authorization.trim())) {
            log.warn("SePay webhook: Authorization sai hoặc thiếu");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "unauthorized"));
        }

        try {
            SepayWebhookService.Result r = sepayWebhookService.handle(payload);
            return ResponseEntity.ok(Map.of("success", r.success(), "message", r.message()));
        } catch (Exception e) {
            log.error("SePay webhook xử lý lỗi: {}", e.getMessage(), e);
            // Trả 200 để SePay không retry vô hạn với lỗi không thể tự phục hồi;
            // sự cố đã được log để xử lý thủ công qua tab admin.
            return ResponseEntity.ok(Map.of("success", false, "message", "error: " + e.getMessage()));
        }
    }
}
