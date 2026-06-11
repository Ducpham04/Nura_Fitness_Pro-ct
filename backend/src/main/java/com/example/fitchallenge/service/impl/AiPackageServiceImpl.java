package com.example.fitchallenge.service.impl;

import com.example.fitchallenge.Entity.AiPackage;
import com.example.fitchallenge.Entity.AiPromoCode;
import com.example.fitchallenge.Entity.Transaction;
import com.example.fitchallenge.Entity.User;
import com.example.fitchallenge.repository.AiPackageRepository;
import com.example.fitchallenge.repository.AiPromoCodeRepository;
import com.example.fitchallenge.repository.User.UserRepository;
import com.example.fitchallenge.service.AiPackageService;
import com.example.fitchallenge.service.AiUsageService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiPackageServiceImpl implements AiPackageService {

    private final AiPackageRepository packageRepo;
    private final AiPromoCodeRepository promoRepo;
    private final UserRepository userRepo;
    private final AiUsageService aiUsageService;

    @Value("${vnpay.tmn-code:}")
    private String vnpayTmnCode;

    @Value("${vnpay.hash-secret:}")
    private String vnpayHashSecret;

    @Value("${vnpay.url:https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}")
    private String vnpayUrl;

    @Value("${vnpay.return-url:http://localhost:5173/payment/result}")
    private String returnUrl;

    // ── List packages ─────────────────────────────────────────────────────────

    @Override
    public List<Map<String, Object>> listActivePackages() {
        return packageRepo.findByIsActiveTrueOrderBySortOrderAsc()
                .stream().map(this::toPackageMap)
                .collect(Collectors.toList());
    }

    @Override
    public Map<String, Object> getPackageById(Long id) {
        return toPackageMap(packageRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Package not found: " + id)));
    }

    // ── VNPay Subscribe ───────────────────────────────────────────────────────

    @Override
    @Transactional
    public Map<String, Object> initiateVnpaySubscription(Long userId, Long packageId,
                                                          String promoCode, String clientReturnUrl) {
        User user = findUser(userId);
        AiPackage pkg = packageRepo.findById(packageId)
                .orElseThrow(() -> new EntityNotFoundException("Package not found: " + packageId));

        // Tính giá sau promo
        int finalPrice = pkg.getPriceVnd();
        int bonusCredits = 0;
        AiPromoCode promo = null;

        if (promoCode != null && !promoCode.isBlank()) {
            promo = promoRepo.findByCodeIgnoreCase(promoCode.trim())
                    .orElseThrow(() -> new IllegalArgumentException("Mã khuyến mãi không tồn tại: " + promoCode));
            if (!promo.isValid()) {
                throw new IllegalArgumentException("Mã khuyến mãi đã hết hạn hoặc hết lượt sử dụng.");
            }
            if (promo.getDiscountPercent() > 0) {
                finalPrice = finalPrice - (finalPrice * promo.getDiscountPercent() / 100);
            }
            bonusCredits = promo.getBonusCredits();
        }

        // Nếu Free (0đ) → gán thẳng không cần thanh toán
        if (finalPrice <= 0) {
            applyPackageToUser(user, pkg, bonusCredits, promo);
            Map<String, Object> res = new LinkedHashMap<>();
            res.put("success", true);
            res.put("method", "direct");
            res.put("message", "Gói đã được kích hoạt thành công.");
            res.put("packageCode", pkg.getCode());
            return res;
        }

        // Build VNPay URL
        String txnRef = "AI_" + userId + "_" + System.currentTimeMillis();
        String paymentUrl = buildVnpayUrl(txnRef, finalPrice,
                "Nang cap goi " + pkg.getName() + " - User " + userId,
                clientReturnUrl != null ? clientReturnUrl : returnUrl);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", true);
        res.put("method", "vnpay");
        res.put("paymentUrl", paymentUrl);
        res.put("txnRef", txnRef);
        res.put("amount", finalPrice);
        res.put("packageCode", pkg.getCode());
        res.put("bonusCredits", bonusCredits);

        // Lưu txnRef vào session/state để sau confirm biết user mua gói nào
        // (dùng description của Transaction làm scratchpad)
        Transaction tx = new Transaction();
        tx.setUser(user);
        tx.setType("ai_package_pending");
        tx.setAmount(new BigDecimal(finalPrice));
        tx.setReference(txnRef);
        tx.setStatus(Transaction.TransactionStatus.PENDING);
        tx.setDescription("pkg:" + packageId + ";bonus:" + bonusCredits
                          + (promo != null ? ";promo:" + promo.getId() : ""));
        tx.setCreatedAt(ZonedDateTime.now());
        // Lưu transaction — cần TransactionRepository; tạm dùng JPQL trực tiếp qua userRepo context
        // → Sẽ thêm TransactionRepository sau. Hiện tại log và return URL trước.
        log.info("VNPay subscription initiated: txnRef={} userId={} pkg={} amount={}",
                 txnRef, userId, pkg.getCode(), finalPrice);

        return res;
    }

    @Override
    @Transactional
    public Map<String, Object> confirmVnpayPayment(Map<String, String> params) {
        String responseCode = params.get("vnp_ResponseCode");
        String txnRef       = params.get("vnp_TxnRef");
        String secureHash   = params.remove("vnp_SecureHash");
        params.remove("vnp_SecureHashType");

        // Verify hash
        if (!verifyVnpayHash(params, secureHash)) {
            return Map.of("success", false, "message", "Chữ ký không hợp lệ.");
        }

        if (!"00".equals(responseCode)) {
            return Map.of("success", false, "message", "Thanh toán thất bại (code=" + responseCode + ").");
        }

        // Parse txnRef: "AI_{userId}_{timestamp}"
        if (txnRef == null || !txnRef.startsWith("AI_")) {
            return Map.of("success", false, "message", "Mã giao dịch không hợp lệ.");
        }
        try {
            String[] parts = txnRef.split("_");
            Long userId = Long.parseLong(parts[1]);
            // TODO: lookup pending transaction by txnRef to get packageId & bonusCredits
            // Hiện tại trả success — FE redirect về dashboard; admin confirm gói qua admin endpoint
            return Map.of("success", true, "message", "Thanh toán thành công.", "txnRef", txnRef, "userId", userId);
        } catch (Exception e) {
            log.error("VNPay confirm parse error: txnRef={}", txnRef, e);
            return Map.of("success", false, "message", "Không thể xác nhận giao dịch.");
        }
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public Map<String, Object> adminAssignPackage(Long userId, Long packageId, Integer durationDays) {
        User user = findUser(userId);
        AiPackage pkg = packageRepo.findById(packageId)
                .orElseThrow(() -> new EntityNotFoundException("Package not found: " + packageId));
        int days = durationDays != null ? durationDays : pkg.getDurationDays();
        applyPackageToUser(user, pkg, 0, null, days);
        log.info("Admin assigned package {} to userId={}", pkg.getCode(), userId);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", true);
        res.put("message", "Đã gán gói " + pkg.getName() + " cho user " + user.getUserName());
        res.put("packageCode", pkg.getCode());
        res.put("expiresAt", fmt(user.getAiPackageExpiresAt()));
        return res;
    }

    @Override
    @Transactional
    public Map<String, Object> adminResetUsage(Long userId) {
        aiUsageService.resetUsage(userId);
        return Map.of("success", true, "message", "Đã reset lượt AI cho userId=" + userId);
    }

    // ── Promo code ────────────────────────────────────────────────────────────

    @Override
    public Map<String, Object> validatePromoCode(String code, Long packageId) {
        AiPromoCode promo = promoRepo.findByCodeIgnoreCase(code)
                .orElseThrow(() -> new EntityNotFoundException("Mã không tồn tại: " + code));
        if (!promo.isValid()) {
            throw new IllegalArgumentException("Mã không còn hiệu lực.");
        }
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("valid", true);
        res.put("discountPercent", promo.getDiscountPercent());
        res.put("bonusCredits", promo.getBonusCredits());
        res.put("description", promo.getDescription());
        return res;
    }

    @Override
    @Transactional
    public Map<String, Object> createPromoCode(Map<String, Object> req) {
        AiPromoCode promo = new AiPromoCode();
        promo.setCode(((String) req.get("code")).toUpperCase().trim());
        promo.setDescription((String) req.getOrDefault("description", ""));
        promo.setBonusCredits(((Number) req.getOrDefault("bonusCredits", 0)).intValue());
        promo.setDiscountPercent(((Number) req.getOrDefault("discountPercent", 0)).intValue());
        if (req.get("maxUses") != null) {
            promo.setMaxUses(((Number) req.get("maxUses")).intValue());
        }
        if (req.get("validUntil") != null) {
            promo.setValidUntil(ZonedDateTime.parse((String) req.get("validUntil")));
        }
        if (req.get("targetPackageId") != null) {
            Long pkgId = ((Number) req.get("targetPackageId")).longValue();
            packageRepo.findById(pkgId).ifPresent(promo::setTargetPackage);
        }
        promoRepo.save(promo);
        return Map.of("success", true, "code", promo.getCode(), "id", promo.getId());
    }

    @Override
    public List<Map<String, Object>> listPromoCodes() {
        return promoRepo.findAll().stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("code", p.getCode());
            m.put("description", p.getDescription());
            m.put("discountPercent", p.getDiscountPercent());
            m.put("bonusCredits", p.getBonusCredits());
            m.put("maxUses", p.getMaxUses());
            m.put("usedCount", p.getUsedCount());
            m.put("isActive", p.isActive());
            m.put("validFrom", fmt(p.getValidFrom()));
            m.put("validUntil", fmt(p.getValidUntil()));
            return m;
        }).collect(Collectors.toList());
    }

    // ── Admin CRUD packages ───────────────────────────────────────────────────

    @Override
    @Transactional
    public Map<String, Object> createPackage(Map<String, Object> req) {
        AiPackage pkg = AiPackage.builder()
                .code(((String) req.get("code")).toUpperCase().trim())
                .name((String) req.get("name"))
                .aiQuota(((Number) req.get("aiQuota")).intValue())
                .priceVnd(((Number) req.getOrDefault("priceVnd", 0)).intValue())
                .durationDays(((Number) req.getOrDefault("durationDays", 30)).intValue())
                .sortOrder(((Number) req.getOrDefault("sortOrder", 99)).intValue())
                .isActive(true)
                .build();
        packageRepo.save(pkg);
        return toPackageMap(pkg);
    }

    @Override
    @Transactional
    public Map<String, Object> updatePackage(Long id, Map<String, Object> req) {
        AiPackage pkg = packageRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Package not found: " + id));
        if (req.containsKey("name"))        pkg.setName((String) req.get("name"));
        if (req.containsKey("aiQuota"))     pkg.setAiQuota(((Number) req.get("aiQuota")).intValue());
        if (req.containsKey("priceVnd"))    pkg.setPriceVnd(((Number) req.get("priceVnd")).intValue());
        if (req.containsKey("durationDays")) pkg.setDurationDays(((Number) req.get("durationDays")).intValue());
        if (req.containsKey("sortOrder"))   pkg.setSortOrder(((Number) req.get("sortOrder")).intValue());
        if (req.containsKey("isActive"))    pkg.setActive((Boolean) req.get("isActive"));
        packageRepo.save(pkg);
        return toPackageMap(pkg);
    }

    @Override
    @Transactional
    public void deletePackage(Long id) {
        AiPackage pkg = packageRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Package not found: " + id));
        if ("FREE".equals(pkg.getCode())) {
            throw new IllegalArgumentException("Không thể xóa gói FREE.");
        }
        pkg.setActive(false);
        packageRepo.save(pkg);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void applyPackageToUser(User user, AiPackage pkg, int bonusCredits, AiPromoCode promo) {
        applyPackageToUser(user, pkg, bonusCredits, promo, pkg.getDurationDays());
    }

    private void applyPackageToUser(User user, AiPackage pkg, int bonusCredits,
                                     AiPromoCode promo, int durationDays) {
        user.setAiPackage(pkg);
        user.setAiQuota(pkg.getAiQuota() == -1 ? -1 : pkg.getAiQuota() + bonusCredits);
        user.setAiUsed(0);
        user.setAiResetAt(ZonedDateTime.now().plusDays(durationDays));

        if (pkg.getPriceVnd() > 0) {
            user.setAiPackageExpiresAt(ZonedDateTime.now().plusDays(durationDays));
        } else {
            user.setAiPackageExpiresAt(null); // FREE không hết hạn
        }

        // Tăng usedCount của promo code
        if (promo != null) {
            promo.setUsedCount(promo.getUsedCount() + 1);
            promoRepo.save(promo);
        }

        userRepo.save(user);
    }

    private User findUser(Long userId) {
        return userRepo.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
    }

    private Map<String, Object> toPackageMap(AiPackage p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("code", p.getCode());
        m.put("name", p.getName());
        m.put("aiQuota", p.getAiQuota());
        m.put("priceVnd", p.getPriceVnd());
        m.put("durationDays", p.getDurationDays());
        m.put("isActive", p.isActive());
        m.put("sortOrder", p.getSortOrder());
        return m;
    }

    private String fmt(ZonedDateTime dt) {
        return dt != null ? dt.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME) : null;
    }

    // ── VNPay helpers ─────────────────────────────────────────────────────────

    private String buildVnpayUrl(String txnRef, int amount, String orderInfo, String callbackUrl) {
        if (vnpayTmnCode == null || vnpayTmnCode.isBlank()) {
            throw new IllegalStateException("VNPay chưa được cấu hình. Liên hệ admin.");
        }
        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Version",    "2.1.0");
        params.put("vnp_Command",    "pay");
        params.put("vnp_TmnCode",    vnpayTmnCode);
        params.put("vnp_Amount",     String.valueOf(amount * 100L));
        params.put("vnp_CurrCode",   "VND");
        params.put("vnp_TxnRef",     txnRef);
        params.put("vnp_OrderInfo",  orderInfo);
        params.put("vnp_OrderType",  "billpayment");
        params.put("vnp_Locale",     "vn");
        params.put("vnp_ReturnUrl",  callbackUrl);
        params.put("vnp_IpAddr",     "127.0.0.1");
        params.put("vnp_CreateDate", new SimpleDateFormat("yyyyMMddHHmmss").format(new Date()));

        // Build query string
        StringBuilder query  = new StringBuilder();
        StringBuilder hashData = new StringBuilder();
        for (Map.Entry<String, String> e : params.entrySet()) {
            String enc = URLEncoder.encode(e.getValue(), StandardCharsets.US_ASCII);
            hashData.append(e.getKey()).append('=').append(enc).append('&');
            query.append(e.getKey()).append('=').append(enc).append('&');
        }
        hashData.deleteCharAt(hashData.length() - 1);
        String hash = hmacSha512(vnpayHashSecret, hashData.toString());
        query.append("vnp_SecureHashType=SHA512&vnp_SecureHash=").append(hash);
        return vnpayUrl + "?" + query;
    }

    private boolean verifyVnpayHash(Map<String, String> params, String receivedHash) {
        if (vnpayHashSecret == null || vnpayHashSecret.isBlank()) return true; // sandbox skip
        Map<String, String> sorted = new TreeMap<>(params);
        StringBuilder data = new StringBuilder();
        for (Map.Entry<String, String> e : sorted.entrySet()) {
            if (e.getValue() != null && !e.getValue().isEmpty()) {
                data.append(e.getKey()).append('=')
                    .append(URLEncoder.encode(e.getValue(), StandardCharsets.US_ASCII))
                    .append('&');
            }
        }
        if (data.length() > 0) data.deleteCharAt(data.length() - 1);
        String expected = hmacSha512(vnpayHashSecret, data.toString());
        return expected.equalsIgnoreCase(receivedHash);
    }

    private String hmacSha512(String key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] bytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("HMAC error", e);
        }
    }
}
