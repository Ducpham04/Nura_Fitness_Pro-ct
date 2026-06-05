package com.example.fitchallenge.DTO.UserTrainingDTO;

import lombok.Data;

import java.time.LocalDate;

@Data
public class UserTrainingDTO {
    private Long id; // utId (UserTraining ID)
    private Long trainingPlanId; // Training Plan template ID
    private String name ;
    private LocalDate startDate ;
    private LocalDate endDate ;
    private Double completionPercentage ;
    private String Status ;
    private Integer currentDay;
    private Integer weekNumber;
    private Integer totalWeeks;
    private String programId;
    private Integer workoutsPerWeek; // Số lần tập luyện mỗi tuần

    // Manual getters/setters for Lombok compatibility
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getTrainingPlanId() {
        return trainingPlanId;
    }

    public void setTrainingPlanId(Long trainingPlanId) {
        this.trainingPlanId = trainingPlanId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public Double getCompletionPercentage() {
        return completionPercentage;
    }

    public void setCompletionPercentage(Double completionPercentage) {
        this.completionPercentage = completionPercentage;
    }

    public String getStatus() {
        return Status;
    }

    public void setStatus(String status) {
        this.Status = status;
    }

    public Integer getCurrentDay() {
        return currentDay;
    }

    public void setCurrentDay(Integer currentDay) {
        this.currentDay = currentDay;
    }

    public Integer getWeekNumber() {
        return weekNumber;
    }

    public void setWeekNumber(Integer weekNumber) {
        this.weekNumber = weekNumber;
    }

    public Integer getTotalWeeks() {
        return totalWeeks;
    }

    public void setTotalWeeks(Integer totalWeeks) {
        this.totalWeeks = totalWeeks;
    }

    public String getProgramId() {
        return programId;
    }

    public void setProgramId(String programId) {
        this.programId = programId;
    }

    public Integer getWorkoutsPerWeek() {
        return workoutsPerWeek;
    }

    public void setWorkoutsPerWeek(Integer workoutsPerWeek) {
        this.workoutsPerWeek = workoutsPerWeek;
    }
}
