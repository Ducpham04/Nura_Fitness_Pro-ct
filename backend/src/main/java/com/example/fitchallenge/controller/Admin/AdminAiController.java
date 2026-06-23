package com.example.fitchallenge.controller.Admin;

import com.example.fitchallenge.repository.User.UserRepository;
import com.example.fitchallenge.service.AiPackageService;
import com.example.fitchallenge.service.AiUsageService;
import com.example.fitchallenge.service.PaymentConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Admin Controller: Quản lý gói AI, promo code, và lượt AI của user.
 * Tất cả routes yêu cầu role ADMIN (bảo vệ bởi SecurityConfig).
 */
@RestController
@RequestMapping("/api/admin/ai")
@RequiredArgsConstructor
@Tag(name = "Admin - AI Management", description = "Quản lý gói AI, promo code, lượt dùng")
public class AdminAiController {

    private final AiPackageService aiPackageService;
    private final AiUsageService aiUsageService;
    private final UserRepository userRepository;
    private final PaymentConfigService paymentConfigService;

    // ── Packages CRUD ─────────────────────────────────────────────────────────

    @GetMapping("/packages")
    @Operation(summary = "List tất cả gói AI")
    public ResponseEntity<List<Map<String, Object>>> listPackages() {
        return ResponseEntity.ok(aiPackageService.listActivePackages());
    }

    @PostMapping("/packages")
    @Operation(summary = "Tạo gói AI mới")
    public ResponseEntity<Map<String, Object>> createPackage(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(aiPackageService.createPackage(body));
    }

    @PutMapping("/packages/{id}")
    @Operation(summary = "Cập nhật gói AI")
    public ResponseEntity<Map<String, Object>> updatePackage(
            @PathVariable Long id, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(aiPackageService.updatePackage(id, body));
    }

