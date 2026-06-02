package com.example.fitchallenge.Entity;



import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.ZonedDateTime;

/**
 * Entity: AiModelEvent
 * 👉 Chức năng: Lưu log kết quả và thông tin xác thực của mô hình AI khi phân tích video của người dùng.
 * Mỗi bản ghi thể hiện một lần chạy mô hình AI trên video của user_challenge.
 */
@Entity
@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Table(
        name = "ai_model_events",
        indexes = {
                @Index(name = "idx_ame_user_created", columnList = "user_id,created_at"),
                @Index(name = "idx_ame_uc_created", columnList = "uc_id,created_at")
        }
)
public class AiModelEvent {

    /**
     * 🔑 Mã sự kiện (Primary Key, tự tăng)
     * Dùng để định danh duy nhất mỗi lần ghi nhận kết quả AI.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "event_id")
    private Long id;

    /**
     * 🎯 Liên kết đến phiên thử thách của người dùng (user_challenges).
     * Đây là bản ghi chứa thông tin user tham gia và video được AI phân tích.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uc_id", nullable = false)
    private UserChallenge userChallenge;

    /**
     * Denormalized để query nhanh (tổng rep theo user/ngày) mà không join qua user_challenges.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "challenge_id")
    private Challenges challenge;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exercise_id")
    private Exercise exercise;

    /**
     * Số rep đếm được (query trực tiếp, không cần parse JSON).
     */
    @Column(name = "reps")
    private Integer reps;

    @Column(name = "quality_score")
    private Double qualityScore;

    @Column(name = "confidence")
    private Double confidence;

    /**
     * Pass theo Exercise/default reps hoặc rule trong ai_rules_json. Null nếu chưa đủ dữ liệu.
     */
    @Column(name = "passed")
    private Boolean passed;

    @Column(name = "exercise_type", length = 50)
    private String exerciseType;

    /**
     * 🤖 Tên mô hình AI sử dụng để phân tích video.
     * Ví dụ: "PoseNet", "MoveNet", "FitAI-PushUp-Classifier".
     */
    @Column(name = "model_name", length = 200)
    private String modelName;

    /**
     * 🔢 Phiên bản mô hình AI.
     * Giúp xác định kết quả sinh ra từ version nào của mô hình (ví dụ: "v1.2.3").
     */
    @Column(name = "model_version", length = 50)
    private String modelVersion;

    /**
     * 🧠 Dữ liệu kết quả AI dưới dạng JSON.
     * Có thể bao gồm toạ độ keypoints, độ tin cậy, số lần lặp, nhãn hành động, v.v.
     * Sử dụng kiểu JSONB (PostgreSQL) để lưu trữ dữ liệu linh hoạt.
     */
    @Column(name = "result_json", columnDefinition = "TEXT")
    private String resultJson;

    /**
     * 🕒 Ngày giờ ghi nhận log của mô hình AI.
     * Mặc định là thời điểm hiện tại.
     */
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    // Manual getters/setters for Lombok compatibility
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public UserChallenge getUserChallenge() {
        return userChallenge;
    }

    public void setUserChallenge(UserChallenge userChallenge) {
        this.userChallenge = userChallenge;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Challenges getChallenge() {
        return challenge;
    }

    public void setChallenge(Challenges challenge) {
        this.challenge = challenge;
    }

    public Exercise getExercise() {
        return exercise;
    }

    public void setExercise(Exercise exercise) {
        this.exercise = exercise;
    }

    public Integer getReps() {
        return reps;
    }

    public void setReps(Integer reps) {
        this.reps = reps;
    }

    public Double getQualityScore() {
        return qualityScore;
    }

    public void setQualityScore(Double qualityScore) {
        this.qualityScore = qualityScore;
    }

    public Double getConfidence() {
        return confidence;
    }

    public void setConfidence(Double confidence) {
        this.confidence = confidence;
    }

    public Boolean getPassed() {
        return passed;
    }

    public void setPassed(Boolean passed) {
        this.passed = passed;
    }

    public String getExerciseType() {
        return exerciseType;
    }

    public void setExerciseType(String exerciseType) {
        this.exerciseType = exerciseType;
    }

    public String getModelName() {
        return modelName;
    }

    public void setModelName(String modelName) {
        this.modelName = modelName;
    }

    public String getModelVersion() {
        return modelVersion;
    }

    public void setModelVersion(String modelVersion) {
        this.modelVersion = modelVersion;
    }

    public String getResultJson() {
        return resultJson;
    }

    public void setResultJson(String resultJson) {
        this.resultJson = resultJson;
    }

    public ZonedDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(ZonedDateTime createdAt) {
        this.createdAt = createdAt;
    }

    // Manual builder method for Lombok compatibility
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private UserChallenge userChallenge;
        private User user;
        private Challenges challenge;
        private Exercise exercise;
        private Integer reps;
        private Double qualityScore;
        private Double confidence;
        private Boolean passed;
        private String exerciseType;
        private String modelName;
        private String modelVersion;
        private String resultJson;

        public Builder userChallenge(UserChallenge userChallenge) {
            this.userChallenge = userChallenge;
            return this;
        }

        public Builder user(User user) {
            this.user = user;
            return this;
        }

        public Builder challenge(Challenges challenge) {
            this.challenge = challenge;
            return this;
        }

        public Builder exercise(Exercise exercise) {
            this.exercise = exercise;
            return this;
        }

        public Builder reps(Integer reps) {
            this.reps = reps;
            return this;
        }

        public Builder qualityScore(Double qualityScore) {
            this.qualityScore = qualityScore;
            return this;
        }

        public Builder confidence(Double confidence) {
            this.confidence = confidence;
            return this;
        }

        public Builder passed(Boolean passed) {
            this.passed = passed;
            return this;
        }

        public Builder exerciseType(String exerciseType) {
            this.exerciseType = exerciseType;
            return this;
        }

        public Builder modelName(String modelName) {
            this.modelName = modelName;
            return this;
        }

        public Builder modelVersion(String modelVersion) {
            this.modelVersion = modelVersion;
            return this;
        }

        public Builder resultJson(String resultJson) {
            this.resultJson = resultJson;
            return this;
        }

        public AiModelEvent build() {
            AiModelEvent event = new AiModelEvent();
            event.userChallenge = this.userChallenge;
            event.user = this.user;
            event.challenge = this.challenge;
            event.exercise = this.exercise;
            event.reps = this.reps;
            event.qualityScore = this.qualityScore;
            event.confidence = this.confidence;
            event.passed = this.passed;
            event.exerciseType = this.exerciseType;
            event.modelName = this.modelName;
            event.modelVersion = this.modelVersion;
            event.resultJson = this.resultJson;
            return event;
        }
    }


}
