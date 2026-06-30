package com.example.fitchallenge.service;

import java.util.List;
import java.util.Map;

public interface AiPackageService {
    List<Map<String, Object>> listActivePackages();
    Map<String, Object> getPackageById(Long id);

    /** Mua gói bằng VNPay — trả về payment URL. clientIp dùng cho vnp_IpAddr. */
    Map<String, Object> initiateVnpaySubscription(Long userId, Long packageId, String promoCode, String returnUrl, String clientIp);

    /** Xác nhận thanh toán thành công từ VNPay callback */
    Map<String, Object> confirmVnpayPayment(Map<String, String> vnpayParams);

    /** Admin: gán gói trực tiếp cho user (không qua thanh toán) */
    Map<String, Object> adminAssignPackage(Long userId, Long packageId, Integer durationDays);

    /** Admin: reset lượt AI thủ công */
    Map<String, Object> adminResetUsage(Long userId);

    // ── Promo code ──
    Map<String, Object> validatePromoCode(String code, Long packageId);

    /** Admin: tạo promo code */
    Map<String, Object> createPromoCode(Map<String, Object> request);

    /** Admin: list tất cả promo codes */
    List<Map<String, Object>> listPromoCodes();

    // ── Admin CRUD packages ──
    Map<String, Object> createPackage(Map<String, Object> request);
    Map<String, Object> updatePackage(Long id, Map<String, Object> request);
    void deletePackage(Long id);
}
