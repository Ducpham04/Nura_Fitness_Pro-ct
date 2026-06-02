package com.example.fitchallenge.DTO.TrainingPlanDTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * DTO cho Training Plan response theo yêu cầu FE
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TrainingPlanResponseDTO {
    private Long id;
    private String title;
    private String description;
    private String difficulty; // Beginner, Intermediate, Advanced
    private Integer duration; // in weeks
    private List<ExerciseDTO> exercises;
    private String status; // Active, Completed, Paused
    private Integer progress; // Percentage 0-100
    private OffsetDateTime startDate;
    private OffsetDateTime endDate;
    
    // Additional fields for admin
    private Long goalId;
    private String goalName;
    private Integer subscribers;
    private Double price;
    private String focusArea;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    
    // Manual getters/setters for Lombok compatibility
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
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
    
    public String getDifficulty() {
        return difficulty;
    }
    
    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }
    
    public Integer getDuration() {
        return duration;
    }
    
    public void setDuration(Integer duration) {
        this.duration = duration;
    }
    
    public List<ExerciseDTO> getExercises() {
        return exercises;
    }
    
    public void setExercises(List<ExerciseDTO> exercises) {
        this.exercises = exercises;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public Integer getProgress() {
        return progress;
    }
    
    public void setProgress(Integer progress) {
        this.progress = progress;
    }
    
    public OffsetDateTime getStartDate() {
        return startDate;
    }
    
    public void setStartDate(OffsetDateTime startDate) {
        this.startDate = startDate;
    }
    
    public OffsetDateTime getEndDate() {
        return endDate;
    }
    
    public void setEndDate(OffsetDateTime endDate) {
        this.endDate = endDate;
    }
    
    public Long getGoalId() {
        return goalId;
    }
    
    public void setGoalId(Long goalId) {
        this.goalId = goalId;
    }
    
    public String getGoalName() {
        return goalName;
    }
    
    public void setGoalName(String goalName) {
        this.goalName = goalName;
    }
    
    public Integer getSubscribers() {
        return subscribers;
    }
    
    public void setSubscribers(Integer subscribers) {
        this.subscribers = subscribers;
    }
    
    public Double getPrice() {
        return price;
    }
    
    public void setPrice(Double price) {
        this.price = price;
    }
    
    public String getFocusArea() {
        return focusArea;
    }
    
    public void setFocusArea(String focusArea) {
        this.focusArea = focusArea;
    }
    
    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    // Manual Builder
    public static TrainingPlanResponseDTOBuilder builder() {
        return new TrainingPlanResponseDTOBuilder();
    }

    public static class TrainingPlanResponseDTOBuilder {
        private final TrainingPlanResponseDTO instance = new TrainingPlanResponseDTO();
        public TrainingPlanResponseDTOBuilder id(Long id) { instance.setId(id); return this; }
        public TrainingPlanResponseDTOBuilder title(String title) { instance.setTitle(title); return this; }
        public TrainingPlanResponseDTOBuilder description(String description) { instance.setDescription(description); return this; }
        public TrainingPlanResponseDTOBuilder difficulty(String difficulty) { instance.setDifficulty(difficulty); return this; }
        public TrainingPlanResponseDTOBuilder duration(Integer duration) { instance.setDuration(duration); return this; }
        public TrainingPlanResponseDTOBuilder exercises(List<ExerciseDTO> exercises) { instance.setExercises(exercises); return this; }
        public TrainingPlanResponseDTOBuilder status(String status) { instance.setStatus(status); return this; }
        public TrainingPlanResponseDTOBuilder progress(Integer progress) { instance.setProgress(progress); return this; }
        public TrainingPlanResponseDTOBuilder startDate(OffsetDateTime startDate) { instance.setStartDate(startDate); return this; }
        public TrainingPlanResponseDTOBuilder endDate(OffsetDateTime endDate) { instance.setEndDate(endDate); return this; }
        public TrainingPlanResponseDTOBuilder goalId(Long goalId) { instance.setGoalId(goalId); return this; }
        public TrainingPlanResponseDTOBuilder goalName(String goalName) { instance.setGoalName(goalName); return this; }
        public TrainingPlanResponseDTOBuilder subscribers(Integer subscribers) { instance.setSubscribers(subscribers); return this; }
        public TrainingPlanResponseDTOBuilder price(Double price) { instance.setPrice(price); return this; }
        public TrainingPlanResponseDTOBuilder focusArea(String focusArea) { instance.setFocusArea(focusArea); return this; }
        public TrainingPlanResponseDTOBuilder createdAt(OffsetDateTime createdAt) { instance.setCreatedAt(createdAt); return this; }
        public TrainingPlanResponseDTOBuilder updatedAt(OffsetDateTime updatedAt) { instance.setUpdatedAt(updatedAt); return this; }
        public TrainingPlanResponseDTO build() { return instance; }
    }
}



