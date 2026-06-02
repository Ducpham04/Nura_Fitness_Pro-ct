package com.example.fitchallenge.DTO.PersonalizedPlanDetailDTO;

/**
 * DTO gọn cho danh sách bài tập thay thế khi người dùng muốn đổi bài.
 */
public class AlternativeExerciseDTO {
    private Long id;
    private String name;
    private String nameVi;
    private String primaryMuscle;
    private String exerciseType;
    private String difficultyLevel;
    private String requiredEquipment;
    private String imageUrl;
    private String videoUrl;
    private Integer defaultSets;
    private Integer defaultReps;
    private Integer defaultRestSeconds;

    public AlternativeExerciseDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getNameVi() { return nameVi; }
    public void setNameVi(String nameVi) { this.nameVi = nameVi; }
    public String getPrimaryMuscle() { return primaryMuscle; }
    public void setPrimaryMuscle(String primaryMuscle) { this.primaryMuscle = primaryMuscle; }
    public String getExerciseType() { return exerciseType; }
    public void setExerciseType(String exerciseType) { this.exerciseType = exerciseType; }
    public String getDifficultyLevel() { return difficultyLevel; }
    public void setDifficultyLevel(String difficultyLevel) { this.difficultyLevel = difficultyLevel; }
    public String getRequiredEquipment() { return requiredEquipment; }
    public void setRequiredEquipment(String requiredEquipment) { this.requiredEquipment = requiredEquipment; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }
    public Integer getDefaultSets() { return defaultSets; }
    public void setDefaultSets(Integer defaultSets) { this.defaultSets = defaultSets; }
    public Integer getDefaultReps() { return defaultReps; }
    public void setDefaultReps(Integer defaultReps) { this.defaultReps = defaultReps; }
    public Integer getDefaultRestSeconds() { return defaultRestSeconds; }
    public void setDefaultRestSeconds(Integer defaultRestSeconds) { this.defaultRestSeconds = defaultRestSeconds; }
}
