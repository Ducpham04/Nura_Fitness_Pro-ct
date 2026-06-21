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

    /** Số lần đổi bài tập/tháng; -1 = vô hạn */
    @Column(name = "max_exercise_swap_per_month", nullable = false)
    private int maxExerciseSwapPerMonth = -1;

    /** Số lần đổi món ăn/tháng; -1 = vô hạn */
    @Column(name = "max_meal_swap_per_month", nullable = false)
    private int maxMealSwapPerMonth = -1;

    /** Số lần ghi log tập/ngày; -1 = vô hạn */
    @Column(name = "max_training_log_per_day", nullable = false)
    private int maxTrainingLogPerDay = -1;

    /** Số lần ghi log dinh dưỡng/ngày; -1 = vô hạn */
    @Column(name = "max_nutrition_log_per_day", nullable = false)
    private int maxNutritionLogPerDay = -1;

    /** Cho phép tham gia challenge và tích điểm */
    @Column(name = "can_join_challenges", nullable = false)
    private boolean canJoinChallenges = false;
}
