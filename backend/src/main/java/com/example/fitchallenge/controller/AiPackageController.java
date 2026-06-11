package com.example.fitchallenge.controller;

import com.example.fitchallenge.service.AiPackageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller: AI Packages (public + authenticated)
 * - List gói (public)
 * - Subscribe bằng VNPay (authenticated)
 * - Validate promo code (authenticated)
 * - VNPay callback (public — VNPay gọi về)
 */
@RestController
@RequestMapping("/api/ai-packages")
@RequiredArgsConstructor
@Tag(name = "AI Packages", description = "Gói AI và thanh toán")
public class AiPackageController {

    private final AiPackageService aiPackageService;

    // ── Public ────────────────────────────────────────────────────────────────

    @GetMapping
    @Operation(summary = "Danh sách gói AI (public)")
    public ResponseEntity<List<Map<String, Object>>> listPackages() {
        return ResponseEntity.ok(aiPackageService.listActivePackages());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Chi tiết gói AI")
    public ResponseEntity<Map<String, Object>> getPackage(@PathVariable Long id) {
        return ResponseEntity.ok(aiPackageService.getPackageById(id));
    }

    // ── Authenticated ─────────────────────────────────────────────────────────

    /**
     * POST /api/ai-packages/{id}/subscribe
     * Body: { "promoCode": "SUMMER50", "returnUrl": "https://..." }
     * Trả về { paymentUrl, txnRef } hoặc direct activation nếu gói miễn phí.
     */
    @PostMapping("/{id}/subscribe")
    @Operation(summary = "Mua / nâng cấp gói AI")
    public ResponseEntity<Map<String, Object>> subscribe(
            @PathVariable Long id,
            @RequestHeader("userId") Long userId,
            @RequestBody(required = false) Map<String, Object> body) {
        String promoCode  = body != null ? (String) body.get("promoCode")  : null;
        String returnUrl  = body != null ? (String) body.get("returnUrl")  : null;
        return ResponseEntity.ok(
                aiPackageService.initiateVnpaySubscription(userId, id, promoCode, returnUrl));
    }

    /**
     * GET /api/ai-packages/payment/result
     * VNPay redirect sau thanh toán — forward params về FE.
     */
    @GetMapping("/payment/result")
    @Operation(summary = "VNPay return URL callback")
    public ResponseEntity<Map<String, Object>> vnpayReturn(
            @RequestParam Map<String, String> params) {
        return ResponseEntity.ok(aiPackageService.confirmVnpayPayment(new java.util.HashMap<>(params)));
    }

    /**
     * POST /api/ai-packages/payment/ipn
     * VNPay IPN (server-to-server notification).
     */
    @PostMapping("/payment/ipn")
    @Operation(summary = "VNPay IPN webhook")
    public ResponseEntity<String> vnpayIpn(@RequestParam Map<String, String> params) {
        Map<String, Object> result = aiPackageService.confirmVnpayPayment(new java.util.HashMap<>(params));
        return ResponseEntity.ok(Boolean.TRUE.equals(result.get("success")) ? "00" : "99");
    }

    /**
     * POST /api/ai-packages/promo/validate
     * Body: { "code": "SUMMER50", "packageId": 2 }
     */
    @PostMapping("/promo/validate")
    @Operation(summary = "Kiểm tra mã khuyến mãi")
    public ResponseEntity<Map<String, Object>> validatePromo(
            @RequestBody Map<String, Object> body) {
        String code     = (String) body.get("code");
        Long packageId  = body.get("packageId") != null
                          ? ((Number) body.get("packageId")).longValue() : null;
        return ResponseEntity.ok(aiPackageService.validatePromoCode(code, packageId));
    }
}
