package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Entity lưu Health Profile đầy đủ của user để cá nhân hóa training plan
 * Bao gồm: thông tin cơ thể, thói quen sinh hoạt, mục tiêu, sức khỏe, hành vi ăn uống
 */
@Entity
@Table(name = "health_profile")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class HealthProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    // ========== NHÓM A: Thông tin cơ thể (bắt buộc) ==========
    // Các trường trùng lặp đã được di chuyển sang UserBodyProfile
    // Getter/Setter delegation ở cuối file

    @Column(name = "waist_cm")
    private BigDecimal waistCm; // Vòng eo (cm) - quan trọng cho Navy Body Fat

    @Column(name = "hip_cm")
    private BigDecimal hipCm; // Vòng hông (cm) - cần cho nữ

    @Column(name = "neck_cm")
    private BigDecimal neckCm; // Vòng cổ (cm) - cần cho Navy Body Fat

    @Column(name = "body_image_url", length = 500)
    private String bodyImageUrl; // Ảnh toàn thân (tùy chọn) - để AI phân tích

    // ========== Tính toán tự động ==========
    // bmi, bmr, tdee, recommendedCalories đã chuyển sang UserBodyProfile

    @Column(name = "body_fat_percent", precision = 5, scale = 2)
    private BigDecimal bodyFatPercent; // % mỡ cơ thể (Navy method)

    @Column(name = "lean_body_mass_kg", precision = 6, scale = 2)
    private BigDecimal leanBodyMassKg; // Khối lượng cơ nạc (kg)

    // ========== NHÓM B: Thói quen sinh hoạt ==========
    @Column(name = "daily_activity_level", length = 50)
    private String dailyActivityLevel; // sedentary, lightly_active, moderately_active, very_active, extra_active

    @Column(name = "workout_frequency_per_week")
    private Integer workoutFrequencyPerWeek; // Số buổi tập/tuần

    @Column(name = "favorite_exercise_type", length = 100)
    private String favoriteExerciseType; // Cardio, Yoga, Strength, HIIT, Mixed

    @Column(name = "current_diet_type", length = 50)
    private String currentDietType; // high_carb, high_fat, high_protein, balanced, keto, vegan

    @Column(name = "sleep_hours_per_day")
    private Integer sleepHoursPerDay; // Số giờ ngủ/ngày

    @Column(name = "stress_level", length = 20)
    private String stressLevel; // low, medium, high

    @Column(name = "occupation", length = 100)
    private String occupation; // office_worker, driver, construction, freelancer, student

    // ========== NHÓM C: Mục tiêu cá nhân ==========
    @Column(name = "primary_goal", length = 50)
    private String primaryGoal; // lose_weight, build_muscle, lose_fat, maintain_health, prepare_event

    @Column(name = "goal_weight_kg", precision = 6, scale = 2)
    private BigDecimal goalWeightKg; // Cân nặng mục tiêu (kg)

    @Column(name = "goal_body_fat_percent", precision = 5, scale = 2)
    private BigDecimal goalBodyFatPercent; // % mỡ mục tiêu

    @Column(name = "goal_timeline_days")
    private Integer goalTimelineDays; // Thời gian đạt mục tiêu (ngày)

    @Column(name = "goal_description", columnDefinition = "TEXT")
    private String goalDescription; // Mô tả mục tiêu chi tiết

    // ========== NHÓM D: Tình trạng sức khỏe ==========
    @Column(name = "medical_history", columnDefinition = "TEXT")
    private String medicalHistory; // Tiền sử bệnh lý (tim mạch, huyết áp, v.v.)

    @Column(name = "current_injuries", columnDefinition = "TEXT")
    private String currentInjuries; // Chấn thương hiện tại (đau lưng, đau gối, v.v.)

    @Column(name = "mobility_level", length = 20)
    private String mobilityLevel; // excellent, good, limited, restricted

    @Column(name = "available_equipment", length = 200)
    private String availableEquipment; // none, dumbbells, resistance_bands, full_gym, bodyweight_only

    @Column(name = "preferred_workout_duration_minutes")
    private Integer preferredWorkoutDurationMinutes; // Thời lượng mỗi buổi mong muốn (15/30/45/60)

    // ========== NHÓM E: Hành vi ăn uống ==========
    @Column(name = "meals_per_day")
    private Integer mealsPerDay; // Số bữa ăn/ngày (2, 3, 4, 5+)

    @Column(name = "frequent_foods", columnDefinition = "TEXT")
    private String frequentFoods; // Món ăn thường xuyên (dầu mỡ, đồ ngọt, thức ăn nhanh...)

    @Column(name = "water_intake_liters_per_day", precision = 4, scale = 2)
    private BigDecimal waterIntakeLitersPerDay; // Lượng nước uống (L/ngày)

    @Column(name = "alcohol_consumption", length = 20)
    private String alcoholConsumption; // none, occasional, regular, heavy

    @Column(name = "smoking_status", length = 20)
    private String smokingStatus; // none, occasional, regular

    // ========== Timestamps ==========
    @Column(name = "created_at")
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    // 🗑️ Soft delete flag
    @Column(name = "is_deleted")
    private Boolean isDeleted = false;

    // 🗑️ Thời điểm xóa (soft delete)
    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    /**
     * 🔄 Phương thức khôi phục sau soft delete
     */
    public void restore() {
        this.isDeleted = false;
        this.deletedAt = null;
    }

    // ========== GETTER & SETTER DELEGATION ==========
    
    public BigDecimal getHeightCm() {
        return this.user != null && this.user.getUserBodyProfile() != null ? this.user.getUserBodyProfile().getHeight() : null;
    }
    public void setHeightCm(BigDecimal heightCm) {
        if (this.user != null && this.user.getUserBodyProfile() != null) this.user.getUserBodyProfile().setHeight(heightCm);
    }

    public BigDecimal getWeightKg() {
        return this.user != null && this.user.getUserBodyProfile() != null ? this.user.getUserBodyProfile().getWeight() : null;
    }
    public void setWeightKg(BigDecimal weightKg) {
        if (this.user != null && this.user.getUserBodyProfile() != null) this.user.getUserBodyProfile().setWeight(weightKg);
    }

    public Integer getAge() {
        return this.user != null && this.user.getUserBodyProfile() != null ? this.user.getUserBodyProfile().getAge() : null;
    }
    public void setAge(Integer age) {
        if (this.user != null && this.user.getUserBodyProfile() != null) this.user.getUserBodyProfile().setAge(age);
    }

    public String getGender() {
        return this.user != null && this.user.getUserBodyProfile() != null ? this.user.getUserBodyProfile().getGender() : null;
    }
    public void setGender(String gender) {
        if (this.user != null && this.user.getUserBodyProfile() != null) this.user.getUserBodyProfile().setGender(gender);
    }

    public BigDecimal getBmi() {
        return this.user != null && this.user.getUserBodyProfile() != null ? this.user.getUserBodyProfile().getBmi() : null;
    }
    public void setBmi(BigDecimal bmi) {
        if (this.user != null && this.user.getUserBodyProfile() != null) this.user.getUserBodyProfile().setBmi(bmi);
    }

    public BigDecimal getBmr() {
        return this.user != null && this.user.getUserBodyProfile() != null ? this.user.getUserBodyProfile().getBmr() : null;
    }
    public void setBmr(BigDecimal bmr) {
        if (this.user != null && this.user.getUserBodyProfile() != null) this.user.getUserBodyProfile().setBmr(bmr);
    }

    public BigDecimal getTdee() {
        return this.user != null && this.user.getUserBodyProfile() != null ? this.user.getUserBodyProfile().getRecommendedCalories() : null;
    }
    public void setTdee(BigDecimal tdee) {
        if (this.user != null && this.user.getUserBodyProfile() != null) this.user.getUserBodyProfile().setRecommendedCalories(tdee);
    }

    public BigDecimal getRecommendedCalories() {
        return getTdee();
    }
    public void setRecommendedCalories(BigDecimal recommendedCalories) {
        setTdee(recommendedCalories);
    }

}
