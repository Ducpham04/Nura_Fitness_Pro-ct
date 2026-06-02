package com.example.fitchallenge.DTO.user.userProfile;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

// DTO trả về toàn bộ profile
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class FullUserProfileDTO {
    private UserProfileDTO profile;
    private UserStatsDTO stats;
    private ActivitySummaryDTO activity;
    private List<AchievementDTO> achievements;
    private UserGoalsDTO goals;
    private WeeklyStatsDTO weeklyStats;

    // Manual builder for Lombok compatibility
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private UserProfileDTO profile;
        private UserStatsDTO stats;
        private ActivitySummaryDTO activity;
        private List<AchievementDTO> achievements;
        private UserGoalsDTO goals;
        private WeeklyStatsDTO weeklyStats;

        public Builder profile(UserProfileDTO profile) {
            this.profile = profile;
            return this;
        }

        public Builder stats(UserStatsDTO stats) {
            this.stats = stats;
            return this;
        }

        public Builder activity(ActivitySummaryDTO activity) {
            this.activity = activity;
            return this;
        }

        public Builder achievements(List<AchievementDTO> achievements) {
            this.achievements = achievements;
            return this;
        }

        public Builder goals(UserGoalsDTO goals) {
            this.goals = goals;
            return this;
        }

        public Builder weeklyStats(WeeklyStatsDTO weeklyStats) {
            this.weeklyStats = weeklyStats;
            return this;
        }

        public FullUserProfileDTO build() {
            FullUserProfileDTO dto = new FullUserProfileDTO();
            dto.profile = this.profile;
            dto.stats = this.stats;
            dto.activity = this.activity;
            dto.achievements = this.achievements;
            dto.goals = this.goals;
            dto.weeklyStats = this.weeklyStats;
            return dto;
        }
    }
}