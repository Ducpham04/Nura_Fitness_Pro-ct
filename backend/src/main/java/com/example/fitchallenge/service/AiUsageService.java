package com.example.fitchallenge.service;

import java.util.Map;

public interface AiUsageService {

    /**
     * Trả thông tin usage hiện tại của user.
     * {packageCode, packageName, quota, used, remaining, resetAt, packageExpiresAt}
     */
    Map<String, Object> getUsageInfo(Long userId);

    /**
     * Kiểm tra còn đủ credit không, nếu đủ thì trừ ngay.
     * Nếu hết → ném QuotaExceededException.
     *
     * @param userId user thực hiện hành động
     * @param cost   credit cần trừ (xem AiCreditCost)
     */
    void ensureAndConsume(Long userId, int cost);

    /**
     * Reset lượt AI của user (dùng khi admin reset thủ công hoặc mua gói mới).
     */
    void resetUsage(Long userId);
}
