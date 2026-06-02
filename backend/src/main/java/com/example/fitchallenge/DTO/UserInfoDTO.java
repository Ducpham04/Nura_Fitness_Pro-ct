package com.example.fitchallenge.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO cho User Info API
 * GET /api/user/info và PUT /api/user/info
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserInfoDTO {
    private Long infoId;
    private Long userId;
    private String userName;
    private String email;
    private String avatar; // linkImage
    
    // Body information
    private BigDecimal heightCm;
    private BigDecimal weightKg;
    private Integer age;
    private String gender;
    private String activityLevel; // sedentary, lightly active, moderately active, very active, extra active
    private BigDecimal bodyFatPct;
    
    // Calculated fields
    private BigDecimal bmi;
    private BigDecimal bmr;
    private BigDecimal recommendedCalories;
    
    // Goal
    private Long goalId;
    private String goalName;
    
    private String createdAt;
    
    // Manual getters/setters for Lombok compatibility
    public Long getUserId() {
        return userId;
    }
    
    public void setUserId(Long userId) {
        this.userId = userId;
    }
    
    public Long getInfoId() {
        return infoId;
    }
    
    public void setInfoId(Long infoId) {
        this.infoId = infoId;
    }
    
    public String getUserName() {
        return userName;
    }
    
    public void setUserName(String userName) {
        this.userName = userName;
    }
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public String getAvatar() {
        return avatar;
    }
    
    public void setAvatar(String avatar) {
        this.avatar = avatar;
    }
    
    public BigDecimal getHeightCm() {
        return heightCm;
    }
    
    public void setHeightCm(BigDecimal heightCm) {
        this.heightCm = heightCm;
    }
    
    public BigDecimal getWeightKg() {
        return weightKg;
    }
    
    public void setWeightKg(BigDecimal weightKg) {
        this.weightKg = weightKg;
    }
    
    public Integer getAge() {
        return age;
    }
    
    public void setAge(Integer age) {
        this.age = age;
    }
    
    public String getGender() {
        return gender;
    }
    
    public void setGender(String gender) {
        this.gender = gender;
    }
    
    public String getActivityLevel() {
        return activityLevel;
    }
    
    public void setActivityLevel(String activityLevel) {
        this.activityLevel = activityLevel;
    }
    
    public BigDecimal getBodyFatPct() {
        return bodyFatPct;
    }
    
    public void setBodyFatPct(BigDecimal bodyFatPct) {
        this.bodyFatPct = bodyFatPct;
    }
    
    public BigDecimal getBmi() {
        return bmi;
    }
    
    public void setBmi(BigDecimal bmi) {
        this.bmi = bmi;
    }
    
    public BigDecimal getBmr() {
        return bmr;
    }
    
    public void setBmr(BigDecimal bmr) {
        this.bmr = bmr;
    }
    
    public BigDecimal getRecommendedCalories() {
        return recommendedCalories;
    }
    
    public void setRecommendedCalories(BigDecimal recommendedCalories) {
        this.recommendedCalories = recommendedCalories;
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
    
    public String getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    }







