package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.time.ZonedDateTime;

@Setter
@Getter
@Entity
@Table(name = "training_plans")
public class TrainingPlan {

    // 🧩 Getters và Setters
    // 🆔 Khóa chính tự động tăng
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "tp_id")
    private Long tpId;

    // 🔗 Liên kết với bảng goals (một kế hoạch thuộc một mục tiêu)
    @ManyToOne
    @JoinColumn(name = "goal_id")
    private Goals goal;

    // 🏋️ Tiêu đề của kế hoạch (bắt buộc nhập)
    @Column(name = "title", nullable = false, length = 200)
    private String title;

    // 📝 Mô tả chi tiết kế hoạch (có thể để trống)
    @Column(name = "description")
    private String description;

    // ⚙️ Mức độ khó của kế hoạch: dễ, trung bình, khó...
    @Column(name = "difficulty_level", length = 20)
    private String difficultyLevel;

    // 📆 Thời lượng kế hoạch (tính theo tuần)
    @Column(name = "duration_weeks")
    private Integer durationWeeks;

    // 🕒 Thời điểm tạo kế hoạch (mặc định là thời gian hiện tại)
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    // 🗑️ Soft delete flag
    @Column(name = "is_deleted")
    private Boolean isDeleted = false;

    // 🗑️ Thời điểm xóa (soft delete)
    @Column(name = "deleted_at")
    private ZonedDateTime deletedAt;

    // 🧱 Constructors
    public TrainingPlan() {}

    public TrainingPlan(Goals goal, String title, String description, String difficultyLevel, Integer durationWeeks) {
        this.goal = goal;
        this.title = title;
        this.description = description;
        this.difficultyLevel = difficultyLevel;
        this.durationWeeks = durationWeeks;
    }

    /**
     * 🔄 Phương thức khôi phục sau soft delete
     */
    public void restore() {
        this.isDeleted = false;
        this.deletedAt = null;
    }
    
    // Manual getters/setters for Lombok compatibility
    public Long getTpId() {
        return tpId;
    }
    
    public void setTpId(Long tpId) {
        this.tpId = tpId;
    }
    
    public Goals getGoal() {
        return goal;
    }
    
    public void setGoal(Goals goal) {
        this.goal = goal;
    }
    
    public String getTitle() {
        return title;
    }
    
    public void setTitle(String title) {
        this.title = title;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public String getDifficultyLevel() {
        return difficultyLevel;
    }
    
    public void setDifficultyLevel(String difficultyLevel) {
        this.difficultyLevel = difficultyLevel;
    }
    
    public Integer getDurationWeeks() {
        return durationWeeks;
    }
    
    public void setDurationWeeks(Integer durationWeeks) {
        this.durationWeeks = durationWeeks;
    }
    
    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
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
}
