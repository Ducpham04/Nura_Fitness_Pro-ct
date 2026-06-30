package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.List;

@Entity
@Table(name="users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor

public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="user_id")
    private Long id;
    @Column(name="username", nullable = false, unique = true, length = 100)
    private String userName;
    @Column(name="email", nullable = false, unique = true, length = 255)
    private String email;

    @Column(name="password", nullable = false, length = 255)
    private String password;

    @ManyToOne
    @JoinColumn(name="role_id")
    private Role role;


    @Column(name="link_image", length = 500)
    private String linkImage;

    @Column(name="created_at", updatable = false)
    private ZonedDateTime createdAt = ZonedDateTime.now();

    @Column(name="updated_at")
    private ZonedDateTime updatedAt;

    @Column(name="last_login_at")
    private ZonedDateTime lastLoginAt;

    @Column(name="points")
    private Integer points; // Ví điểm tiêu được — đổi thưởng trừ vào đây

    @Column(name="level_points")
    private Integer levelPoints; // XP tích luỹ — chỉ tăng, quyết định level (không bị trừ khi đổi quà)

    @Column(name="full_name")
    private String fullName;

    @Column(name="streak_count")
    private Integer streakCount = 0;

    @Column(name="is_active", length = 20)
    private String status;

    // ── AI Package / Credit ──────────────────────────────────────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ai_package_id")
    private AiPackage aiPackage;

    /** Snapshot quota của gói hiện tại; -1 = vô hạn */
    @Column(name = "ai_quota")
    private Integer aiQuota = 25;

    /** Credit đã dùng trong chu kỳ hiện tại */
    @Column(name = "ai_used")
    private Integer aiUsed = 0;

    /** Mốc reset chu kỳ kế tiếp */
    @Column(name = "ai_reset_at")
    private java.time.ZonedDateTime aiResetAt;

    /** Gói hết hạn lúc (null = Free / không hết hạn) */
    @Column(name = "ai_package_expires_at")
    private java.time.ZonedDateTime aiPackageExpiresAt;

    // ── Swap tracking ────────────────────────────────────────────────────────
    @Column(name = "exercise_swap_used")
    private Integer exerciseSwapUsed = 0;

    @Column(name = "meal_swap_used")
    private Integer mealSwapUsed = 0;

    /** Mốc reset swap counter (đầu chu kỳ tháng) */
    @Column(name = "swap_reset_at")
    private ZonedDateTime swapResetAt;

    // ── Log tracking (reset hằng ngày) ──────────────────────────────────────
    @Column(name = "training_log_today")
    private Integer trainingLogToday = 0;

    @Column(name = "nutrition_log_today")
    private Integer nutritionLogToday = 0;

    @Column(name = "log_reset_date")
    private LocalDate logResetDate;

    // ── Referral ─────────────────────────────────────────────────────────────
    @Column(name = "referral_code", unique = true, length = 12)
    private String referralCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "referred_by_id")
    private User referredBy;

    @Column(name = "referral_count")
    private Integer referralCount = 0;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<UserBodyProfile> userBodyProfiles;

    public UserBodyProfile getUserBodyProfile() {
        if (this.userBodyProfiles != null && !this.userBodyProfiles.isEmpty()) {
            return this.userBodyProfiles.get(this.userBodyProfiles.size() - 1);
        }
        return null;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = ZonedDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = ZonedDateTime.now();
    }
    
}

