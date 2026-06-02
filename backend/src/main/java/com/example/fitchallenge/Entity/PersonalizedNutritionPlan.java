package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.List;

/**
 * Entity: PersonalizedNutritionPlan
 * 👉 Chức năng: Lưu kế hoạch dinh dưỡng do AI tạo riêng cho từng user
 * 💡 Flow hiện tại lưu trực tiếp plan cá nhân hóa, không phụ thuộc nutrition template legacy
 * 🎯 Lưu version, budget tracking, và AI context để điều chỉnh sau
 */
@Entity
@Table(
    name = "personalized_nutrition_plans",
    indexes = {
        @Index(name = "idx_pnp_user_status", columnList = "user_id,status"),
        @Index(name = "idx_pnp_dates", columnList = "start_date,end_date"),
        @Index(name = "idx_pnp_ai_id", columnList = "ai_plan_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PersonalizedNutritionPlan {

    /**
     * 🔑 Mã bản ghi (Primary Key, tự tăng)
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "pnp_id")
    private Long pnpId;

    /**
     * 👤 Người dùng (khóa ngoại → users.user_id)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * 🤖 ID plan từ AI Service (để tracking và version control)
     */
    @Column(name = "ai_plan_id", length = 100)
    private String aiPlanId;

    /**
     * 🔢 Version của plan (để tracking thay đổi)
     */
    @Column(name = "version")
    private Integer version = 1;

    /**
     * 📅 Ngày bắt đầu plan
     */
    @Column(name = "start_date")
    private LocalDate startDate;

    /**
     * 📅 Ngày kết thúc plan
     */
    @Column(name = "end_date")
    private LocalDate endDate;

    /**
     * 📆 Số ngày của plan
     */
    @Column(name = "duration_days")
    private Integer durationDays;

    /**
     * 💰 Ngân sách mục tiêu mỗi ngày (VND)
     */
    @Column(name = "target_budget_per_day")
    private Integer targetBudgetPerDay;

    /**
     * 💰 Chi phí tổng ước tính do AI tính toán
     */
    @Column(name = "estimated_total_cost")
    private Integer estimatedTotalCost;

    /**
     * 💰 Chi phí thực tế (user feedback sau khi mua)
     */
    @Column(name = "actual_total_cost")
    private Integer actualTotalCost;

    /**
     * 🎯 Calories mục tiêu mỗi ngày
     */
    @Column(name = "target_calories")
    private Double targetCalories;

    /**
     * 🥩 Protein mục tiêu (g)
     */
    @Column(name = "target_protein")
    private Double targetProtein;

    /**
     * 🍞 Carbs mục tiêu (g)
     */
    @Column(name = "target_carbs")
    private Double targetCarbs;

    /**
     * 🥑 Fat mục tiêu (g)
     */
    @Column(name = "target_fat")
    private Double targetFat;

    /**
     * 🤖 Context để AI điều chỉnh plan sau (lifestyle, preferences, inventory...)
     * Lưu JSON: { "meal_prep_time": 30, "cooking_equipment": [...], ... }
     */
    @Column(name = "ai_generation_context", columnDefinition = "TEXT")
    private String aiGenerationContext;

    /**
     * 📊 Trạng thái plan
     * - ACTIVE: Đang sử dụng
     * - COMPLETED: Đã hoàn thành
     * - CANCELLED: User hủy
     * - ARCHIVED: Lưu trữ (đã cũ)
     * - EXPIRED: Hết hạn
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private PlanStatus status = PlanStatus.ACTIVE;

    public enum PlanStatus {
        ACTIVE, COMPLETED, CANCELLED, ARCHIVED, EXPIRED
    }

    /**
     * 🗑️ Soft delete flag
     */
    @Column(name = "is_deleted")
    private Boolean isDeleted = false;

    /**
     * 🗑️ Thời điểm xóa (soft delete)
     */
    @Column(name = "deleted_at")
    private ZonedDateTime deletedAt;

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

    /**
     * 🍽️ Chi tiết các bữa ăn trong plan
     */
    @OneToMany(mappedBy = "personalizedPlan", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PersonalizedMealDetail> mealDetails;

    /**
     * 🤖 Version của AI prompt đã generate plan này
     * Dùng để tracking và debug
     */
    @Column(name = "ai_prompt_version", length = 50)
    private String aiPromptVersion;

    /**
     * 🤖 Phản hồi JSON từ AI service
     * Dùng để lưu lại raw response để tracking
     */
    @Column(name = "ai_response_json", columnDefinition = "TEXT")
    private String aiResponseJson;

    /**
     * 📝 Ghi chú về quá trình generation
     * Ví dụ: "AI model v1.2, prompt version 3.1"
     */
    @Column(name = "generation_notes", columnDefinition = "TEXT")
    private String generationNotes;

    @PreUpdate
    protected void onUpdate() {
        updatedAt = ZonedDateTime.now();
    }

    /**
     * 🔄 Khôi phục sau soft delete
     */
    public void restore() {
        this.isDeleted = false;
        this.deletedAt = null;
    }

    /**
     * 💰 Tính variance giữa estimated và actual cost
     */
    public Integer getCostVariance() {
        if (estimatedTotalCost == null || actualTotalCost == null) {
            return null;
        }
        return actualTotalCost - estimatedTotalCost;
    }

    /**
     * ✅ Check nếu AI đã đúng budget
     */
    public Boolean isWithinBudget() {
        if (targetBudgetPerDay == null || estimatedTotalCost == null || durationDays == null) {
            return null;
        }
        int totalBudget = targetBudgetPerDay * durationDays;
        return estimatedTotalCost <= totalBudget;
    }
    
    // Manual getters/setters for Lombok compatibility
    public Long getPnpId() {
        return pnpId;
    }
    
    public void setPnpId(Long pnpId) {
        this.pnpId = pnpId;
    }
    
    public User getUser() {
        return user;
    }
    
    public void setUser(User user) {
        this.user = user;
    }
    
    public String getAiPlanId() {
        return aiPlanId;
    }
    
    public void setAiPlanId(String aiPlanId) {
        this.aiPlanId = aiPlanId;
    }
    
    public Integer getVersion() {
        return version;
    }
    
    public void setVersion(Integer version) {
        this.version = version;
    }
    
    public PlanStatus getStatus() {
        return status;
    }
    
    public void setStatus(PlanStatus status) {
        this.status = status;
    }
    
    public LocalDate getStartDate() {
        return startDate;
    }
    
    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }
    
    public LocalDate getEndDate() {
        return endDate;
    }
    
    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }
    
    public Integer getDurationDays() {
        return durationDays;
    }
    
    public void setDurationDays(Integer durationDays) {
        this.durationDays = durationDays;
    }
    
    public Integer getTargetBudgetPerDay() {
        return targetBudgetPerDay;
    }
    
    public void setTargetBudgetPerDay(Integer targetBudgetPerDay) {
        this.targetBudgetPerDay = targetBudgetPerDay;
    }
    
    public Integer getEstimatedTotalCost() {
        return estimatedTotalCost;
    }
    
    public void setEstimatedTotalCost(Integer estimatedTotalCost) {
        this.estimatedTotalCost = estimatedTotalCost;
    }
    
    public Integer getActualTotalCost() {
        return actualTotalCost;
    }
    
    public void setActualTotalCost(Integer actualTotalCost) {
        this.actualTotalCost = actualTotalCost;
    }
    
    public String getAiPromptVersion() {
        return aiPromptVersion;
    }
    
    public void setAiPromptVersion(String aiPromptVersion) {
        this.aiPromptVersion = aiPromptVersion;
    }
    
    public String getAiResponseJson() {
        return aiResponseJson;
    }
    
    public void setAiResponseJson(String aiResponseJson) {
        this.aiResponseJson = aiResponseJson;
    }
    
    public String getGenerationNotes() {
        return generationNotes;
    }
    
    public void setGenerationNotes(String generationNotes) {
        this.generationNotes = generationNotes;
    }
    
    public Boolean getIsDeleted() {
        return isDeleted;
    }
    
    public void setIsDeleted(Boolean isDeleted) {
        this.isDeleted = isDeleted;
    }
    
    public ZonedDateTime getDeletedAt() {
        return deletedAt;
    }
    
    public void setDeletedAt(ZonedDateTime deletedAt) {
        this.deletedAt = deletedAt;
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
    
    public List<PersonalizedMealDetail> getMealDetails() {
        return mealDetails;
    }
    
    public void setMealDetails(List<PersonalizedMealDetail> mealDetails) {
        this.mealDetails = mealDetails;
    }
    
    // Additional getters/setters for missing fields
    public Double getTargetCalories() {
        return targetCalories;
    }
    
    public void setTargetCalories(Double targetCalories) {
        this.targetCalories = targetCalories;
    }
    
    public Double getTargetProtein() {
        return targetProtein;
    }
    
    public void setTargetProtein(Double targetProtein) {
        this.targetProtein = targetProtein;
    }
    
    public Double getTargetCarbs() {
        return targetCarbs;
    }
    
    public void setTargetCarbs(Double targetCarbs) {
        this.targetCarbs = targetCarbs;
    }
    
    public Double getTargetFat() {
        return targetFat;
    }
    
    public void setTargetFat(Double targetFat) {
        this.targetFat = targetFat;
    }
    
    public String getAiGenerationContext() {
        return aiGenerationContext;
    }
    
    public void setAiGenerationContext(String aiGenerationContext) {
        this.aiGenerationContext = aiGenerationContext;
    }
}
