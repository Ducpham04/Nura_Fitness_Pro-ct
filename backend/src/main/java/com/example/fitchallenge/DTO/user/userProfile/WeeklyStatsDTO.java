package com.example.fitchallenge.DTO.user.userProfile;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// Thống kê nhanh tuần này
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class WeeklyStatsDTO {
    private Integer workouts;
    private Integer calories;
    private Integer minutes;

    // Manual builder for Lombok compatibility
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Integer workouts;
        private Integer calories;
        private Integer minutes;

        public Builder workouts(Integer workouts) {
            this.workouts = workouts;
            return this;
        }

        public Builder calories(Integer calories) {
            this.calories = calories;
            return this;
        }

        public Builder minutes(Integer minutes) {
            this.minutes = minutes;
            return this;
        }

        public WeeklyStatsDTO build() {
            WeeklyStatsDTO dto = new WeeklyStatsDTO();
            dto.workouts = this.workouts;
            dto.calories = this.calories;
            dto.minutes = this.minutes;
            return dto;
        }
    }
}