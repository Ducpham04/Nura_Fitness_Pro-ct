package com.example.fitchallenge.service;

import com.example.fitchallenge.DTO.UserChallengeDTO.UserChallengeDTO;
import com.example.fitchallenge.config.NotificationResponse;
import org.springframework.web.multipart.MultipartFile;

public interface UserChallengeService {
    NotificationResponse getAll();

    /** Lấy challenges của một user, lọc theo status nếu status != null */
    NotificationResponse getByUserId(Long userId, String status);
    NotificationResponse getById(Long id);
    NotificationResponse create(UserChallengeDTO dto);
    NotificationResponse update(Long id, UserChallengeDTO dto);
    NotificationResponse delete(Long id);

    /**
     * Đánh dấu challenge đã hoàn thành
     * Set status = "success" và completedAt = now()
     */
    NotificationResponse completeChallenge(Long id, Long userId);

    /**
     * Nộp bài thi thử thách: AI (Groq Vision) chấm điểm form qua ảnh,
     * so với ngưỡng trong aiRulesJson → set SUCCESS/FAILED + lưu điểm/ảnh/phân tích.
     */
    NotificationResponse submitChallengeAttempt(Long ucId, Long userId, MultipartFile image);

    /**
     * Ghi nhận kết quả buổi thi REALTIME (fitness-ai-service / MediaPipe):
     * FE chấm điểm live qua WebSocket rồi gửi kết quả cuối (reps + quality_score).
     * So ngưỡng aiRulesJson → set SUCCESS/FAILED + lưu điểm.
     */
    NotificationResponse submitChallengeResult(Long ucId, Long userId,
                                               Integer reps, Double qualityScore, String exerciseType);
}
