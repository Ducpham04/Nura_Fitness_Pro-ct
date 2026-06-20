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
     * Chỉ kiểm tra quota — không trừ credit.
     * Dùng khi muốn fail-fast trước khi gọi AI service tốn thời gian.
     * Nếu hết → ném QuotaExceededException.
     */
    void ensureQuota(Long userId, int cost);

    /**
     * Chỉ trừ credit — không kiểm tra quota.
     * Dùng sau khi AI service thành công (kết hợp với ensureQuota trước đó).
     */
    void consume(Long userId, int cost);

    /**
     * Reset lượt AI của user (dùng khi admin reset thủ công hoặc mua gói mới).
     */
    void resetUsage(Long userId);

    /**
     * Admin chỉnh credit/quota thủ công cho 1 user.
     * @param setQuota   nếu != null: đặt quota (số < 0 = vô hạn)
     * @param setUsed    nếu != null: đặt 'đã dùng' (floor 0)
     * @param addCredits nếu != null && != 0: cấp thêm credit (giảm 'đã dùng', floor 0)
     * @return usage info sau khi chỉnh (giống getUsageInfo)
     */
    java.util.Map<String, Object> adminAdjustCredit(Long userId, Integer setQuota, Integer setUsed, Integer addCredits);

    /**
     * Báo cáo dùng AI của TẤT CẢ user: gói, quota, đã dùng, còn lại, token thật (tháng/all-time).
     */
    java.util.List<java.util.Map<String, Object>> getAiUsageReport();
}
