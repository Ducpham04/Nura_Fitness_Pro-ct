package com.example.fitchallenge.DTO.TraningPlanDTO;



import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TrainingPlanResponseDTO {
    private Long tpId;
    private Long goalId;
    private String goalName;
    private String  linkImage;
    private String title;
    private String description;
    private String difficultyLevel;
    private Integer durationWeeks;
    private String createdAt;

    public Long getTpId() { return tpId; }
    public void setTpId(Long tpId) { this.tpId = tpId; }
    public Long getGoalId() { return goalId; }
    public void setGoalId(Long goalId) { this.goalId = goalId; }
    public String getGoalName() { return goalName; }
    public void setGoalName(String goalName) { this.goalName = goalName; }
    public String getLinkImage() { return linkImage; }
    public void setLinkImage(String linkImage) { this.linkImage = linkImage; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getDifficultyLevel() { return difficultyLevel; }
    public void setDifficultyLevel(String difficultyLevel) { this.difficultyLevel = difficultyLevel; }
    public Integer getDurationWeeks() { return durationWeeks; }
    public void setDurationWeeks(Integer durationWeeks) { this.durationWeeks = durationWeeks; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}

