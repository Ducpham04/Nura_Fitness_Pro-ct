package com.example.fitchallenge.service;

import com.example.fitchallenge.config.NotificationResponse;

public interface DailyTrainingLogService {
    /**
     * Lấy tất cả daily training logs của user trong một training plan
     * Kết hợp với challenge information từ template
     */
    NotificationResponse getDailyTrainingLogsByUserAndPlan(Long userId, Long trainingPlanId);
    
    /**
     * Lấy daily training logs của user trong một training plan theo day number
     */
    NotificationResponse getDailyTrainingLogsByUserAndPlanAndDay(Long userId, Long trainingPlanId, Integer dayNumber);
    
    /**
     * Tạo hoặc cập nhật daily training log
     */
    NotificationResponse createOrUpdateDailyTrainingLog(
            Long userId,
            Long trainingPlanId,
            Integer dayNumber,
            Long challengeId,
            String status,
            Integer repsCompleted,
            Integer setsCompleted,
            Integer score,
            Double confidence,
            Integer actualDurationMinutes,
            Integer fatigueLevel,
            Double sleepHours);

    /**
     * Overload với caloriesBurnedOverride — dùng giá trị này thay vì tính lại.
     * FE gửi estimatedCalories từ plan để đảm bảo nhất quán.
     */
    default NotificationResponse createOrUpdateDailyTrainingLog(
            Long userId, Long trainingPlanId, Integer dayNumber, Long challengeId, String status,
            Integer repsCompleted, Integer setsCompleted, Integer score, Double confidence,
            Integer actualDurationMinutes, Integer fatigueLevel, Double sleepHours,
            Integer caloriesBurnedOverride) {
        return createOrUpdateDailyTrainingLog(userId, trainingPlanId, dayNumber, challengeId, status,
                repsCompleted, setsCompleted, score, confidence, actualDurationMinutes, fatigueLevel, sleepHours);
    }

    /**
     * Overload thêm perceivedDifficulty (RPE 1-10) — input cho auto-regulation.
     */
    default NotificationResponse createOrUpdateDailyTrainingLog(
            Long userId, Long trainingPlanId, Integer dayNumber, Long challengeId, String status,
            Integer repsCompleted, Integer setsCompleted, Integer score, Double confidence,
            Integer actualDurationMinutes, Integer fatigueLevel, Double sleepHours,
            Integer caloriesBurnedOverride, Integer perceivedDifficulty) {
        return createOrUpdateDailyTrainingLog(userId, trainingPlanId, dayNumber, challengeId, status,
                repsCompleted, setsCompleted, score, confidence, actualDurationMinutes, fatigueLevel, sleepHours,
                caloriesBurnedOverride);
    }
}
