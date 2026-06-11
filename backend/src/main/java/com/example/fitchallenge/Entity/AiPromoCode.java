package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.ZonedDateTime;

/**
 * Entity: AiPromoCode
 * Mã khuyến mãi: tặng credit hoặc giảm giá gói AI
 */
@Entity
@Table(name = "ai_promo_codes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiPromoCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(length = 255)
    private String description;

    /** Gói được áp dụng (null = tặng credit thêm, không gắn với gói cụ thể) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_package_id")
    private AiPackage targetPackage;

    /** Credit thêm khi dùng code này */
    @Column(name = "bonus_credits", nullable = false)
    private int bonusCredits = 0;

    /** % giảm giá cho gói (0-100) */
    @Column(name = "discount_percent", nullable = false)
    private int discountPercent = 0;

    /** Số lần tối đa được dùng (null = không giới hạn) */
    @Column(name = "max_uses")
    private Integer maxUses;

    @Column(name = "used_count", nullable = false)
    private int usedCount = 0;

    @Column(name = "valid_from", nullable = false)
    private ZonedDateTime validFrom = ZonedDateTime.now();

    @Column(name = "valid_until")
    private ZonedDateTime validUntil;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt = ZonedDateTime.now();

    /** Kiểm tra code có còn hiệu lực không */
    public boolean isValid() {
        if (!isActive) return false;
        ZonedDateTime now = ZonedDateTime.now();
        if (now.isBefore(validFrom)) return false;
        if (validUntil != null && now.isAfter(validUntil)) return false;
        if (maxUses != null && usedCount >= maxUses) return false;
        return true;
    }
}
