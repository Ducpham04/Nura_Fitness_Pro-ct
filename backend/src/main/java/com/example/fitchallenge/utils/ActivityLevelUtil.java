package com.example.fitchallenge.utils;

import java.math.BigDecimal;
import java.util.Locale;

/**
 * Chuẩn hoá activity level về MỘT bộ giá trị canonical, dùng chung toàn hệ thống.
 *
 * Bối cảnh: dữ liệu trong DB tồn tại NHIỀU biến thể — FE onboarding gửi
 * "sedentary|light|moderate|very", chỗ khác lưu "lightly_active|very_active",
 * BodyMetricsCalculator cũ chỉ nhận "lightly active" (dấu cách)... → mọi user
 * không-sedentary từng rơi về hệ số 1.2 khiến TDEE thấp hơn thực 13-37%.
 *
 * Canonical: sedentary | lightly_active | moderate | very_active | extra_active
 * (trùng đúng ActivityLevel enum của ai-service/app/schemas/nutrition.py).
 */
public final class ActivityLevelUtil {

    private ActivityLevelUtil() {}

    public static final String SEDENTARY      = "sedentary";
    public static final String LIGHTLY_ACTIVE = "lightly_active";
    public static final String MODERATE       = "moderate";
    public static final String VERY_ACTIVE    = "very_active";
    public static final String EXTRA_ACTIVE   = "extra_active";

    /**
     * Chuẩn hoá mọi biến thể về canonical. Không nhận diện được → mặc định
     * sedentary (bảo thủ: thà kê thiếu calo còn hơn kê dư).
     */
    public static String normalize(String raw) {
        if (raw == null) return SEDENTARY;
        String v = raw.toLowerCase(Locale.ROOT).trim().replace('-', '_').replace(' ', '_');
        return switch (v) {
            case "sedentary", "ít_vận_động", "it_van_dong", "1" -> SEDENTARY;
            case "light", "lightly", "lightly_active", "vận_động_nhẹ", "van_dong_nhe", "2" -> LIGHTLY_ACTIVE;
            case "moderate", "moderately_active", "vận_động_vừa", "van_dong_vua", "vận_động_đều", "3" -> MODERATE;
            case "very", "very_active", "active", "vận_động_nhiều", "van_dong_nhieu", "4" -> VERY_ACTIVE;
            case "extra", "extra_active", "athlete", "vận_động_rất_nhiều", "5" -> EXTRA_ACTIVE;
            default -> SEDENTARY;
        };
    }

    /** Hệ số PAL chuẩn (Mifflin-St Jeor / WHO-FAO) theo canonical level. */
    public static BigDecimal factor(String raw) {
        return switch (normalize(raw)) {
            case LIGHTLY_ACTIVE -> new BigDecimal("1.375");
            case MODERATE       -> new BigDecimal("1.55");
            case VERY_ACTIVE    -> new BigDecimal("1.725");
            case EXTRA_ACTIVE   -> new BigDecimal("1.9");
            default             -> new BigDecimal("1.2");
        };
    }

    /**
     * Giá trị gửi sang ai-service (khớp ActivityLevel enum của Pydantic).
     * fallback: dùng khi user chưa khai (null/blank) — caller quyết định
     * (vd suy từ goal như hành vi cũ) thay vì mặc định cứng.
     */
    public static String toAiEnum(String raw, String fallback) {
        if (raw == null || raw.isBlank()) return fallback;
        return normalize(raw);
    }
}
