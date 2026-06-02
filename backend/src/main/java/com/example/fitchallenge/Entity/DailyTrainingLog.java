package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.ZonedDateTime;

/**
 * Entity: DailyTrainingLog
 * 👉 Chức năng: Theo dõi tiến độ tập luyện từng ngày của người dùng
 * trong kế hoạch tập luyện.
 */
@Entity
@Table(
    name = "daily_training_logs",
    indexes = {
        @Index(name = "idx_dtl_user_date", columnList = "user_id,training_date"),
        @Index(name = "idx_dtl_user_plan", columnList = "user_id,tp_id"),
        @Index(name = "idx_dtl_status", columnList = "status")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyTrainingLog {

    /**
     * 🔑 Mã bản ghi (Primary Key, tự tăng)
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "dtl_id")
    private Long dtlId;

    /**
     * 👤 Người dùng (khóa ngoại → users.user_id)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * 🏋️ Kế hoạch tập luyện (khóa ngoại → training_plans.tp_id)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tp_id", nullable = false)
    private TrainingPlan trainingPlan;

    /**
     * 📅 Ngày tập luyện
     */
    @Column(name = "training_date", nullable = false)
    private LocalDate trainingDate;

    /**
     * 📆 Số ngày trong kế hoạch (Day 1, Day 2, ...)
     */
    @Column(name = "day_number", nullable = false)
    private Integer dayNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exercise_id")
    private Exercise exercise;

    /**
     * ✅ Trạng thái hoàn thành
     * - NOT_STARTED: Chưa bắt đầu
     * - IN_PROGRESS: Đang thực hiện
     * - COMPLETED: Đã hoàn thành
     * - SKIPPED: Đã bỏ qua
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private DailyTrainingStatus status = DailyTrainingStatus.NOT_STARTED;

    public enum DailyTrainingStatus {
        NOT_STARTED, IN_PROGRESS, COMPLETED, SKIPPED
    }

    /**
     * ⏱️ Thời gian tập luyện thực tế (phút)
     */
    @Column(name = "actual_duration_minutes")
    private Integer actualDurationMinutes;

    /**
     * 🔥 Calo đốt cháy (ước tính)
     */
    @Column(name = "calories_burned")
    private Integer caloriesBurned;

    /**
     * 💪 Số hiệp đã hoàn thành
     */
    @Column(name = "sets_completed")
    private Integer setsCompleted;

    /**
     * 🔂 Số lần lặp đã hoàn thành
     */
    @Column(name = "reps_completed")
    private Integer repsCompleted;

    /**
     * 📊 Điểm số đánh giá (nếu có AI evaluation)
     */
    @Column(name = "score")
    private Integer score;

    /**
     * 🎯 Độ tin cậy AI (nếu có)
     */
    @Column(name = "confidence")
    private Double confidence;

    /**
     * 📝 Ghi chú của người dùng
     */
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    /**
     * 😊 Mức độ khó cảm nhận (1-10)
     */
    @Column(name = "perceived_difficulty")
    private Integer perceivedDifficulty;

    /**
     * 💪 Mức độ nỗ lực (1-10)
     */
    @Column(name = "effort_level")
    private Integer effortLevel;

    @Column(name = "fatigue_level")
    private Integer fatigueLevel;

    @Column(name = "sleep_hours")
    private Double sleepHours;

    /**
     * 🕒 Thời điểm bắt đầu tập
     */
    @Column(name = "started_at")
    private ZonedDateTime startedAt;

    /**
     * 🕒 Thời điểm hoàn thành
     */
    @Column(name = "completed_at")
    private ZonedDateTime completedAt;

    /**
     * 🕒 Thời điểm tạo bản ghi
     */
    @Column(name = "created_at")
    private ZonedDateTime createdAt = ZonedDateTime.now();

    /**
     * 🕒 Thời điểm cập nhật
     */
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;

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

    @PreUpdate
    protected void onUpdate() {
        updatedAt = ZonedDateTime.now();
    }

    /**
     * 🔄 Phương thức khôi phục sau soft delete
     */
    public void restore() {
        this.isDeleted = false;
        this.deletedAt = null;
    }
    

    // Manual builder method for Lombok compatibility
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private User user;
        private TrainingPlan trainingPlan;
        private LocalDate trainingDate;
        private Integer dayNumber;
        private Exercise exercise;
        private DailyTrainingStatus status;
        private Integer actualDurationMinutes;
        private Integer caloriesBurned;
        private Integer setsCompleted;
        private Integer repsCompleted;
        private Double score;
        private Double confidence;
        private String notes;
        private Integer perceivedDifficulty;
        private Integer effortLevel;
        private Integer fatigueLevel;
        private Double sleepHours;
        private ZonedDateTime startedAt;
        private ZonedDateTime completedAt;
        private ZonedDateTime createdAt;
        private ZonedDateTime updatedAt;
        private Boolean isDeleted;
        private ZonedDateTime deletedAt;
        
        public Builder user(User user) {
            this.user = user;
            return this;
        }
        
        public Builder trainingPlan(TrainingPlan trainingPlan) {
            this.trainingPlan = trainingPlan;
            return this;
        }
        
        public Builder trainingDate(LocalDate trainingDate) {
            this.trainingDate = trainingDate;
            return this;
        }
        
        public Builder dayNumber(Integer dayNumber) {
            this.dayNumber = dayNumber;
            return this;
        }
        
        public Builder exercise(Exercise exercise) {
            this.exercise = exercise;
            return this;
        }
        
        public Builder status(DailyTrainingStatus status) {
            this.status = status;
            return this;
        }
        
        public Builder actualDurationMinutes(Integer actualDurationMinutes) {
            this.actualDurationMinutes = actualDurationMinutes;
            return this;
        }
        
        public Builder caloriesBurned(Integer caloriesBurned) {
            this.caloriesBurned = caloriesBurned;
            return this;
        }
        
        public Builder setsCompleted(Integer setsCompleted) {
            this.setsCompleted = setsCompleted;
            return this;
        }
        
        public Builder repsCompleted(Integer repsCompleted) {
            this.repsCompleted = repsCompleted;
            return this;
        }
        
        public Builder score(Double score) {
            this.score = score;
            return this;
        }
        
        public Builder confidence(Double confidence) {
            this.confidence = confidence;
            return this;
        }
        
        public Builder notes(String notes) {
            this.notes = notes;
            return this;
        }
        
        public Builder perceivedDifficulty(Integer perceivedDifficulty) {
            this.perceivedDifficulty = perceivedDifficulty;
            return this;
        }
        
        public Builder effortLevel(Integer effortLevel) {
            this.effortLevel = effortLevel;
            return this;
        }

        public Builder fatigueLevel(Integer fatigueLevel) {
            this.fatigueLevel = fatigueLevel;
            return this;
        }

        public Builder sleepHours(Double sleepHours) {
            this.sleepHours = sleepHours;
            return this;
        }
        
        public Builder startedAt(ZonedDateTime startedAt) {
            this.startedAt = startedAt;
            return this;
        }
        
        public Builder completedAt(ZonedDateTime completedAt) {
            this.completedAt = completedAt;
            return this;
        }
        
        public Builder createdAt(ZonedDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }
        
        public Builder updatedAt(ZonedDateTime updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }
        
        public Builder isDeleted(Boolean isDeleted) {
            this.isDeleted = isDeleted;
            return this;
        }
        
        public Builder deletedAt(ZonedDateTime deletedAt) {
            this.deletedAt = deletedAt;
            return this;
        }
        
        public DailyTrainingLog build() {
            DailyTrainingLog log = new DailyTrainingLog();
            log.user = this.user;
            log.trainingPlan = this.trainingPlan;
            log.trainingDate = this.trainingDate;
            log.dayNumber = this.dayNumber;
            log.exercise = this.exercise;
            log.status = this.status;
            log.actualDurationMinutes = this.actualDurationMinutes;
            log.caloriesBurned = this.caloriesBurned;
            log.setsCompleted = this.setsCompleted;
            log.repsCompleted = this.repsCompleted;
            log.score = this.score != null ? this.score.intValue() : null;
            log.confidence = this.confidence;
            log.notes = this.notes;
            log.perceivedDifficulty = this.perceivedDifficulty;
            log.effortLevel = this.effortLevel;
            log.fatigueLevel = this.fatigueLevel;
            log.sleepHours = this.sleepHours;
            log.startedAt = this.startedAt;
            log.completedAt = this.completedAt;
            log.createdAt = this.createdAt;
            log.updatedAt = this.updatedAt;
            log.isDeleted = this.isDeleted;
            log.deletedAt = this.deletedAt;
            return log;
        }
    }
}




