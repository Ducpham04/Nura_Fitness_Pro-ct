package com.example.fitchallenge.DTO.user.userProfile;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// Thông tin cơ bản của user
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserProfileDTO {
    private Long id;
    private String email;
    private String username;
    private String avatar;
    private String joinDate; // ISO string, ví dụ: 2025-12-03T00:00:00Z
    private Integer currentStreak; // số ngày liên tục

    // Manual builder for Lombok compatibility
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long id;
        private String email;
        private String username;
        private String avatar;
        private String joinDate;
        private Integer currentStreak;

        public Builder id(Long id) {
            this.id = id;
            return this;
        }

        public Builder email(String email) {
            this.email = email;
            return this;
        }

        public Builder username(String username) {
            this.username = username;
            return this;
        }

        public Builder avatar(String avatar) {
            this.avatar = avatar;
            return this;
        }

        public Builder joinDate(String joinDate) {
            this.joinDate = joinDate;
            return this;
        }

        public Builder currentStreak(Integer currentStreak) {
            this.currentStreak = currentStreak;
            return this;
        }

        public UserProfileDTO build() {
            UserProfileDTO dto = new UserProfileDTO();
            dto.id = this.id;
            dto.email = this.email;
            dto.username = this.username;
            dto.avatar = this.avatar;
            dto.joinDate = this.joinDate;
            dto.currentStreak = this.currentStreak;
            return dto;
        }
    }
}