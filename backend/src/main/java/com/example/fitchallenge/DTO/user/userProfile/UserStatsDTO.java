package com.example.fitchallenge.DTO.user.userProfile;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// Stats chính
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserStatsDTO {
    private Integer aiScore;
    private Integer challengesCompleted;
    private Integer totalWorkouts;
    private Integer currentStreak;

    // Manual builder for Lombok compatibility
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Integer aiScore;
        private Integer challengesCompleted;
        private Integer totalWorkouts;
        private Integer currentStreak;

        public Builder aiScore(Integer aiScore) {
            this.aiScore = aiScore;
            return this;
        }

        public Builder challengesCompleted(Integer challengesCompleted) {
            this.challengesCompleted = challengesCompleted;
            return this;
        }

        public Builder totalWorkouts(Integer totalWorkouts) {
            this.totalWorkouts = totalWorkouts;
            return this;
        }

        public Builder currentStreak(Integer currentStreak) {
            this.currentStreak = currentStreak;
            return this;
        }

        public UserStatsDTO build() {
            UserStatsDTO dto = new UserStatsDTO();
            dto.aiScore = this.aiScore;
            dto.challengesCompleted = this.challengesCompleted;
            dto.totalWorkouts = this.totalWorkouts;
            dto.currentStreak = this.currentStreak;
            return dto;
        }
    }
}