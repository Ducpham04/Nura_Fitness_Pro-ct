package com.example.fitchallenge.DTO.ChallengeDTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

/**
 * DTO cho participant trong challenge
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ParticipantDTO {
    private Long userId;
    private String userName;
    private OffsetDateTime joinedAt;
    private Integer progress; // Percentage 0-100
    private Boolean completed;
    
    // Manual getters/setters for Lombok compatibility
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
    
    public OffsetDateTime getJoinedAt() {
        return joinedAt;
    }
    
    public void setJoinedAt(OffsetDateTime joinedAt) {
        this.joinedAt = joinedAt;
    }
    
    public Integer getProgress() {
        return progress;
    }
    
    public void setProgress(Integer progress) {
        this.progress = progress;
    }
    
    public Boolean getCompleted() {
        return completed;
    }
    
    public void setCompleted(Boolean completed) {
        this.completed = completed;
    }
    
    // Manual builder method for Lombok compatibility
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private Long userId;
        private String userName;
        private OffsetDateTime joinedAt;
        private Integer progress;
        private Boolean completed;
        
        public Builder userId(Long userId) {
            this.userId = userId;
            return this;
        }
        
        public Builder userName(String userName) {
            this.userName = userName;
            return this;
        }
        
        public Builder joinedAt(OffsetDateTime joinedAt) {
            this.joinedAt = joinedAt;
            return this;
        }
        
        public Builder progress(Integer progress) {
            this.progress = progress;
            return this;
        }
        
        public Builder completed(Boolean completed) {
            this.completed = completed;
            return this;
        }
        
        public ParticipantDTO build() {
            ParticipantDTO participant = new ParticipantDTO();
            participant.userId = this.userId;
            participant.userName = this.userName;
            participant.joinedAt = this.joinedAt;
            participant.progress = this.progress;
            participant.completed = this.completed;
            return participant;
        }
    }
}



