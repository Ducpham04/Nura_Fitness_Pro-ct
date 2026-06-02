package com.example.fitchallenge.DTO.HealthProfileDTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * DTO cho Health Profile Response
 * Bao gồm tất cả thông tin + kết quả tính toán
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HealthProfileResponse {
    
    private Long id;
    private Long userId;
    
    // ========== NHÓM A: Thông tin cơ thể ==========
    private BigDecimal heightCm;
    private BigDecimal weightKg;
    private Integer age;
    private String gender;
    private BigDecimal waistCm;
    private BigDecimal hipCm;
    private BigDecimal neckCm;
    private String bodyImageUrl;
    
    // ========== Tính toán tự động ==========
    private BigDecimal bmi;
    private BigDecimal bmr;
    private BigDecimal tdee;
    private BigDecimal bodyFatPercent;
    private BigDecimal leanBodyMassKg;
    private BigDecimal recommendedCalories;
    
    // ========== NHÓM B: Thói quen sinh hoạt ==========
    private String dailyActivityLevel;
    private Integer workoutFrequencyPerWeek;
    private String favoriteExerciseType;
    private String currentDietType;
    private Integer sleepHoursPerDay;
    private String stressLevel;
    private String occupation;
    
    // ========== NHÓM C: Mục tiêu cá nhân ==========
    private String primaryGoal;
    private BigDecimal goalWeightKg;
    private BigDecimal goalBodyFatPercent;
    private Integer goalTimelineDays;
    private String goalDescription;
    
    // ========== NHÓM D: Tình trạng sức khỏe ==========
    private String medicalHistory;
    private String currentInjuries;
    private String mobilityLevel;
    private String availableEquipment;
    
    // ========== NHÓM E: Hành vi ăn uống ==========
    private Integer mealsPerDay;
    private String frequentFoods;
    private BigDecimal waterIntakeLitersPerDay;
    private String alcoholConsumption;
    private String smokingStatus;
    
    // ========== Timestamps ==========
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    
    // Manual getters/setters for Lombok compatibility
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Long getUserId() {
        return userId;
    }
    
    public void setUserId(Long userId) {
        this.userId = userId;
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
    
    public BigDecimal getWaistCm() {
        return waistCm;
    }
    
    public void setWaistCm(BigDecimal waistCm) {
        this.waistCm = waistCm;
    }
    
    public BigDecimal getHipCm() {
        return hipCm;
    }
    
    public void setHipCm(BigDecimal hipCm) {
        this.hipCm = hipCm;
    }
    
    public BigDecimal getNeckCm() {
        return neckCm;
    }
    
    public void setNeckCm(BigDecimal neckCm) {
        this.neckCm = neckCm;
    }
    
    public String getBodyImageUrl() {
        return bodyImageUrl;
    }
    
    public void setBodyImageUrl(String bodyImageUrl) {
        this.bodyImageUrl = bodyImageUrl;
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
    
    public BigDecimal getTdee() {
        return tdee;
    }
    
    public void setTdee(BigDecimal tdee) {
        this.tdee = tdee;
    }
    
    public BigDecimal getBodyFatPercent() {
        return bodyFatPercent;
    }
    
    public void setBodyFatPercent(BigDecimal bodyFatPercent) {
        this.bodyFatPercent = bodyFatPercent;
    }
    
    public BigDecimal getLeanBodyMassKg() {
        return leanBodyMassKg;
    }
    
    public void setLeanBodyMassKg(BigDecimal leanBodyMassKg) {
        this.leanBodyMassKg = leanBodyMassKg;
    }
    
    public BigDecimal getRecommendedCalories() {
        return recommendedCalories;
    }
    
    public void setRecommendedCalories(BigDecimal recommendedCalories) {
        this.recommendedCalories = recommendedCalories;
    }
    
    public String getDailyActivityLevel() {
        return dailyActivityLevel;
    }
    
    public void setDailyActivityLevel(String dailyActivityLevel) {
        this.dailyActivityLevel = dailyActivityLevel;
    }
    
    public Integer getWorkoutFrequencyPerWeek() {
        return workoutFrequencyPerWeek;
    }
    
    public void setWorkoutFrequencyPerWeek(Integer workoutFrequencyPerWeek) {
        this.workoutFrequencyPerWeek = workoutFrequencyPerWeek;
    }
    
    public String getFavoriteExerciseType() {
        return favoriteExerciseType;
    }
    
    public void setFavoriteExerciseType(String favoriteExerciseType) {
        this.favoriteExerciseType = favoriteExerciseType;
    }
    
    public String getCurrentDietType() {
        return currentDietType;
    }
    
    public void setCurrentDietType(String currentDietType) {
        this.currentDietType = currentDietType;
    }
    
    public Integer getSleepHoursPerDay() {
        return sleepHoursPerDay;
    }
    
    public void setSleepHoursPerDay(Integer sleepHoursPerDay) {
        this.sleepHoursPerDay = sleepHoursPerDay;
    }
    
    public String getStressLevel() {
        return stressLevel;
    }
    
    public void setStressLevel(String stressLevel) {
        this.stressLevel = stressLevel;
    }
    
    public String getOccupation() {
        return occupation;
    }
    
    public void setOccupation(String occupation) {
        this.occupation = occupation;
    }
    
    public String getPrimaryGoal() {
        return primaryGoal;
    }
    
    public void setPrimaryGoal(String primaryGoal) {
        this.primaryGoal = primaryGoal;
    }
    
    public BigDecimal getGoalWeightKg() {
        return goalWeightKg;
    }
    
    public void setGoalWeightKg(BigDecimal goalWeightKg) {
        this.goalWeightKg = goalWeightKg;
    }
    
    public BigDecimal getGoalBodyFatPercent() {
        return goalBodyFatPercent;
    }
    
    public void setGoalBodyFatPercent(BigDecimal goalBodyFatPercent) {
        this.goalBodyFatPercent = goalBodyFatPercent;
    }
    
    public Integer getGoalTimelineDays() {
        return goalTimelineDays;
    }
    
    public void setGoalTimelineDays(Integer goalTimelineDays) {
        this.goalTimelineDays = goalTimelineDays;
    }
    
    public String getGoalDescription() {
        return goalDescription;
    }
    
    public void setGoalDescription(String goalDescription) {
        this.goalDescription = goalDescription;
    }
    
    public String getMedicalHistory() {
        return medicalHistory;
    }
    
    public void setMedicalHistory(String medicalHistory) {
        this.medicalHistory = medicalHistory;
    }
    
    public String getCurrentInjuries() {
        return currentInjuries;
    }
    
    public void setCurrentInjuries(String currentInjuries) {
        this.currentInjuries = currentInjuries;
    }
    
    public String getMobilityLevel() {
        return mobilityLevel;
    }
    
    public void setMobilityLevel(String mobilityLevel) {
        this.mobilityLevel = mobilityLevel;
    }
    
    public String getAvailableEquipment() {
        return availableEquipment;
    }
    
    public void setAvailableEquipment(String availableEquipment) {
        this.availableEquipment = availableEquipment;
    }
    
    public Integer getMealsPerDay() {
        return mealsPerDay;
    }
    
    public void setMealsPerDay(Integer mealsPerDay) {
        this.mealsPerDay = mealsPerDay;
    }
    
    public String getFrequentFoods() {
        return frequentFoods;
    }
    
    public void setFrequentFoods(String frequentFoods) {
        this.frequentFoods = frequentFoods;
    }
    
    public BigDecimal getWaterIntakeLitersPerDay() {
        return waterIntakeLitersPerDay;
    }
    
    public void setWaterIntakeLitersPerDay(BigDecimal waterIntakeLitersPerDay) {
        this.waterIntakeLitersPerDay = waterIntakeLitersPerDay;
    }
    
    public String getAlcoholConsumption() {
        return alcoholConsumption;
    }
    
    public void setAlcoholConsumption(String alcoholConsumption) {
        this.alcoholConsumption = alcoholConsumption;
    }
    
    public String getSmokingStatus() {
        return smokingStatus;
    }
    
    public void setSmokingStatus(String smokingStatus) {
        this.smokingStatus = smokingStatus;
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
}






