package com.example.fitchallenge.DTO.HealthProfileDTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO cho Health Profile Request
 * Bao gồm tất cả thông tin cần thiết để tạo/cập nhật Health Profile
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HealthProfileRequest {
    
    // ========== NHÓM A: Thông tin cơ thể (bắt buộc) ==========
    private BigDecimal heightCm;
    private BigDecimal weightKg;
    private Integer age;
    private String gender; // MALE, FEMALE, OTHER
    
    // Đo vòng (để tính Navy Body Fat)
    private BigDecimal waistCm; // Vòng eo
    private BigDecimal hipCm; // Vòng hông (cần cho nữ)
    private BigDecimal neckCm; // Vòng cổ
    
    private String bodyImageUrl; // Ảnh toàn thân (tùy chọn)
    
    // ========== NHÓM B: Thói quen sinh hoạt ==========
    private String dailyActivityLevel; // sedentary, lightly_active, moderately_active, very_active, extra_active
    private Integer workoutFrequencyPerWeek; // Số buổi tập/tuần
    private String favoriteExerciseType; // Cardio, Yoga, Strength, HIIT, Mixed
    private String currentDietType; // high_carb, high_fat, high_protein, balanced, keto, vegan
    private Integer sleepHoursPerDay; // Số giờ ngủ/ngày
    private String stressLevel; // low, medium, high
    private String occupation; // office_worker, driver, construction, freelancer, student
    
    // ========== NHÓM C: Mục tiêu cá nhân ==========
    private String primaryGoal; // lose_weight, build_muscle, lose_fat, maintain_health, prepare_event
    private BigDecimal goalWeightKg;
    private BigDecimal goalBodyFatPercent;
    private Integer goalTimelineDays; // Thời gian đạt mục tiêu (ngày)
    private String goalDescription;
    
    // ========== NHÓM D: Tình trạng sức khỏe ==========
    private String medicalHistory; // Tiền sử bệnh lý
    private String currentInjuries; // Chấn thương hiện tại
    private String mobilityLevel; // excellent, good, limited, restricted
    private String availableEquipment; // none, dumbbells, resistance_bands, full_gym, bodyweight_only
    private Integer preferredWorkoutDurationMinutes; // Thời lượng mỗi buổi mong muốn (15/30/45/60)

    // ========== NHÓM E: Hành vi ăn uống ==========
    private Integer mealsPerDay; // Số bữa ăn/ngày
    private String frequentFoods; // Món ăn thường xuyên
    private BigDecimal waterIntakeLitersPerDay; // Lượng nước uống (L/ngày)
    private String alcoholConsumption; // none, occasional, regular, heavy
    private String smokingStatus; // none, occasional, regular
    
    // Manual getters/setters for Lombok compatibility
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

    public Integer getPreferredWorkoutDurationMinutes() {
        return preferredWorkoutDurationMinutes;
    }

    public void setPreferredWorkoutDurationMinutes(Integer preferredWorkoutDurationMinutes) {
        this.preferredWorkoutDurationMinutes = preferredWorkoutDurationMinutes;
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
}






