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
    private Integer progress; // tiến độ hiện tại (vd 3 challenge đã xong)
    private Integer target;   // mốc cần đạt (vd 10 challenge)
    private Boolean unlocked; // đã mở khoá chưa

    // Manual builder for Lombok compatibility
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String name;
        private String icon;
        private String color;
        private Integer progress;
        private Integer target;
        private Boolean unlocked;

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

        public Builder progress(Integer progress) {
            this.progress = progress;
            return this;
        }

        public Builder target(Integer target) {
            this.target = target;
            return this;
        }

        public Builder unlocked(Boolean unlocked) {
            this.unlocked = unlocked;
            return this;
        }

        public AchievementDTO build() {
            AchievementDTO dto = new AchievementDTO();
            dto.name = this.name;
            dto.icon = this.icon;
            dto.color = this.color;
            dto.progress = this.progress;
            dto.target = this.target;
            dto.unlocked = this.unlocked;
            return dto;
        }
    }
}
