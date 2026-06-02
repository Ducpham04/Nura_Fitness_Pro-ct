package com.example.fitchallenge.DTO.DailyTrainingLogDTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.ZonedDateTime;

/**
 * DTO for DailyTrainingLog response
 * Kết hợp thông tin từ DailyTrainingLog với Challenge để hiển thị
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DailyTrainingLogResponse {
    
    private Long dtlId;
    private Long userId;
    private Long trainingPlanId;
    private String trainingPlanTitle;
    private LocalDate trainingDate;
    private Integer dayNumber;
    
    // Exercise information. challenge* aliases are kept for older FE code.
    private Long challengeId;
    private Long exerciseId;
    private String challengeName;
    private String challengeTitle;
    private String challengeDescription;
    private String difficulty; // EASY, MEDIUM, HARD
    private String videoUrl;
    private String exerciseType; // AI model type
    
    // Status
    private String status; // not_started, in_progress, completed, skipped
    
    // Progress tracking
    private Integer actualDurationMinutes;
    private Integer caloriesBurned;
    private Integer setsCompleted;
    private Integer repsCompleted;
    private Integer targetSets; // From TrainingPlanDetail
    private Integer targetReps; // From TrainingPlanDetail
    
    // AI evaluation
    private Integer score;
    private Double confidence;
    
    // User notes
    private String notes;
    private Integer perceivedDifficulty;
    private Integer effortLevel;
    private Integer fatigueLevel;
    private Double sleepHours;
    
    // Timestamps
    private ZonedDateTime startedAt;
    private ZonedDateTime completedAt;
    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;
    
    // Manual getters/setters for Lombok compatibility
    public Long getDtlId() {
        return dtlId;
    }
    
    public void setDtlId(Long dtlId) {
        this.dtlId = dtlId;
    }
    
    public Long getUserId() {
        return userId;
    }
    
    public void setUserId(Long userId) {
        this.userId = userId;
    }
    
    public Long getTrainingPlanId() {
        return trainingPlanId;
    }
    
    public void setTrainingPlanId(Long trainingPlanId) {
        this.trainingPlanId = trainingPlanId;
    }
    
    public String getTrainingPlanTitle() {
        return trainingPlanTitle;
    }
    
    public void setTrainingPlanTitle(String trainingPlanTitle) {
        this.trainingPlanTitle = trainingPlanTitle;
    }
    
    public LocalDate getTrainingDate() {
        return trainingDate;
    }
    
    public void setTrainingDate(LocalDate trainingDate) {
        this.trainingDate = trainingDate;
    }
    
    public Integer getDayNumber() {
        return dayNumber;
    }
    
    public void setDayNumber(Integer dayNumber) {
        this.dayNumber = dayNumber;
    }
    
    public Long getChallengeId() {
        return challengeId;
    }
    
    public void setChallengeId(Long challengeId) {
        this.challengeId = challengeId;
    }

    public Long getExerciseId() {
        return exerciseId;
    }

    public void setExerciseId(Long exerciseId) {
        this.exerciseId = exerciseId;
    }
    
    public String getChallengeName() {
        return challengeName;
    }
    
    public void setChallengeName(String challengeName) {
        this.challengeName = challengeName;
    }
    
    public String getChallengeTitle() {
        return challengeTitle;
    }
    
    public void setChallengeTitle(String challengeTitle) {
        this.challengeTitle = challengeTitle;
    }
    
    public String getChallengeDescription() {
        return challengeDescription;
    }
    
    public void setChallengeDescription(String challengeDescription) {
        this.challengeDescription = challengeDescription;
    }
    
    public String getDifficulty() {
        return difficulty;
    }
    
    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }
    
    public String getVideoUrl() {
        return videoUrl;
    }
    
    public void setVideoUrl(String videoUrl) {
        this.videoUrl = videoUrl;
    }
    
    public String getExerciseType() {
        return exerciseType;
    }
    
    public void setExerciseType(String exerciseType) {
        this.exerciseType = exerciseType;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public Integer getActualDurationMinutes() {
        return actualDurationMinutes;
    }
    
    public void setActualDurationMinutes(Integer actualDurationMinutes) {
        this.actualDurationMinutes = actualDurationMinutes;
    }
    
    public Integer getCaloriesBurned() {
        return caloriesBurned;
    }
    
    public void setCaloriesBurned(Integer caloriesBurned) {
        this.caloriesBurned = caloriesBurned;
    }
    
    public Integer getSetsCompleted() {
        return setsCompleted;
    }
    
    public void setSetsCompleted(Integer setsCompleted) {
        this.setsCompleted = setsCompleted;
    }
    
    public Integer getRepsCompleted() {
        return repsCompleted;
    }
    
    public void setRepsCompleted(Integer repsCompleted) {
        this.repsCompleted = repsCompleted;
    }
    
    public Integer getTargetSets() {
        return targetSets;
    }
    
    public void setTargetSets(Integer targetSets) {
        this.targetSets = targetSets;
    }
    
    public Integer getTargetReps() {
        return targetReps;
    }
    
    public void setTargetReps(Integer targetReps) {
        this.targetReps = targetReps;
    }
    
    public Integer getScore() {
        return score;
    }
    
    public void setScore(Integer score) {
        this.score = score;
    }
    
    public Double getConfidence() {
        return confidence;
    }
    
    public void setConfidence(Double confidence) {
        this.confidence = confidence;
    }
    
    public String getNotes() {
        return notes;
    }
    
    public void setNotes(String notes) {
        this.notes = notes;
    }
    
    public Integer getPerceivedDifficulty() {
        return perceivedDifficulty;
    }
    
    public void setPerceivedDifficulty(Integer perceivedDifficulty) {
        this.perceivedDifficulty = perceivedDifficulty;
    }
    
    public Integer getEffortLevel() {
        return effortLevel;
    }
    
    public void setEffortLevel(Integer effortLevel) {
        this.effortLevel = effortLevel;
    }

    public Integer getFatigueLevel() {
        return fatigueLevel;
    }

    public void setFatigueLevel(Integer fatigueLevel) {
        this.fatigueLevel = fatigueLevel;
    }

    public Double getSleepHours() {
        return sleepHours;
    }

    public void setSleepHours(Double sleepHours) {
        this.sleepHours = sleepHours;
    }
    
    public ZonedDateTime getStartedAt() {
        return startedAt;
    }
    
    public void setStartedAt(ZonedDateTime startedAt) {
        this.startedAt = startedAt;
    }
    
    public ZonedDateTime getCompletedAt() {
        return completedAt;
    }
    
    public void setCompletedAt(ZonedDateTime completedAt) {
        this.completedAt = completedAt;
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




