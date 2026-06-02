package com.example.fitchallenge.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO cho Leaderboard API
 */
public class LeaderboardDTO {

    /**
     * Leaderboard Entry - Mỗi entry đại diện cho 1 user trong leaderboard
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LeaderboardEntryDTO {
        private Integer rank;
        private Long userId;
        private String userName;
        private String profileImage;
        private Integer value; // Giá trị theo category (points, challenges, hoặc streak)
        private Integer aiScore;
        private Integer challengesCompleted;
        private Integer streak;
        private Boolean isCurrentUser;
        
        // Manual getters/setters for Lombok compatibility
        public Integer getRank() {
            return rank;
        }
        
        public void setRank(Integer rank) {
            this.rank = rank;
        }
        
        public Long getUserId() {
            return userId;
        }
        
        public void setUserId(Long userId) {
            this.userId = userId;
        }
        
        public String getUserName() {
            return userName;
        }
        
        public void setUserName(String userName) {
            this.userName = userName;
        }
        
        public String getProfileImage() {
            return profileImage;
        }
        
        public void setProfileImage(String profileImage) {
            this.profileImage = profileImage;
        }
        
        public Integer getValue() {
            return value;
        }
        
        public void setValue(Integer value) {
            this.value = value;
        }
        
        public Integer getAiScore() {
            return aiScore;
        }
        
        public void setAiScore(Integer aiScore) {
            this.aiScore = aiScore;
        }
        
        public Integer getChallengesCompleted() {
            return challengesCompleted;
        }
        
        public void setChallengesCompleted(Integer challengesCompleted) {
            this.challengesCompleted = challengesCompleted;
        }
        
        public Integer getStreak() {
            return streak;
        }
        
        public void setStreak(Integer streak) {
            this.streak = streak;
        }
        
        public Boolean getIsCurrentUser() {
            return isCurrentUser;
        }
        
        public void setIsCurrentUser(Boolean isCurrentUser) {
            this.isCurrentUser = isCurrentUser;
        }
    }

    /**
     * Response cho GET /api/leaderboard
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LeaderboardResponse {
        private List<LeaderboardEntryDTO> leaderboard;
        private String category;
        private String period;
        private Integer total;
        private Integer limit;
    }
}



