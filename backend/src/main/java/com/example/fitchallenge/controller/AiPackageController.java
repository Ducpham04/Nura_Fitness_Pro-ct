package com.example.fitchallenge.controller;

import com.example.fitchallenge.Security.AuthenticatedUserIdResolver;
import com.example.fitchallenge.repository.User.UserRepository;
import com.example.fitchallenge.service.AiPackageService;
import com.example.fitchallenge.service.EmailService;
import com.example.fitchallenge.service.PaymentConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
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
    private final AuthenticatedUserIdResolver authUser;
    private final PaymentConfigService paymentConfigService;
    private final EmailService emailService;
    private final UserRepository userRepository;

    @Value("${app.admin.email:pvanduc0403@gmail.com}")
    private String adminEmail;

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
            @RequestBody(required = false) Map<String, Object> body,
            HttpServletRequest request) {
        userId = authUser.resolve(userId);
        String promoCode  = body != null ? (String) body.get("promoCode")  : null;
        String returnUrl  = body != null ? (String) body.get("returnUrl")  : null;
        String clientIp   = getClientIp(request);
        return ResponseEntity.ok(
                aiPackageService.initiateVnpaySubscription(userId, id, promoCode, returnUrl, clientIp));
    }

    private String getClientIp(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        boolean fromProxy = "127.0.0.1".equals(remoteAddr)
                || "0:0:0:0:0:0:0:1".equals(remoteAddr)
                || "::1".equals(remoteAddr);
        if (fromProxy) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",")[0].trim();
            }
        }
        return remoteAddr;
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

    /** GET /api/ai-packages/payment-config — public, dùng trong upgrade modal */
    @GetMapping("/payment-config")
    @Operation(summary = "Cấu hình thanh toán (QR, bank info) — public")
    public ResponseEntity<Map<String, Object>> paymentConfig() {
        Map<String, Object> cfg = new LinkedHashMap<>();
        cfg.put("qrUrl", paymentConfigService.getQrUrl());
        cfg.put("bankInfo", paymentConfigService.getBankInfo());
        return ResponseEntity.ok(cfg);
    }

    /**
     * POST /api/ai-packages/notify-payment
     * User báo đã chuyển khoản → gửi email cho admin.
     * Body: { "packageId": 2, "note": "..." }
     */
    @PostMapping("/notify-payment")
    @Operation(summary = "Báo đã chuyển khoản — gửi email cho admin")
    public ResponseEntity<Map<String, Object>> notifyPayment(
            @RequestBody Map<String, Object> body,
            @RequestHeader(value = "userId", required = false) Long userId) {
        userId = authUser.resolve(userId);
        try {
            Long packageId = body.get("packageId") != null
                    ? ((Number) body.get("packageId")).longValue() : null;
            String note = body.get("note") != null ? String.valueOf(body.get("note")) : null;

            var user = userRepository.findById(userId)
                    .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("User not found"));

            // Lấy thông tin gói
            String packageName = "Không xác định";
            int priceVnd = 0;
            if (packageId != null) {
                var pkgs = aiPackageService.listActivePackages();
                var pkg = pkgs.stream()
                        .filter(p -> packageId.equals(((Number) p.get("id")).longValue()))
                        .findFirst().orElse(null);
                if (pkg != null) {
                    packageName = String.valueOf(pkg.get("name"));
                    priceVnd = pkg.get("priceVnd") != null ? ((Number) pkg.get("priceVnd")).intValue() : 0;
                }
            }

            emailService.sendPaymentNotificationToAdmin(
                    adminEmail,
                    user.getFullName(),
                    user.getEmail(),
                    userId,
                    packageName,
                    priceVnd,
                    note
            );

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Đã gửi thông báo cho admin. Chúng tôi sẽ kích hoạt gói trong vòng 24h."
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "message", "Không thể gửi thông báo: " + e.getMessage()
            ));
        }
    }
}
