package com.example.fitchallenge.Entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(
        name = "user_training_sessions",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_user_training_sessions_ut_day",
                columnNames = {"ut_id", "day_number"}
        )
)
public class UserTrainingSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ut_id", nullable = false)
    private Long utId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "training_plan_id", nullable = false)
    private Long trainingPlanId;

    @Column(name = "day_number", nullable = false)
    private Integer dayNumber;

    @Column(name = "session_type", nullable = false, length = 50)
    private String sessionType;

    @Column(name = "is_rest_day", nullable = false)
    private Boolean restDay = false;

    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes = 0;

    @Column(name = "estimated_calories_burned", nullable = false)
    private Integer estimatedCaloriesBurned = 0;

    @Column(name = "muscle_groups_targeted", columnDefinition = "TEXT")
    private String muscleGroupsTargeted;

    @Column(name = "warmup", columnDefinition = "TEXT")
    private String warmup;

    @Column(name = "cooldown", columnDefinition = "TEXT")
    private String cooldown;

    @Column(name = "cardio", columnDefinition = "TEXT")
    private String cardio;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUtId() { return utId; }
    public void setUtId(Long utId) { this.utId = utId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getTrainingPlanId() { return trainingPlanId; }
    public void setTrainingPlanId(Long trainingPlanId) { this.trainingPlanId = trainingPlanId; }
    public Integer getDayNumber() { return dayNumber; }
    public void setDayNumber(Integer dayNumber) { this.dayNumber = dayNumber; }
    public String getSessionType() { return sessionType; }
    public void setSessionType(String sessionType) { this.sessionType = sessionType; }
    public Boolean getRestDay() { return restDay; }
    public void setRestDay(Boolean restDay) { this.restDay = restDay; }
    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }
    public Integer getEstimatedCaloriesBurned() { return estimatedCaloriesBurned; }
    public void setEstimatedCaloriesBurned(Integer estimatedCaloriesBurned) { this.estimatedCaloriesBurned = estimatedCaloriesBurned; }
    public String getMuscleGroupsTargeted() { return muscleGroupsTargeted; }
    public void setMuscleGroupsTargeted(String muscleGroupsTargeted) { this.muscleGroupsTargeted = muscleGroupsTargeted; }
    public String getWarmup() { return warmup; }
    public void setWarmup(String warmup) { this.warmup = warmup; }
    public String getCooldown() { return cooldown; }
    public void setCooldown(String cooldown) { this.cooldown = cooldown; }
    public String getCardio() { return cardio; }
    public void setCardio(String cardio) { this.cardio = cardio; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
