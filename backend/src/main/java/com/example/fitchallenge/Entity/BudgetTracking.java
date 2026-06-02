package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.ZonedDateTime;

/**
 * Entity: BudgetTracking
 * 👉 Chức năng: Theo dõi ngân sách thực tế của user theo ngày/tuần
 * 💡 Đối chiếu ngân sách mục tiêu với chi tiêu thực tế
 * 🎯 Đánh giá AI có đang bám sát budget không
 */
@Entity
@Table(
    name = "budget_tracking",
    indexes = {
        @Index(name = "idx_bt_user_date", columnList = "user_id,tracking_date"),
        @Index(name = "idx_bt_week", columnList = "user_id,week_start_date"),
        @Index(name = "idx_bt_ai_compliance", columnList = "ai_stayed_within_budget")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BudgetTracking {

    /**
     * 🔑 Mã bản ghi (Primary Key, tự tăng)
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "bt_id")
    private Long btId;

    /**
     * 👤 Người dùng (khóa ngoại → users.user_id)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * 📋 Plan tham chiếu (optional)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pnp_id")
    private PersonalizedNutritionPlan personalizedPlan;

    /**
     * 📅 Ngày tracking
     */
    @Column(name = "tracking_date", nullable = false)
    private LocalDate trackingDate;

    /**
     * 📅 Ngày bắt đầu tuần (để group theo tuần)
     */
    @Column(name = "week_start_date")
    private LocalDate weekStartDate;

    /**
     * 💰 Ngân sách mục tiêu trong ngày (VND)
     */
    @Column(name = "daily_budget")
    private Integer dailyBudget;

    /**
     * 💸 Chi tiêu thực tế trong ngày (VND)
     */
    @Column(name = "actual_spent")
    private Integer actualSpent;

    /**
     * 📊 Chênh lệch (actual - budget)
     * Positive = vượt budget, Negative = dưới budget
     */
    @Column(name = "variance")
    private Integer variance;

    /**
     * 💰 Ngân sách tuần
     */
    @Column(name = "weekly_budget")
    private Integer weeklyBudget;

    /**
     * 💸 Chi tiêu tuần tích lũy
     */
    @Column(name = "weekly_spent")
    private Integer weeklySpent;

    /**
     * 💰 Còn lại trong tuần
     */
    @Column(name = "weekly_remaining")
    private Integer weeklyRemaining;

    /**
     * 🤖 AI có tuân thủ budget không?
     * (Dựa trên so sánh estimated_cost vs target_budget)
     */
    @Column(name = "ai_stayed_within_budget")
    private Boolean aiStayedWithinBudget;

    /**
     * 📝 Ghi chú về budget
     */
    @Column(name = "budget_notes", columnDefinition = "TEXT")
    private String budgetNotes;

    /**
     * 🛒 Danh sách items đã mua (JSON)
     * Format: [{"item": "Gà", "cost": 50000, "store": "BigC"}]
     */
    @Column(name = "purchased_items_json", columnDefinition = "TEXT")
    private String purchasedItemsJson;

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

    /**
     * 🔄 Tính toán variance
     */
    public void calculateVariance() {
        if (actualSpent != null && dailyBudget != null) {
            this.variance = actualSpent - dailyBudget;
        }
    }

    // Manual getters/setters for Lombok compatibility
    public Long getBtId() {
        return btId;
    }
    
    public void setBtId(Long btId) {
        this.btId = btId;
    }
    
    public User getUser() {
        return user;
    }
    
    public void setUser(User user) {
        this.user = user;
    }
    
    public PersonalizedNutritionPlan getPersonalizedPlan() {
        return personalizedPlan;
    }
    
    public void setPersonalizedPlan(PersonalizedNutritionPlan personalizedPlan) {
        this.personalizedPlan = personalizedPlan;
    }
    
    public LocalDate getTrackingDate() {
        return trackingDate;
    }
    
    public void setTrackingDate(LocalDate trackingDate) {
        this.trackingDate = trackingDate;
    }
    
    public LocalDate getWeekStartDate() {
        return weekStartDate;
    }
    
    public void setWeekStartDate(LocalDate weekStartDate) {
        this.weekStartDate = weekStartDate;
    }
    
    public Integer getDailyBudget() {
        return dailyBudget;
    }
    
    public void setDailyBudget(Integer dailyBudget) {
        this.dailyBudget = dailyBudget;
    }
    
    public Integer getActualSpent() {
        return actualSpent;
    }
    
    public void setActualSpent(Integer actualSpent) {
        this.actualSpent = actualSpent;
    }
    
    public Integer getVariance() {
        return variance;
    }
    
    public void setVariance(Integer variance) {
        this.variance = variance;
    }
    
    public Integer getWeeklyBudget() {
        return weeklyBudget;
    }
    
    public void setWeeklyBudget(Integer weeklyBudget) {
        this.weeklyBudget = weeklyBudget;
    }
    
    public Integer getWeeklySpent() {
        return weeklySpent;
    }
    
    public void setWeeklySpent(Integer weeklySpent) {
        this.weeklySpent = weeklySpent;
    }
    
    public Integer getWeeklyRemaining() {
        return weeklyRemaining;
    }
    
    public void setWeeklyRemaining(Integer weeklyRemaining) {
        this.weeklyRemaining = weeklyRemaining;
    }
    
    public Boolean getAiStayedWithinBudget() {
        return aiStayedWithinBudget;
    }
    
    public void setAiStayedWithinBudget(Boolean aiStayedWithinBudget) {
        this.aiStayedWithinBudget = aiStayedWithinBudget;
    }
    
    public String getBudgetNotes() {
        return budgetNotes;
    }
    
    public void setBudgetNotes(String budgetNotes) {
        this.budgetNotes = budgetNotes;
    }
    
    public String getPurchasedItemsJson() {
        return purchasedItemsJson;
    }
    
    public void setPurchasedItemsJson(String purchasedItemsJson) {
        this.purchasedItemsJson = purchasedItemsJson;
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

    /**
     * 🔄 Tính toán weekly remaining
     */
    public void calculateWeeklyRemaining() {
        if (weeklyBudget != null && weeklySpent != null) {
            this.weeklyRemaining = weeklyBudget - weeklySpent;
        }
    }
}
