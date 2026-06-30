package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.ZonedDateTime;

@Entity
@Table(name = "user_feedback")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "user_email")
    private String userEmail;

    @Column(name = "user_name")
    private String userName;

    /** 1-5 */
    @Column(name = "rating")
    private Integer rating;

    /** bug | feature | general | ux */
    @Column(name = "feedback_type", length = 30)
    private String feedbackType;

    @Column(name = "message", length = 2000)
    private String message;

    /** Trang/màn hình user đang ở lúc gửi */
    @Column(name = "page", length = 100)
    private String page;

    @Column(name = "created_at", nullable = false)
    private ZonedDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = ZonedDateTime.now();
    }
}
