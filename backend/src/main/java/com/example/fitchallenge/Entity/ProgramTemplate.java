package com.example.fitchallenge.Entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "program_templates")
public class ProgramTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "training_plan_id", nullable = false)
    private Long trainingPlanId;

    @Column(name = "ut_id", nullable = false)
    private Long userTrainingId;

    @Column(name = "goal", nullable = false, length = 50)
    private String goal;

    @Column(name = "weekly_pattern_json", nullable = false, columnDefinition = "TEXT")
    private String weeklyPatternJson;

    @Column(name = "exercise_pool_json", nullable = false, columnDefinition = "TEXT")
    private String exercisePoolJson;

    @Column(name = "base_sets", nullable = false)
    private Integer baseSets;

    @Column(name = "base_reps", nullable = false)
    private Integer baseReps;

    @Column(name = "base_rest_seconds", nullable = false)
    private Integer baseRestSeconds;

    @Column(name = "progression_rate", nullable = false)
    private Double progressionRate;

    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes;

    @Column(name = "intensity", length = 30)
    private String intensity;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber = 1;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(name = "adaptation_notes", columnDefinition = "TEXT")
    private String adaptationNotes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getTrainingPlanId() { return trainingPlanId; }
    public void setTrainingPlanId(Long trainingPlanId) { this.trainingPlanId = trainingPlanId; }
    public Long getUserTrainingId() { return userTrainingId; }
    public void setUserTrainingId(Long userTrainingId) { this.userTrainingId = userTrainingId; }
    public String getGoal() { return goal; }
    public void setGoal(String goal) { this.goal = goal; }
    public String getWeeklyPatternJson() { return weeklyPatternJson; }
    public void setWeeklyPatternJson(String weeklyPatternJson) { this.weeklyPatternJson = weeklyPatternJson; }
    public String getExercisePoolJson() { return exercisePoolJson; }
    public void setExercisePoolJson(String exercisePoolJson) { this.exercisePoolJson = exercisePoolJson; }
    public Integer getBaseSets() { return baseSets; }
    public void setBaseSets(Integer baseSets) { this.baseSets = baseSets; }
    public Integer getBaseReps() { return baseReps; }
    public void setBaseReps(Integer baseReps) { this.baseReps = baseReps; }
    public Integer getBaseRestSeconds() { return baseRestSeconds; }
    public void setBaseRestSeconds(Integer baseRestSeconds) { this.baseRestSeconds = baseRestSeconds; }
    public Double getProgressionRate() { return progressionRate; }
    public void setProgressionRate(Double progressionRate) { this.progressionRate = progressionRate; }
    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }
    public String getIntensity() { return intensity; }
    public void setIntensity(String intensity) { this.intensity = intensity; }
    public Integer getVersionNumber() { return versionNumber; }
    public void setVersionNumber(Integer versionNumber) { this.versionNumber = versionNumber; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getAdaptationNotes() { return adaptationNotes; }
    public void setAdaptationNotes(String adaptationNotes) { this.adaptationNotes = adaptationNotes; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