    @DeleteMapping("/packages/{id}")
    @Operation(summary = "Vô hiệu hóa gói AI (soft delete)")
    public ResponseEntity<Map<String, Object>> deletePackage(@PathVariable Long id) {
        aiPackageService.deletePackage(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Gói đã bị vô hiệu hóa."));
    }

    // ── Assign package to user ────────────────────────────────────────────────

    /**
     * PUT /api/admin/ai/users/{userId}/package
     * Body: { "packageId": 2, "durationDays": 30 }
     */
    @PutMapping("/users/{userId}/package")
    @Operation(summary = "Gán gói AI cho user (không cần thanh toán)")
    public ResponseEntity<Map<String, Object>> assignPackage(
            @PathVariable Long userId,
            @RequestBody Map<String, Object> body) {
        Long packageId   = ((Number) body.get("packageId")).longValue();
        Integer duration = body.get("durationDays") != null
                           ? ((Number) body.get("durationDays")).intValue() : null;
        return ResponseEntity.ok(aiPackageService.adminAssignPackage(userId, packageId, duration));
    }

    /**
     * PUT /api/admin/ai/users/{userId}/reset-usage
     * Reset lượt AI về 0 cho user.
     */
    @PutMapping("/users/{userId}/reset-usage")
    @Operation(summary = "Reset lượt AI thủ công cho user")
    public ResponseEntity<Map<String, Object>> resetUsage(@PathVariable Long userId) {
        return ResponseEntity.ok(aiPackageService.adminResetUsage(userId));
    }

    /**
     * GET /api/admin/ai/users/{userId}/usage
     * Xem thông tin lượt AI của user.
     */
    @GetMapping("/users/{userId}/usage")
    @Operation(summary = "Xem thông tin lượt AI của user")
    public ResponseEntity<Map<String, Object>> getUserUsage(@PathVariable Long userId) {
        return ResponseEntity.ok(aiUsageService.getUsageInfo(userId));
    }

    /**
     * PUT /api/admin/ai/users/{userId}/credit
     * Body (mọi field optional): { "quota": 200, "used": 0, "addCredits": 50 }
     *   quota < 0 = vô hạn. addCredits = cấp thêm (giảm 'đã dùng').
     */
    @PutMapping("/users/{userId}/credit")
    @Operation(summary = "Admin chỉnh credit/quota của user")
    public ResponseEntity<Map<String, Object>> adjustCredit(
            @PathVariable Long userId, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(aiUsageService.adminAdjustCredit(
                userId, num(body.get("quota")), num(body.get("used")), num(body.get("addCredits"))));
    }

    /**
     * GET /api/admin/ai/usage-report
     * Báo cáo dùng AI của tất cả user (gói, credit, token thật).
     */
    @GetMapping("/usage-report")
    @Operation(summary = "Báo cáo dùng AI của tất cả user")
    public ResponseEntity<List<Map<String, Object>>> usageReport() {
        return ResponseEntity.ok(aiUsageService.getAiUsageReport());
    }

    /** Parse số từ JSON body (Integer/Double/String) → Integer, null nếu thiếu. */
    private static Integer num(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.intValue();
        try { return Integer.valueOf(o.toString().trim()); } catch (Exception e) { return null; }
    }

    // ── Promo codes ───────────────────────────────────────────────────────────

    @GetMapping("/promo-codes")
    @Operation(summary = "Danh sách mã khuyến mãi")
    public ResponseEntity<List<Map<String, Object>>> listPromoCodes() {
        return ResponseEntity.ok(aiPackageService.listPromoCodes());
    }

    /**
     * POST /api/admin/ai/promo-codes
     * Body: {
     *   "code": "SUMMER50",
     *   "description": "Giảm 50% hè 2026",
     *   "discountPercent": 50,
     *   "bonusCredits": 0,
     *   "maxUses": 100,
     *   "validUntil": "2026-09-01T00:00:00+07:00",
     *   "targetPackageId": 2
     * }
     */
    @PostMapping("/promo-codes")
    @Operation(summary = "Tạo mã khuyến mãi mới")
    public ResponseEntity<Map<String, Object>> createPromoCode(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(aiPackageService.createPromoCode(body));
    }

    // ── Revenue Report ────────────────────────────────────────────────────────

    /**
     * GET /api/admin/revenue/summary
     * Báo cáo doanh thu: số user có gói trả phí × giá gói = MRR ước tính
     */
    @GetMapping("/revenue/summary")
    @Operation(summary = "Báo cáo doanh thu gói AI")
    public ResponseEntity<Map<String, Object>> revenueSummary() {
        List<Object[]> rows = userRepository.countPaidUsersByPackage();
        long activePaidUsers = userRepository.countActivePaidUsers(ZonedDateTime.now());

        List<Map<String, Object>> byPackage = new ArrayList<>();
        long totalMrr = 0;
        long totalPaidUsers = 0;

        for (Object[] row : rows) {
            String code     = (String) row[0];
            long   count    = ((Number) row[1]).longValue();
            int    price    = ((Number) row[2]).intValue();
            long   revenue  = count * price;
            totalMrr       += revenue;
            totalPaidUsers += count;

            Map<String, Object> pkg = new LinkedHashMap<>();
            pkg.put("packageCode", code);
            pkg.put("userCount", count);
            pkg.put("priceVnd", price);
            pkg.put("mrrVnd", revenue);
            byPackage.add(pkg);
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalPaidUsers", totalPaidUsers);
        summary.put("activePaidUsers", activePaidUsers);
        summary.put("totalMrrVnd", totalMrr);
        summary.put("byPackage", byPackage);
        summary.put("generatedAt", ZonedDateTime.now().toString());
        return ResponseEntity.ok(summary);
    }

    // ── Payment / QR Config ───────────────────────────────────────────────────

    /**
     * GET /api/admin/config/payment
     * Xem cấu hình thanh toán hiện tại (QR URL, bank info)
     */
    @GetMapping("/config/payment")
    @Operation(summary = "Xem cấu hình thanh toán (QR, bank info)")
    public ResponseEntity<Map<String, Object>> getPaymentConfig() {
        Map<String, Object> cfg = new LinkedHashMap<>();
        cfg.put("qrUrl", paymentConfigService.getQrUrl());
        cfg.put("bankInfo", paymentConfigService.getBankInfo());
        return ResponseEntity.ok(cfg);
    }

    /**
     * PUT /api/admin/config/payment
     * Body: { "qrUrl": "https://...", "bankInfo": "MB Bank - 0123456789 - Nguyen Van A" }
     */
    @PutMapping("/config/payment")
    @Operation(summary = "Cập nhật QR thanh toán và thông tin ngân hàng")
    public ResponseEntity<Map<String, Object>> updatePaymentConfig(@RequestBody Map<String, Object> body) {
        if (body.containsKey("qrUrl"))   paymentConfigService.setQrUrl(String.valueOf(body.get("qrUrl")));
        if (body.containsKey("bankInfo")) paymentConfigService.setBankInfo(String.valueOf(body.get("bankInfo")));
        return ResponseEntity.ok(Map.of(
            "success", true,
            "qrUrl", paymentConfigService.getQrUrl(),
            "bankInfo", paymentConfigService.getBankInfo()
        ));
    }
}
