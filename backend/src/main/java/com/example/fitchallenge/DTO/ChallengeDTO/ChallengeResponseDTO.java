package com.example.fitchallenge.DTO.ChallengeDTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * DTO cho Challenge response theo yêu cầu FE
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ChallengeResponseDTO {
    private Long id;
    private String title;
    private String imageUrl; // Ảnh bìa thử thách
    private String description;
    private Integer participants; // Count of participants
    private String reward; // Reward description
    private Integer durationDays;
    private Integer rewardPoints;
    private String aiRulesJson;
    private String status; // Active, Upcoming, Completed
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private List<Long> exerciseIds;
    
    // For challenge detail with participants list
    private List<ParticipantDTO> participantsList;
    
    // Manual getters/setters for Lombok compatibility
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public Integer getParticipants() {
        return participants;
    }
    
    public void setParticipants(Integer participants) {
        this.participants = participants;
    }
    
    public String getReward() {
        return reward;
    }
    
    public void setReward(String reward) {
        this.reward = reward;
    }

    public Integer getDurationDays() { return durationDays; }
    public void setDurationDays(Integer durationDays) { this.durationDays = durationDays; }
    public Integer getRewardPoints() { return rewardPoints; }
    public void setRewardPoints(Integer rewardPoints) { this.rewardPoints = rewardPoints; }
    public String getAiRulesJson() { return aiRulesJson; }
    public void setAiRulesJson(String aiRulesJson) { this.aiRulesJson = aiRulesJson; }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    public List<Long> getExerciseIds() { return exerciseIds; }
    public void setExerciseIds(List<Long> exerciseIds) { this.exerciseIds = exerciseIds; }
    
    public List<ParticipantDTO> getParticipantsList() {
        return participantsList;
    }
    
    public void setParticipantsList(List<ParticipantDTO> participantsList) {
        this.participantsList = participantsList;
    }
    
    // Manual builder method for Lombok compatibility
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private Long id;
        private String title;
        private String imageUrl;
        private String description;
        private Integer participants;
        private String reward;
        private Integer durationDays;
        private Integer rewardPoints;
        private String aiRulesJson;
        private String status;
        private OffsetDateTime createdAt;
        private OffsetDateTime updatedAt;
        private List<Long> exerciseIds;
        private List<ParticipantDTO> participantsList;
        
        public Builder id(Long id) {
            this.id = id;
            return this;
        }
        
        public Builder title(String title) {
            this.title = title;
            return this;
        }

        public Builder imageUrl(String imageUrl) {
            this.imageUrl = imageUrl;
            return this;
        }

        public Builder description(String description) {
            this.description = description;
            return this;
        }
        
        public Builder participants(Integer participants) {
            this.participants = participants;
            return this;
        }
        
        public Builder reward(String reward) {
            this.reward = reward;
            return this;
        }

        public Builder durationDays(Integer durationDays) { this.durationDays = durationDays; return this; }
        public Builder rewardPoints(Integer rewardPoints) { this.rewardPoints = rewardPoints; return this; }
        public Builder aiRulesJson(String aiRulesJson) { this.aiRulesJson = aiRulesJson; return this; }
        
        public Builder status(String status) {
            this.status = status;
            return this;
        }
        
        public Builder createdAt(OffsetDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }
        
        public Builder updatedAt(OffsetDateTime updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }
        
        public Builder exerciseIds(List<Long> exerciseIds) { this.exerciseIds = exerciseIds; return this; }
        
        public Builder participantsList(List<ParticipantDTO> participantsList) {
            this.participantsList = participantsList;
            return this;
        }
        
        public ChallengeResponseDTO build() {
            ChallengeResponseDTO response = new ChallengeResponseDTO();
            response.id = this.id;
            response.title = this.title;
            response.imageUrl = this.imageUrl;
            response.description = this.description;
            response.participants = this.participants;
            response.reward = this.reward;
            response.durationDays = this.durationDays;
            response.rewardPoints = this.rewardPoints;
            response.aiRulesJson = this.aiRulesJson;
            response.status = this.status;
            response.createdAt = this.createdAt;
            response.updatedAt = this.updatedAt;
            response.exerciseIds = this.exerciseIds;
            response.participantsList = this.participantsList;
            return response;
        }
    }
}


