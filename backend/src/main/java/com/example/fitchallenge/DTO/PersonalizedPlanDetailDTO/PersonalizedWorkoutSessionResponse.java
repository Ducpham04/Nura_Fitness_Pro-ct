package com.example.fitchallenge.DTO.PersonalizedPlanDetailDTO;

import java.util.List;

public class PersonalizedWorkoutSessionResponse {
    private Integer dayNumber;
    private String sessionType;
    private Boolean isRestDay;
    private Integer durationMinutes;
    private Integer estimatedCaloriesBurned;
    private List<String> muscleGroupsTargeted;
    private List<String> warmup;
    private List<PersonalizedPlanDetailResponse> exercises;
    private List<String> cooldown;
    private Object cardio;
    private List<String> notes;

    public Integer getDayNumber() { return dayNumber; }
    public void setDayNumber(Integer dayNumber) { this.dayNumber = dayNumber; }
    public String getSessionType() { return sessionType; }
    public void setSessionType(String sessionType) { this.sessionType = sessionType; }
    public Boolean getIsRestDay() { return isRestDay; }
    public void setIsRestDay(Boolean restDay) { isRestDay = restDay; }
    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }
    public Integer getEstimatedCaloriesBurned() { return estimatedCaloriesBurned; }
    public void setEstimatedCaloriesBurned(Integer estimatedCaloriesBurned) { this.estimatedCaloriesBurned = estimatedCaloriesBurned; }
    public List<String> getMuscleGroupsTargeted() { return muscleGroupsTargeted; }
    public void setMuscleGroupsTargeted(List<String> muscleGroupsTargeted) { this.muscleGroupsTargeted = muscleGroupsTargeted; }
    public List<String> getWarmup() { return warmup; }
    public void setWarmup(List<String> warmup) { this.warmup = warmup; }
    public List<PersonalizedPlanDetailResponse> getExercises() { return exercises; }
    public void setExercises(List<PersonalizedPlanDetailResponse> exercises) { this.exercises = exercises; }
    public List<String> getCooldown() { return cooldown; }
    public void setCooldown(List<String> cooldown) { this.cooldown = cooldown; }
    public Object getCardio() { return cardio; }
    public void setCardio(Object cardio) { this.cardio = cardio; }
    public List<String> getNotes() { return notes; }
    public void setNotes(List<String> notes) { this.notes = notes; }
}
