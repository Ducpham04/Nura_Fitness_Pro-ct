package com.example.fitchallenge.DTO.user.userProfile;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// Thành tích
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AchievementDTO {
    private String name;
    private String icon;   // emoji hoặc icon code
    private String color;  // gradient tailwind class

    // Manual builder for Lombok compatibility
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String name;
        private String icon;
        private String color;

        public Builder name(String name) {
            this.name = name;
            return this;
        }

        public Builder icon(String icon) {
            this.icon = icon;
            return this;
        }

        public Builder color(String color) {
            this.color = color;
            return this;
        }

        public AchievementDTO build() {
            AchievementDTO dto = new AchievementDTO();
            dto.name = this.name;
            dto.icon = this.icon;
            dto.color = this.color;
            return dto;
        }
    }
}