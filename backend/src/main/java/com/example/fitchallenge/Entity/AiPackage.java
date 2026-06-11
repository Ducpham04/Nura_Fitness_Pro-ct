package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.ZonedDateTime;

/**
 * Entity: AiPackage
 * Định nghĩa gói AI: FREE / PLUS / PRO
 * ai_quota = -1 → vô hạn
 */
@Entity
@Table(name = "ai_packages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiPackage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** FREE | PLUS | PRO */
    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    /** Credit/tháng; -1 = vô hạn */
    @Column(name = "ai_quota", nullable = false)
    private int aiQuota;

    /** Giá VND */
    @Column(name = "price_vnd", nullable = false)
    private int priceVnd;

    /** Số ngày hiệu lực mỗi chu kỳ */
    @Column(name = "duration_days", nullable = false)
    private int durationDays = 30;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "sort_order")
    private int sortOrder;

    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt = ZonedDateTime.now();
}
