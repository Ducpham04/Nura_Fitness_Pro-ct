package com.example.fitchallenge.DTO.PersonalizedPlanDetailDTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO Response cho PersonalizedPlanDetail
 * Video URL được lấy từ Exercise master data.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PersonalizedPlanDetailResponse {
    /**
     * Mã bản ghi PersonalizedPlanDetail
     */
    private Long id;
    
    /**
     * User ID
     */
    private Long userId;
    
    /**
     * Số ngày trong kế hoạch
     */
    private Integer dayNumber;
    
    /**
     * Exercise ID. Giữ tên challengeId để backward compatibility với FE cũ.
     */
    private Long challengeId;
    private Long exerciseId;
    
    /**
     * Tên bài tập (tiếng Anh)
     */
    private String exerciseName;

    /**
     * Tên bài tập tiếng Việt (nullable – hiển thị khi ngôn ngữ là vi)
     */
    private String exerciseNameVi;
    
    /**
     * Số hiệp (sets)
     */
    private Integer sets;
    
    /**
     * Số lần lặp (reps)
     */
    private Integer reps;
    private Integer restTime;
    
    /**
     * Độ khó (EASY, MEDIUM, HARD)
     */
    private String difficulty;
    
    /**
     * Nhóm cơ mục tiêu
     */
    private String targetMuscle;
    
    /**
     * Video URL - được lấy từ Exercise.videoUrl
     */
    private String videoUrl;
    
    /**
     * Alias cũ cho FE: tên bài tập.
     */
    private String challengeName;

    /**
     * Calories ước tính cho bài tập này
     */
    private Integer estimatedCalories;

    /**
     * Ghi chú hướng dẫn: nhóm cơ, phase, mục tiêu, tempo.
     */
    private String notes;

    /**
     * Số tạ gợi ý (null = bodyweight).
     * Ví dụ: "~15kg dumbbell", "~40kg barbell"
     */
    private String recommendedWeight;

    // Manual Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Integer getDayNumber() { return dayNumber; }
    public void setDayNumber(Integer dayNumber) { this.dayNumber = dayNumber; }
    public Long getChallengeId() { return challengeId; }
    public void setChallengeId(Long challengeId) { this.challengeId = challengeId; }
    public Long getExerciseId() { return exerciseId; }
    public void setExerciseId(Long exerciseId) { this.exerciseId = exerciseId; }
    public String getExerciseName() { return exerciseName; }
    public void setExerciseName(String exerciseName) { this.exerciseName = exerciseName; }
    public String getExerciseNameVi() { return exerciseNameVi; }
    public void setExerciseNameVi(String exerciseNameVi) { this.exerciseNameVi = exerciseNameVi; }
    public Integer getSets() { return sets; }
    public void setSets(Integer sets) { this.sets = sets; }
    public Integer getReps() { return reps; }
    public void setReps(Integer reps) { this.reps = reps; }
    public Integer getRestTime() { return restTime; }
    public void setRestTime(Integer restTime) { this.restTime = restTime; }
    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }
    public String getTargetMuscle() { return targetMuscle; }
    public void setTargetMuscle(String targetMuscle) { this.targetMuscle = targetMuscle; }
    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }
    public String getChallengeName() { return challengeName; }
    public void setChallengeName(String challengeName) { this.challengeName = challengeName; }
    public Integer getEstimatedCalories() { return estimatedCalories; }
    public void setEstimatedCalories(Integer estimatedCalories) { this.estimatedCalories = estimatedCalories; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getRecommendedWeight() { return recommendedWeight; }
    public void setRecommendedWeight(String recommendedWeight) { this.recommendedWeight = recommendedWeight; }

    /**
     * Nested exercise metadata for FE card display (equipment, type, image).
     */
    private ExerciseMeta exercise;
    public ExerciseMeta getExercise() { return exercise; }
    public void setExercise(ExerciseMeta exercise) { this.exercise = exercise; }

    /**
     * Mirrors FE PersonalizedWorkoutExercise.exercise shape.
     */
    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class ExerciseMeta {
        private String imageUrl;
        private String videoUrl;
        private String exerciseType;
        private String difficultyLevel;
        private String primaryMuscle;
        private String requiredEquipment;
        private String secondaryMuscles;   // comma-separated, e.g. "Triceps,Front Deltoid"
    }
}

