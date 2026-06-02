package com.example.fitchallenge.DTO.UserChallengeDTO;

import lombok.*;
import java.time.ZonedDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserChallengeDTO {
    private Long ucId;
    private Long userId;
    private Long challengeId;
    private String status;
    private String videoUrl;
    private String keypointsPayload;
    private Integer score;
    private Double confidence;
    private ZonedDateTime submittedAt;
    private ZonedDateTime completedAt;

    /** Số rep do AI đếm — dùng để ghi cột reps trên ai_model_events (query nhanh). */
    private Integer reps;
    private String modelName;
    private String modelVersion;
    /** JSON đầy đủ từ AI (lưu song song với các cột reps/score). */
    private String resultJson;
    


    // Manual builder method for Lombok compatibility
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long ucId;
        private Long userId;
        private Long challengeId;
        private String status;
        private String videoUrl;
        private String keypointsPayload;
        private Integer score;
        private Double confidence;
        private ZonedDateTime submittedAt;
        private ZonedDateTime completedAt;
        private Integer reps;
        private String modelName;
        private String modelVersion;
        private String resultJson;

        public Builder ucId(Long ucId) {
            this.ucId = ucId;
            return this;
        }

        public Builder userId(Long userId) {
            this.userId = userId;
            return this;
        }

        public Builder challengeId(Long challengeId) {
            this.challengeId = challengeId;
            return this;
        }

        public Builder status(String status) {
            this.status = status;
            return this;
        }

        public Builder videoUrl(String videoUrl) {
            this.videoUrl = videoUrl;
            return this;
        }

        public Builder keypointsPayload(String keypointsPayload) {
            this.keypointsPayload = keypointsPayload;
            return this;
        }

        public Builder score(Integer score) {
            this.score = score;
            return this;
        }

        public Builder confidence(Double confidence) {
            this.confidence = confidence;
            return this;
        }

        public Builder submittedAt(ZonedDateTime submittedAt) {
            this.submittedAt = submittedAt;
            return this;
        }

        public Builder completedAt(ZonedDateTime completedAt) {
            this.completedAt = completedAt;
            return this;
        }

        public Builder reps(Integer reps) {
            this.reps = reps;
            return this;
        }

        public Builder modelName(String modelName) {
            this.modelName = modelName;
            return this;
        }

        public Builder modelVersion(String modelVersion) {
            this.modelVersion = modelVersion;
            return this;
        }

        public Builder resultJson(String resultJson) {
            this.resultJson = resultJson;
            return this;
        }

        public UserChallengeDTO build() {
            UserChallengeDTO dto = new UserChallengeDTO();
            dto.ucId = this.ucId;
            dto.userId = this.userId;
            dto.challengeId = this.challengeId;
            dto.status = this.status;
            dto.videoUrl = this.videoUrl;
            dto.keypointsPayload = this.keypointsPayload;
            dto.score = this.score;
            dto.confidence = this.confidence;
            dto.submittedAt = this.submittedAt;
            dto.completedAt = this.completedAt;
            dto.reps = this.reps;
            dto.modelName = this.modelName;
            dto.modelVersion = this.modelVersion;
            dto.resultJson = this.resultJson;
            return dto;
        }
    }
}
