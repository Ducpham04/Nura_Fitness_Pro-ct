package com.example.fitchallenge.DTO.TrainingPlanDetailDTO;

import lombok.Data;

@Data
public class TrainingPlanDetailResponse {
    private Long tpdId;
    private Long trainingPlanId;
    private String trainingPlanTitle;
    private Integer dayNumber;
    private Long exerciseId;
    private String exerciseName;
    private String videoUrl;
    private String exerciseType;
    private String challengeName;
    private Integer sets;
    private Integer reps;
    private Integer restTime;

    public Long getTpdId() { return tpdId; }
    public void setTpdId(Long tpdId) { this.tpdId = tpdId; }
    public Long getTrainingPlanId() { return trainingPlanId; }
    public void setTrainingPlanId(Long trainingPlanId) { this.trainingPlanId = trainingPlanId; }
    public String getTrainingPlanTitle() { return trainingPlanTitle; }
    public void setTrainingPlanTitle(String trainingPlanTitle) { this.trainingPlanTitle = trainingPlanTitle; }
    public Integer getDayNumber() { return dayNumber; }
    public void setDayNumber(Integer dayNumber) { this.dayNumber = dayNumber; }
    public Long getExerciseId() { return exerciseId; }
    public void setExerciseId(Long exerciseId) { this.exerciseId = exerciseId; }
    public String getExerciseName() { return exerciseName; }
    public void setExerciseName(String exerciseName) { this.exerciseName = exerciseName; }
    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }
    public String getExerciseType() { return exerciseType; }
    public void setExerciseType(String exerciseType) { this.exerciseType = exerciseType; }
    public String getChallengeName() { return challengeName; }
    public void setChallengeName(String challengeName) { this.challengeName = challengeName; }
    public Integer getSets() { return sets; }
    public void setSets(Integer sets) { this.sets = sets; }
    public Integer getReps() { return reps; }
    public void setReps(Integer reps) { this.reps = reps; }
    public Integer getRestTime() { return restTime; }
    public void setRestTime(Integer restTime) { this.restTime = restTime; }
}
