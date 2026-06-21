package com.example.fitchallenge.service;

import com.example.fitchallenge.Entity.AiPackage;
import com.example.fitchallenge.Entity.User;
import com.example.fitchallenge.exception.QuotaExceededException;
import com.example.fitchallenge.repository.User.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * Kiểm tra và tính số lần ghi log mỗi ngày theo gói.
 * Counter tự reset sang ngày mới.
 */
@Service
@RequiredArgsConstructor
public class LogLimitService {

    private final UserRepository userRepository;

    public enum LogType { TRAINING, NUTRITION }

    /**
     * Kiểm tra còn lượt log không, nếu có thì tăng counter.
     * Ném QuotaExceededException nếu đã hết lượt trong ngày.
     */
    @Transactional
    public void ensureAndConsume(Long userId, LogType type) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        maybeResetLogCounter(user);

        AiPackage pkg = user.getAiPackage();
        int limit = (type == LogType.TRAINING)
                ? (pkg != null ? pkg.getMaxTrainingLogPerDay() : 3)
                : (pkg != null ? pkg.getMaxNutritionLogPerDay() : 3);

        int used = (type == LogType.TRAINING)
                ? (user.getTrainingLogToday() != null ? user.getTrainingLogToday() : 0)
                : (user.getNutritionLogToday() != null ? user.getNutritionLogToday() : 0);

        if (limit != -1 && used >= limit) {
            String typeLabel = (type == LogType.TRAINING) ? "ghi log tập luyện" : "ghi log dinh dưỡng";
            throw new QuotaExceededException(
                    "Bạn đã dùng hết " + limit + " lượt " + typeLabel + " hôm nay. " +
                    "Nâng cấp gói PLUS để ghi log không giới hạn.");
        }

        if (type == LogType.TRAINING) {
            user.setTrainingLogToday(used + 1);
        } else {
            user.setNutritionLogToday(used + 1);
        }
        userRepository.save(user);
    }

    // Reset counter nếu đã sang ngày mới
    private void maybeResetLogCounter(User user) {
        LocalDate today = LocalDate.now();
        if (user.getLogResetDate() == null || !user.getLogResetDate().equals(today)) {
            user.setTrainingLogToday(0);
            user.setNutritionLogToday(0);
            user.setLogResetDate(today);
        }
    }
}
