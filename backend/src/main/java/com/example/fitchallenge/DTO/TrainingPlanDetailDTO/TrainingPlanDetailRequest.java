package com.example.fitchallenge.DTO.TrainingPlanDetailDTO;



import lombok.Data;

@Data
public class TrainingPlanDetailRequest {
    private Long trainingPlanId;
    private Integer dayNumber;
    private Long exerciseId;
    private Long challengeId;
    private Integer sets;
    private Integer reps;
    private Integer duration; // Optional: duration in seconds
    private Integer restTime; // Optional: rest time in seconds
    private String instructions; // Optional: exercise instructions

    public Long getTrainingPlanId() { return trainingPlanId; }
    public void setTrainingPlanId(Long trainingPlanId) { this.trainingPlanId = trainingPlanId; }
    public Integer getDayNumber() { return dayNumber; }
    public void setDayNumber(Integer dayNumber) { this.dayNumber = dayNumber; }
    public Long getExerciseId() { return exerciseId != null ? exerciseId : challengeId; }
    public void setExerciseId(Long exerciseId) { this.exerciseId = exerciseId; }
    public Long getChallengeId() { return challengeId; }
    public void setChallengeId(Long challengeId) { this.challengeId = challengeId; }
    public Integer getSets() { return sets; }
    public void setSets(Integer sets) { this.sets = sets; }
    public Integer getReps() { return reps; }
    public void setReps(Integer reps) { this.reps = reps; }
    public Integer getDuration() { return duration; }
    public void setDuration(Integer duration) { this.duration = duration; }
    public Integer getRestTime() { return restTime; }
    public void setRestTime(Integer restTime) { this.restTime = restTime; }
    public String getInstructions() { return instructions; }
    public void setInstructions(String instructions) { this.instructions = instructions; }
}
