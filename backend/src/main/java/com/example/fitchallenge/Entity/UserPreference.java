package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.ZonedDateTime;

/**
 * Entity: UserPreference
 * 👉 Chức năng: Lưu preferences và feedback của user cho AI cải thiện plan sau
 * 💡 Dùng cho AI Service preference_store.py
 * 🎯 Lưu disliked foods, skipped exercises, cooking preferences
 */
@Entity
@Table(
    name = "user_preferences",
    indexes = {
        @Index(name = "idx_up_user_type", columnList = "user_id,preference_type"),
        @Index(name = "idx_up_item", columnList = "item_name")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPreference {

    /**
     * 🔑 Mã bản ghi (Primary Key, tự tăng)
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "up_id")
    private Long upId;

    /**
     * 👤 Người dùng (khóa ngoại → users.user_id)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * 📊 Loại preference
     * - DISLIKED_FOOD: Thực phẩm user không thích
     * - LIKED_FOOD: Thực phẩm user yêu thích
     * - SKIPPED_EXERCISE: Bài tập user hay bỏ qua
     * - FAVORITE_EXERCISE: Bài tập user thích
     * - COOKING_EQUIPMENT: Dụng cụ nấu ăn có sẵn
     * - DIETARY_RESTRICTION: Hạn chế ăn uống
     * - MEAL_PREP_TIME: Thời gian chuẩn bị mong muốn
     * - WORK_SCHEDULE: Lịch làm việc
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "preference_type", length = 30, nullable = false)
    private PreferenceType preferenceType;

    public enum PreferenceType {
        DISLIKED_FOOD, LIKED_FOOD, SKIPPED_EXERCISE, FAVORITE_EXERCISE,
        COOKING_EQUIPMENT, DIETARY_RESTRICTION, MEAL_PREP_TIME, WORK_SCHEDULE
    }

    /**
     * 🏷️ Tên item (food_name, exercise_name, equipment...)
     */
    @Column(name = "item_name", length = 255)
    private String itemName;

    /**
     * 📝 Giá trị (có thể là JSON hoặc text tùy type)
     * Ví dụ: "["nồi", "chảo"]" cho COOKING_EQUIPMENT
     * Ví dụ: "30" cho MEAL_PREP_TIME (minutes)
     */
    @Column(name = "preference_value", columnDefinition = "TEXT")
    private String preferenceValue;

    /**
     * 🔢 Mức độ ưu tiên/quan trọng (1-10)
     */
    @Column(name = "priority")
    private Integer priority = 5;

    /**
     * 📊 Số lần xuất hiện (để tính frequency)
     * Ví dụ: food bị skip bao nhiêu lần
     */
    @Column(name = "occurrence_count")
    private Integer occurrenceCount = 1;

    /**
     * 🔗 Challenge tham chiếu (nếu liên quan đến exercise)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "challenge_id")
    private Challenges challenge;

    /**
     * 🍎 Food tham chiếu (nếu liên quan đến food)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "food_id")
    private Food food;

    /**
     * 💡 Context bổ sung (JSON)
     * Ví dụ: {"reason": "too_hard", "alternative_suggested": "pushup_knees"}
     */
    @Column(name = "context_json", columnDefinition = "TEXT")
    private String contextJson;

    /**
     * ⏰ Thời điểm hết hạn preference (nếu có)
     * Ví dụ: temporary dietary restriction
     */
    @Column(name = "expires_at")
    private ZonedDateTime expiresAt;

    /**
     * ✅ Còn active không?
     */
    @Column(name = "is_active")
    private Boolean isActive = true;

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
     * 🔄 Tăng occurrence count
     */
    public void incrementOccurrence() {
        this.occurrenceCount = (this.occurrenceCount == null) ? 1 : this.occurrenceCount + 1;
    }

    /**
     * ⏰ Check nếu preference đã hết hạn
     */
    public boolean isExpired() {
        return expiresAt != null && ZonedDateTime.now().isAfter(expiresAt);
    }
    
    // Manual getters/setters for Lombok compatibility
    public Long getUpId() {
        return upId;
    }
    
    public void setUpId(Long upId) {
        this.upId = upId;
    }
    
    public User getUser() {
        return user;
    }
    
    public void setUser(User user) {
        this.user = user;
    }
    
    public PreferenceType getPreferenceType() {
        return preferenceType;
    }
    
    public void setPreferenceType(PreferenceType preferenceType) {
        this.preferenceType = preferenceType;
    }
    
    public String getItemName() {
        return itemName;
    }
    
    public void setItemName(String itemName) {
        this.itemName = itemName;
    }
    
    public String getPreferenceValue() {
        return preferenceValue;
    }
    
    public void setPreferenceValue(String preferenceValue) {
        this.preferenceValue = preferenceValue;
    }
    
    public Integer getPriority() {
        return priority;
    }
    
    public void setPriority(Integer priority) {
        this.priority = priority;
    }
    
    public Integer getOccurrenceCount() {
        return occurrenceCount;
    }
    
    public void setOccurrenceCount(Integer occurrenceCount) {
        this.occurrenceCount = occurrenceCount;
    }
    
    public Challenges getChallenge() {
        return challenge;
    }
    
    public void setChallenge(Challenges challenge) {
        this.challenge = challenge;
    }
    
    public Food getFood() {
        return food;
    }
    
    public void setFood(Food food) {
        this.food = food;
    }
    
    public String getContextJson() {
        return contextJson;
    }
    
    public void setContextJson(String contextJson) {
        this.contextJson = contextJson;
    }
    
    public ZonedDateTime getExpiresAt() {
        return expiresAt;
    }
    
    public void setExpiresAt(ZonedDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }
    
    public Boolean getIsActive() {
        return isActive;
    }
    
    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
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
