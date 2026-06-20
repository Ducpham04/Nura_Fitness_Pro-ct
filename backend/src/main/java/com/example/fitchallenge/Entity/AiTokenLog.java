package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.ZonedDateTime;

/**
 * Một dòng = một lần gọi LLM (Groq) đo được token thật, gắn với user.
 * Backend ghi sau khi nhận response từ ai-service (đọc header X-AI-*-Tokens).
 */
@Entity
@Table(name = "ai_token_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiTokenLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    /** meal | meal_hybrid | workout | chat | pose ... */
    @Column(name = "call_type", length = 40)
    private String callType;

    @Column(name = "prompt_tokens", nullable = false)
    private Integer promptTokens = 0;

    @Column(name = "completion_tokens", nullable = false)
    private Integer completionTokens = 0;

    @Column(name = "total_tokens", nullable = false)
    private Integer totalTokens = 0;

    @Column(name = "created_at", nullable = false)
    private ZonedDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = ZonedDateTime.now();
        if (promptTokens == null) promptTokens = 0;
        if (completionTokens == null) completionTokens = 0;
        if (totalTokens == null) totalTokens = 0;
    }
}
