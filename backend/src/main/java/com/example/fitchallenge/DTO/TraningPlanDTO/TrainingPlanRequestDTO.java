package com.example.fitchallenge.DTO.TraningPlanDTO;


import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TrainingPlanRequestDTO {
    private Long goalId;
    private String title;
    private String description;
    private String difficultyLevel;
    private Integer durationWeeks;

    public Long getGoalId() { return goalId; }
    public void setGoalId(Long goalId) { this.goalId = goalId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getDifficultyLevel() { return difficultyLevel; }
    public void setDifficultyLevel(String difficultyLevel) { this.difficultyLevel = difficultyLevel; }
    public Integer getDurationWeeks() { return durationWeeks; }
    public void setDurationWeeks(Integer durationWeeks) { this.durationWeeks = durationWeeks; }
}
