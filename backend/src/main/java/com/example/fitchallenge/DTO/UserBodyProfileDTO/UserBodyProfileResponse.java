package com.example.fitchallenge.DTO.UserBodyProfileDTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserBodyProfileResponse {
    private Long id;
    private Long userId;
    private Double height;
    private Double weight;
    private Double bmi;
    private Double bodyFat;
    private Double muscleMass;
    private Integer age;
    private String gender;
    private String experienceLevel;
    private String goal;
    private String injuryNotes;
    private Integer targetBudgetPerDay;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Double getHeight() { return height; }
    public void setHeight(Double height) { this.height = height; }
    public Double getWeight() { return weight; }
    public void setWeight(Double weight) { this.weight = weight; }
    public Double getBmi() { return bmi; }
    public void setBmi(Double bmi) { this.bmi = bmi; }
    public Double getBodyFat() { return bodyFat; }
    public void setBodyFat(Double bodyFat) { this.bodyFat = bodyFat; }
    public Double getMuscleMass() { return muscleMass; }
    public void setMuscleMass(Double muscleMass) { this.muscleMass = muscleMass; }
    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public String getExperienceLevel() { return experienceLevel; }
    public void setExperienceLevel(String experienceLevel) { this.experienceLevel = experienceLevel; }
    public String getGoal() { return goal; }
    public void setGoal(String goal) { this.goal = goal; }
    public String getInjuryNotes() { return injuryNotes; }
    public void setInjuryNotes(String injuryNotes) { this.injuryNotes = injuryNotes; }
    public Integer getTargetBudgetPerDay() { return targetBudgetPerDay; }
    public void setTargetBudgetPerDay(Integer targetBudgetPerDay) { this.targetBudgetPerDay = targetBudgetPerDay; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}






