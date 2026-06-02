package com.example.fitchallenge.DTO.user.userProfile;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// Thống kê hoạt động
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ActivitySummaryDTO {
    private Integer totalCaloriesBurned;
    private Integer totalMinutes;
    private String favoriteWorkout;

    // Manual builder for Lombok compatibility
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Integer totalCaloriesBurned;
        private Integer totalMinutes;
        private String favoriteWorkout;

        public Builder totalCaloriesBurned(Integer totalCaloriesBurned) {
            this.totalCaloriesBurned = totalCaloriesBurned;
            return this;
        }

        public Builder totalMinutes(Integer totalMinutes) {
            this.totalMinutes = totalMinutes;
            return this;
        }

        public Builder favoriteWorkout(String favoriteWorkout) {
            this.favoriteWorkout = favoriteWorkout;
            return this;
        }

        public ActivitySummaryDTO build() {
            ActivitySummaryDTO dto = new ActivitySummaryDTO();
            dto.totalCaloriesBurned = this.totalCaloriesBurned;
            dto.totalMinutes = this.totalMinutes;
            dto.favoriteWorkout = this.favoriteWorkout;
            return dto;
        }
    }
}
