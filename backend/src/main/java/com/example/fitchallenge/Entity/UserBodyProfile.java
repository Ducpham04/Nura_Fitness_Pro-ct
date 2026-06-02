package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;

/**
 * Entity duy nhất lưu chỉ số cơ thể của user.
 * Gộp từ user_body_profile + information_body_user.
 * Single Source of Truth cho cả Dashboard và AI Engine.
 */
@Entity
@Table(name = "user_body_profile")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserBodyProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    // ── Relationships ─────────────────────────────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "goal_id")
    private Goals goalRef;       // FK → goals.goal_id (dùng cho Dashboard)

    // ── Body Metrics (nhập từ Onboarding) ────────────────────
    @Column(name = "height", precision = 6, scale = 2)
    private BigDecimal height;   // cm

    @Column(name = "weight", precision = 6, scale = 2)
    private BigDecimal weight;   // kg

    @Column(name = "age")
    private Integer age;

    @Column(name = "gender", length = 20)
    private String gender;       // MALE, FEMALE

    @Column(name = "body_fat", precision = 5, scale = 2)
    private BigDecimal bodyFat;  // %

    @Column(name = "muscle_mass", precision = 6, scale = 2)
    private BigDecimal muscleMass; // kg

    // ── Calculated Metrics (tự động tính) ────────────────────
    @Column(name = "bmi", precision = 5, scale = 2)
    private BigDecimal bmi;

    @Column(name = "bmr", precision = 8, scale = 2)
    private BigDecimal bmr;      // Basal Metabolic Rate (kcal/day)

    @Column(name = "recommended_calories", precision = 8, scale = 0)
    private BigDecimal recommendedCalories; // TDEE (kcal/day)

    // ── Lifestyle & Plan ─────────────────────────────────────
    @Column(name = "activity_level", length = 50)
    private String activityLevel; // sedentary, lightly active, moderately active, very active

    @Column(name = "experience_level", length = 20)
    private String experienceLevel; // beginner, intermediate, advanced

    @Column(name = "goal", length = 50)
    private String goal;         // label từ Onboarding (lose, muscle, maintain…) — AI dùng field này

    @Column(name = "injury_notes", columnDefinition = "TEXT")
    private String injuryNotes;

    @Column(name = "target_budget_per_day")
    private Integer targetBudgetPerDay;

    // ── Timestamps ───────────────────────────────────────────
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    // ── Auto-compute BMI, BMR, TDEE on save ──────────────────────────────
    @PrePersist
    @PreUpdate
    private void computeMetrics() {
        if (height != null && height.compareTo(BigDecimal.ZERO) > 0
                && weight != null && weight.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal hm = height.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
            this.bmi = weight.divide(hm.multiply(hm), 2, RoundingMode.HALF_UP);
        }

        if (height != null && weight != null && age != null && gender != null) {
            BigDecimal wTerm = weight.multiply(BigDecimal.valueOf(10));
            BigDecimal hTerm = height.multiply(BigDecimal.valueOf(6.25));
            BigDecimal aTerm = BigDecimal.valueOf(age).multiply(BigDecimal.valueOf(5));
            
            BigDecimal bmrBase = wTerm.add(hTerm).subtract(aTerm);
            
            if ("MALE".equalsIgnoreCase(gender)) {
                this.bmr = bmrBase.add(BigDecimal.valueOf(5));
            } else if ("FEMALE".equalsIgnoreCase(gender)) {
                this.bmr = bmrBase.subtract(BigDecimal.valueOf(161));
            } else {
                this.bmr = bmrBase.subtract(BigDecimal.valueOf(78)); 
            }
            
            if (activityLevel != null && this.bmr != null) {
                BigDecimal multiplier = BigDecimal.valueOf(1.2);
                switch (activityLevel.toLowerCase().replace("_", " ")) {
                    case "lightly active": multiplier = BigDecimal.valueOf(1.375); break;
                    case "moderately active": multiplier = BigDecimal.valueOf(1.55); break;
                    case "very active": multiplier = BigDecimal.valueOf(1.725); break;
                    case "extra active": multiplier = BigDecimal.valueOf(1.9); break;
                }
                this.recommendedCalories = this.bmr.multiply(multiplier).setScale(0, RoundingMode.HALF_UP);
            }
        }
    }

   }
