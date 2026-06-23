package com.example.fitchallenge.service;

import com.example.fitchallenge.Entity.AiPackage;
import com.example.fitchallenge.Entity.User;
import com.example.fitchallenge.exception.QuotaExceededException;
import com.example.fitchallenge.repository.User.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;

/**
 * Kiểm tra và tính lượt đổi bài tập / đổi món theo gói.
 * Reset tự động khi qua chu kỳ tháng (giống ai_used).
 */
@Service
@RequiredArgsConstructor
public class SwapLimitService {

    private final UserRepository userRepository;

    public enum SwapType { EXERCISE, MEAL }

    /**
     * Kiểm tra còn lượt đổi không, nếu có thì tăng counter.
     * Ném QuotaExceededException nếu đã hết lượt.
     */
    @Transactional
    public void ensureAndConsume(Long userId, SwapType type) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        maybeResetSwapCounter(user);

        AiPackage pkg = user.getAiPackage();
        int limit = (type == SwapType.EXERCISE)
                ? (pkg != null ? pkg.getMaxExerciseSwapPerMonth() : 5)
                : (pkg != null ? pkg.getMaxMealSwapPerMonth() : 5);

        int used = (type == SwapType.EXERCISE)
                ? (user.getExerciseSwapUsed() != null ? user.getExerciseSwapUsed() : 0)
                : (user.getMealSwapUsed() != null ? user.getMealSwapUsed() : 0);

        if (limit != -1 && used >= limit) {
            String typeLabel = (type == SwapType.EXERCISE) ? "đổi bài tập" : "đổi món ăn";
            throw new QuotaExceededException(
                    "Bạn đã dùng hết " + limit + " lượt " + typeLabel + " tháng này. " +
                    "Nâng cấp gói để có thêm lượt.");
        }

        if (type == SwapType.EXERCISE) {
            user.setExerciseSwapUsed(used + 1);
        } else {
            user.setMealSwapUsed(used + 1);
        }
        userRepository.save(user);
    }

    /** Trả thông tin lượt swap còn lại của user (dùng cho API info). */
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> getSwapInfo(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        AiPackage pkg = user.getAiPackage();

        int exLimit  = pkg != null ? pkg.getMaxExerciseSwapPerMonth() : 5;
        int mealLimit = pkg != null ? pkg.getMaxMealSwapPerMonth() : 5;
        int exUsed   = user.getExerciseSwapUsed() != null ? user.getExerciseSwapUsed() : 0;
        int mealUsed = user.getMealSwapUsed() != null ? user.getMealSwapUsed() : 0;

        java.util.Map<String, Object> swapInfo = new java.util.LinkedHashMap<>();
        swapInfo.put("exerciseSwapUsed", exUsed);
        swapInfo.put("exerciseSwapLimit", exLimit);
        swapInfo.put("exerciseSwapRemaining", exLimit == -1 ? -1 : Math.max(0, exLimit - exUsed));
        swapInfo.put("mealSwapUsed", mealUsed);
        swapInfo.put("mealSwapLimit", mealLimit);
        swapInfo.put("mealSwapRemaining", mealLimit == -1 ? -1 : Math.max(0, mealLimit - mealUsed));
        swapInfo.put("resetAt", user.getSwapResetAt() != null
                ? user.getSwapResetAt().format(java.time.format.DateTimeFormatter.ISO_OFFSET_DATE_TIME) : null);
        return swapInfo;
    }

    // Reset counter nếu đã qua chu kỳ tháng (dựa theo swap_reset_at)
    private void maybeResetSwapCounter(User user) {
        ZonedDateTime now = ZonedDateTime.now();
        if (user.getSwapResetAt() == null || now.isAfter(user.getSwapResetAt())) {
            user.setExerciseSwapUsed(0);
            user.setMealSwapUsed(0);
            user.setSwapResetAt(now.plusDays(30));
        }
    }
}
