package com.example.fitchallenge.DTO.user.userProfile;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// Mục tiêu user
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserGoalsDTO {
    private Integer weeklyWorkouts; // Số workouts đã completed trong tuần này
    private Integer weeklyWorkoutsTarget; // Target số workouts mỗi tuần (default: 5)
    private Integer dailyCalories; // Recommended calories per day
    private Integer monthlyDistance; // Monthly distance goal (km)
    private String goalName; // Primary goal name (e.g., "Lose Weight", "Build Muscle")
    private Long goalId; // Primary goal ID

    // Manual builder for Lombok compatibility
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Integer weeklyWorkouts;
        private Integer weeklyWorkoutsTarget;
        private Integer dailyCalories;
        private Integer monthlyDistance;
        private String goalName;
        private Long goalId;

        public Builder weeklyWorkouts(Integer weeklyWorkouts) {
            this.weeklyWorkouts = weeklyWorkouts;
            return this;
        }

        public Builder weeklyWorkoutsTarget(Integer weeklyWorkoutsTarget) {
            this.weeklyWorkoutsTarget = weeklyWorkoutsTarget;
            return this;
        }

        public Builder dailyCalories(Integer dailyCalories) {
            this.dailyCalories = dailyCalories;
            return this;
        }

        public Builder monthlyDistance(Integer monthlyDistance) {
            this.monthlyDistance = monthlyDistance;
            return this;
        }

        public Builder goalName(String goalName) {
            this.goalName = goalName;
            return this;
        }

        public Builder goalId(Long goalId) {
            this.goalId = goalId;
            return this;
        }

        public UserGoalsDTO build() {
            UserGoalsDTO dto = new UserGoalsDTO();
            dto.weeklyWorkouts = this.weeklyWorkouts;
            dto.weeklyWorkoutsTarget = this.weeklyWorkoutsTarget;
            dto.dailyCalories = this.dailyCalories;
            dto.monthlyDistance = this.monthlyDistance;
            dto.goalName = this.goalName;
            dto.goalId = this.goalId;
            return dto;
        }
    }
}