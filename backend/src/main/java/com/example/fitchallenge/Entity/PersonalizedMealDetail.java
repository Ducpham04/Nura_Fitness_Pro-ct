package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entity: PersonalizedMealDetail
 * 👉 Chức năng: Chi tiết từng bữa ăn trong PersonalizedNutritionPlan
 * 💡 Ưu tiên {@link PersonalizedMealItem} (master food_id); cột meal_items_json giữ cho dữ liệu cũ / migration.
 * 🎯 Theo dõi user feedback (was_eaten, rating) để cải thiện AI sau
 */
@Entity
@Table(
    name = "personalized_meal_details",
    indexes = {
        @Index(name = "idx_pmd_plan_day", columnList = "pnp_id,day_number"),
        @Index(name = "idx_pmd_meal_type", columnList = "meal_type"),
        @Index(name = "idx_pmd_eaten", columnList = "was_eaten")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PersonalizedMealDetail {

    /**
     * 🔑 Mã bản ghi (Primary Key, tự tăng)
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "pmd_id")
    private Long pmdId;

    /**
     * 📋 Plan cha (khóa ngoại → personalized_nutrition_plans.pnp_id)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pnp_id", nullable = false)
    private PersonalizedNutritionPlan personalizedPlan;

    /**
     * 📆 Ngày thứ mấy trong plan (Day 1, Day 2, ...)
     */
    @Column(name = "day_number", nullable = false)
    private Integer dayNumber;

    /**
     * 🍽️ Loại bữa ăn
     * - BREAKFAST: Bữa sáng
     * - LUNCH: Bữa trưa
     * - DINNER: Bữa tối
     * - SNACK: Bữa phụ
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "meal_type", length = 20, nullable = false)
    private MealType mealType;

    /**
     * Hybrid flow: the selected dish for this meal slot. Legacy rows may have
     * this null and still be rendered through mealItemsJson.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dish_id")
    private Dish dish;

    public enum MealType {
        BREAKFAST, LUNCH, DINNER, SNACK
    }

    /**
     * 🍜 Danh sách món ăn (JSON array)
     * Format: [
     *   {
     *     "name": "Cơm gà xối mỡ",
     *     "amount": "150g",
     *     "calories": 450,
     *     "protein": 35.5,
     *     "carbs": 50.0,
     *     "fat": 12.0,
     *     "estimated_cost": 35000,
     *     "food_id": 123  // optional link to Food entity
     *   }
     * ]
     */
    @Column(name = "meal_items_json", columnDefinition = "TEXT")
    private String mealItemsJson;

    /**
     * Các dòng thực phẩm chuẩn hóa (Master Data Approach).
     */
    @OneToMany(mappedBy = "mealDetail", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<PersonalizedMealItem> mealItems = new ArrayList<>();

    /**
     * 🔥 Tổng calories của bữa ăn
     */
    @Column(name = "total_calories")
    private Double totalCalories;

    /**
     * 🥩 Tổng protein (g)
     */
    @Column(name = "total_protein")
    private Double totalProtein;

    /**
     * 🍞 Tổng carbs (g)
     */
    @Column(name = "total_carbs")
    private Double totalCarbs;

    /**
     * 🥑 Tổng fat (g)
     */
    @Column(name = "total_fat")
    private Double totalFat;

    /**
     * 💰 Chi phí ước tính cho bữa ăn (VND)
     */
    @Column(name = "estimated_cost")
    private Integer estimatedCost;

    /**
     * ⏱️ Thời gian chuẩn bị (phút)
     */
    @Column(name = "prep_time_minutes")
    private Integer prepTimeMinutes;

    /**
     * 👨‍🍳 Hướng dẫn nấu ăn (có thể là link hoặc text)
     */
    @Column(name = "cooking_instructions", columnDefinition = "TEXT")
    private String cookingInstructions;

    /**
     * ✅ User có ăn bữa này không?
     */
    @Column(name = "was_eaten")
    private Boolean wasEaten;

    /**
     * ⭐ Rating của user (1-5 sao)
     */
    @Column(name = "user_rating")
    private Integer userRating;

    /**
     * 📝 Feedback text của user
     */
    @Column(name = "user_feedback", columnDefinition = "TEXT")
    private String userFeedback;

    /**
     * 🔖 Lý do skip (nếu was_eaten = false)
     */
    @Column(name = "skip_reason", length = 255)
    private String skipReason;

    /**
     * 🤖 Version của AI prompt đã generate meal này
     * Dùng để tracking và debug
     */
    @Column(name = "ai_prompt_version", length = 50)
    private String aiPromptVersion;

    /**
     * 🕒 Thời điểm tạo
     */
    @Column(name = "created_at")
    private ZonedDateTime createdAt = ZonedDateTime.now();

    /**
     * 🕒 Thời điểm cập nhật
     */
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;

    @PreUpdate
    protected void onUpdate() {
        updatedAt = ZonedDateTime.now();
    }
    
    // Manual getters/setters for Lombok compatibility
    public Long getPmdId() {
        return pmdId;
    }
    
    public void setPmdId(Long pmdId) {
        this.pmdId = pmdId;
    }
    
    public PersonalizedNutritionPlan getPersonalizedPlan() {
        return personalizedPlan;
    }
    
    public void setPersonalizedPlan(PersonalizedNutritionPlan personalizedPlan) {
        this.personalizedPlan = personalizedPlan;
    }
    
    public Integer getDayNumber() {
        return dayNumber;
    }
    
    public void setDayNumber(Integer dayNumber) {
        this.dayNumber = dayNumber;
    }
    
    public MealType getMealType() {
        return mealType;
    }
    
    public void setMealType(MealType mealType) {
        this.mealType = mealType;
    }

    public Dish getDish() {
        return dish;
    }

    public void setDish(Dish dish) {
        this.dish = dish;
    }
    
    public String getMealItemsJson() {
        return mealItemsJson;
    }
    
    public void setMealItemsJson(String mealItemsJson) {
        this.mealItemsJson = mealItemsJson;
    }
    
    public Double getTotalCalories() {
        return totalCalories;
    }
    
    public void setTotalCalories(Double totalCalories) {
        this.totalCalories = totalCalories;
    }
    
    public Double getTotalProtein() {
        return totalProtein;
    }
    
    public void setTotalProtein(Double totalProtein) {
        this.totalProtein = totalProtein;
    }
    
    public Double getTotalCarbs() {
        return totalCarbs;
    }
    
    public void setTotalCarbs(Double totalCarbs) {
        this.totalCarbs = totalCarbs;
    }
    
    public Double getTotalFat() {
        return totalFat;
    }
    
    public void setTotalFat(Double totalFat) {
        this.totalFat = totalFat;
    }
    
    public Integer getEstimatedCost() {
        return estimatedCost;
    }
    
    public void setEstimatedCost(Integer estimatedCost) {
        this.estimatedCost = estimatedCost;
    }
    
    public Integer getPrepTimeMinutes() {
        return prepTimeMinutes;
    }
    
    public void setPrepTimeMinutes(Integer prepTimeMinutes) {
        this.prepTimeMinutes = prepTimeMinutes;
    }
    
    public String getCookingInstructions() {
        return cookingInstructions;
    }
    
    public void setCookingInstructions(String cookingInstructions) {
        this.cookingInstructions = cookingInstructions;
    }
    
    public Boolean getWasEaten() {
        return wasEaten;
    }
    
    public void setWasEaten(Boolean wasEaten) {
        this.wasEaten = wasEaten;
    }
    
    public Integer getUserRating() {
        return userRating;
    }
    
    public void setUserRating(Integer userRating) {
        this.userRating = userRating;
    }
    
    public String getUserFeedback() {
        return userFeedback;
    }
    
    public void setUserFeedback(String userFeedback) {
        this.userFeedback = userFeedback;
    }
    
    public String getSkipReason() {
        return skipReason;
    }
    
    public void setSkipReason(String skipReason) {
        this.skipReason = skipReason;
    }
    
    public String getAiPromptVersion() {
        return aiPromptVersion;
    }
    
    public void setAiPromptVersion(String aiPromptVersion) {
        this.aiPromptVersion = aiPromptVersion;
    }
    
    public ZonedDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(ZonedDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public ZonedDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(ZonedDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
