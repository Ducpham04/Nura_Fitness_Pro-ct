package com.example.fitchallenge.DTO.TrainingPlanDTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO cho Exercise trong Training Plan theo yêu cầu FE
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ExerciseDTO {
    private Long id;
    private String name;
    private Integer sets;
    private Integer reps;
    private Integer duration; // in seconds
    private Integer restTime; // in seconds
    private String instructions;
    private String videoUrl;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
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
    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }

    // Manual Builder
    public static ExerciseDTOBuilder builder() {
        return new ExerciseDTOBuilder();
    }

    public static class ExerciseDTOBuilder {
        private final ExerciseDTO instance = new ExerciseDTO();
        public ExerciseDTOBuilder id(Long id) { instance.setId(id); return this; }
        public ExerciseDTOBuilder name(String name) { instance.setName(name); return this; }
        public ExerciseDTOBuilder sets(Integer sets) { instance.setSets(sets); return this; }
        public ExerciseDTOBuilder reps(Integer reps) { instance.setReps(reps); return this; }
        public ExerciseDTOBuilder duration(Integer duration) { instance.setDuration(duration); return this; }
        public ExerciseDTOBuilder restTime(Integer restTime) { instance.setRestTime(restTime); return this; }
        public ExerciseDTOBuilder instructions(String instructions) { instance.setInstructions(instructions); return this; }
        public ExerciseDTOBuilder videoUrl(String videoUrl) { instance.setVideoUrl(videoUrl); return this; }
        public ExerciseDTO build() { return instance; }
    }
}



