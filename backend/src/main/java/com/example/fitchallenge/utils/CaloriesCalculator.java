package com.example.fitchallenge.utils;

import java.math.BigDecimal;

/**
 * Utility class để tính toán calories đốt cháy dựa trên bài tập
 * Sử dụng MET (Metabolic Equivalent of Task) values
 */
public class CaloriesCalculator {

    /**
     * Tính calories đốt cháy dựa trên:
     * - Loại bài tập (exercise type)
     * - Tên bài tập (exercise name) — dùng làm fallback MET lookup
     * - Thời gian tập (minutes) — bao gồm cả rest periods
     * - Trọng lượng cơ thể (weight in kg) - optional
     *
     * Formula: Calories = MET × weight(kg) × time(hours)
     * Standard: MET × 3.5 × weight(kg) × time(minutes) / 200
     * Source: Compendium of Physical Activities 2024 / ACSM
     */
    public static Integer calculateCalories(
            String exerciseType,
            Integer durationMinutes,
            Integer sets,
            Integer reps,
            BigDecimal weightKg
    ) {
        return calculateCalories(exerciseType, null, durationMinutes, weightKg);
    }

    /**
     * Tính calories với exercise name để lookup MET chính xác hơn.
     * Dùng method này khi có tên bài tập cụ thể (ví dụ: "Chin Up", "Dead Bug").
     */
    public static Integer calculateCalories(
            String exerciseType,
            String exerciseName,
            Integer durationMinutes,
            BigDecimal weightKg
    ) {
        if (durationMinutes == null || durationMinutes <= 0) {
            return 0;
        }

        double weight = weightKg != null && weightKg.compareTo(BigDecimal.ZERO) > 0
                ? weightKg.doubleValue()
                : 70.0;

        double met = getMETValue(exerciseType, exerciseName);
        double calories = met * 3.5 * weight * durationMinutes / 200.0;

        return (int) Math.round(calories);
    }

    /**
     * Tính calories đơn giản hơn chỉ dựa trên exercise type và duration
     */
    public static Integer calculateCaloriesSimple(String exerciseType, Integer durationMinutes, BigDecimal weightKg) {
        return calculateCalories(exerciseType, null, durationMinutes, weightKg);
    }

    /**
     * Ước tính duration thực tế của một exercise dựa trên sets, reps, rest time.
     *
     * Công thức: mỗi set = (reps × 2s per rep) + restSeconds
     * 2 giây/rep là trung bình cho hầu hết bài tập strength (tempo 3-0-1 hoặc 2-0-2).
     * Không tính rest sau set cuối.
     *
     * Ví dụ: 3×15 rest 45s
     *   active = 3 × 15 × 2 = 90s
     *   rest   = 2 × 45s    = 90s  (chỉ 2 khoảng nghỉ, không tính sau set cuối)
     *   total  = 180s = 3 phút
     */
    public static int estimateDurationMinutes(int sets, int reps, int restSeconds) {
        int activeSeconds = sets * reps * 2;
        int restTotal = Math.max(0, sets - 1) * restSeconds;
        int totalSeconds = activeSeconds + restTotal;
        return Math.max(1, (int) Math.round(totalSeconds / 60.0));
    }

    /**
     * Get MET (Metabolic Equivalent of Task) value.
     * Priority: exercise name → exercise type → default.
     * MET values from Compendium of Physical Activities 2024.
     *
     * DB stores exercise_type as uppercase with underscores (e.g. STRENGTH, CORE, CARDIO)
     * or as specific names. Exercise name is the human-readable label (e.g. "Chin Up").
     */
    static double getMETValue(String exerciseType, String exerciseName) {
        String name = exerciseName != null
                ? exerciseName.toLowerCase().trim().replace('_', ' ').replace('-', ' ')
                : "";
        String type = exerciseType != null
                ? exerciseType.toLowerCase().trim().replace('_', ' ').replace('-', ' ')
                : "";

        // ── Lookup by exercise name first (more specific) ─────────────────────
        // Explosive / high-intensity
        if (name.contains("burpee") || type.contains("burpee"))                      return 10.0;
        if (name.contains("jump") || name.contains("jumping")
                || type.contains("jump"))                                             return 8.0;
        if (name.contains("mountain climber"))                                        return 8.0;
        if (name.contains("battle rope"))                                             return 9.0;
        if (name.contains("box jump"))                                                return 8.5;

        // Pull (upper body)
        if (name.contains("chin up") || name.contains("chinup"))                      return 8.0;
        if (name.contains("pull up") || name.contains("pullup"))                      return 8.0;
        if (name.contains("lat pull") || name.contains("lat pulldown"))               return 6.0;
        if (name.contains("row") || type.contains("row"))                             return 6.0;

        // Push (upper body)
        if (name.contains("push up") || name.contains("pushup")
                || type.contains("push up"))                                          return 8.0;
        if (name.contains("bench press") || name.contains("chest press"))             return 6.0;
        if (name.contains("shoulder press") || name.contains("overhead press"))       return 5.5;
        if (name.contains("dip"))                                                     return 6.0;
        if (name.contains("press") || type.contains("press"))                         return 5.5;

        // Lower body
        if (name.contains("squat") || type.contains("squat"))                         return 5.5;
        if (name.contains("deadlift") || type.contains("deadlift"))                   return 6.0;
        if (name.contains("lunge") || type.contains("lunge"))                         return 5.0;
        if (name.contains("hip thrust") || name.contains("glute bridge")
                || type.contains("hip thrust"))                                       return 4.5;
        if (name.contains("leg press"))                                               return 5.0;
        if (name.contains("leg curl") || name.contains("leg extension"))              return 3.5;
        if (name.contains("calf raise") || type.contains("calf"))                     return 3.5;
        if (name.contains("step up") || name.contains("step-up"))                    return 5.0;
        if (name.contains("rdl") || name.contains("romanian"))                        return 5.5;

        // Core / Isometric
        if (name.contains("plank") || type.contains("plank"))                         return 3.5;
        if (name.contains("dead bug"))                                                return 3.0;
        if (name.contains("bird dog"))                                                return 3.0;
        if (name.contains("superman"))                                                return 3.0;  // back extension
        if (name.contains("side plank"))                                              return 3.5;
        if (name.contains("hollow body") || name.contains("hollow hold"))             return 3.5;
        if (name.contains("crunch") || name.contains("sit up")
                || type.contains("crunch"))                                           return 3.5;
        if (name.contains("leg raise") || name.contains("hanging"))                   return 4.0;
        if (name.contains("russian twist"))                                           return 4.0;
        if (name.contains("ab") || name.contains("core")
                || type.contains("core"))                                             return 3.5;

        // Isolation: arms / shoulders
        if (name.contains("bicep curl") || name.contains("hammer curl")
                || (name.contains("curl") && !name.contains("wrist")))               return 3.0;
        if (name.contains("tricep") || name.contains("skull crusher"))               return 3.0;
        if (name.contains("lateral raise") || name.contains("front raise"))           return 3.0;
        if (name.contains("face pull") || name.contains("rear delt"))                return 3.0;
        if (name.contains("bicep") || name.contains("tricep")
                || type.contains("bicep") || type.contains("tricep"))                return 3.0;
        if (name.contains("shoulder") || name.contains("lateral")
                || type.contains("shoulder"))                                         return 3.5;

        // Back isolation
        if (name.contains("back extension") || name.contains("hyperextension"))      return 3.5;
        if (name.contains("good morning"))                                            return 4.0;

        // Cardio
        if (name.contains("run") || name.contains("sprint") || type.contains("run")) return 8.0;
        if (name.contains("walk") || type.contains("walk"))                           return 3.5;
        if (name.contains("cycling") || name.contains("bike")
                || type.contains("cycling"))                                          return 6.0;
        if (name.contains("swimming") || type.contains("swimming"))                   return 7.0;
        if (name.contains("hiit") || name.contains("circuit")
                || type.contains("hiit"))                                             return 8.5;
        if (name.contains("jump rope") || name.contains("skipping"))                  return 10.0;

        // Mobility / Flexibility / Stretching
        if (name.contains("stretch") || name.contains("mobility")
                || name.contains("foam roll") || name.contains("yoga")
                || type.contains("stretch") || type.contains("mobility")
                || type.contains("flexibility"))                                       return 2.5;

        // ── Fallback by exercise_type category ────────────────────────────────
        if (type.contains("cardio"))           return 7.0;
        if (type.contains("strength"))         return 5.0;
        if (type.contains("full body") || type.contains("fullbody")) return 5.5;
        if (type.contains("upper"))            return 5.0;
        if (type.contains("lower"))            return 5.0;

        // Default: moderate resistance training
        return 5.0;
    }

    /**
     * Tính calories từ DailyTrainingLog với actual data sau khi hoàn thành bài tập.
     */
    public static Integer calculateCaloriesFromLog(
            Integer actualDurationMinutes,
            Integer setsCompleted,
            Integer repsCompleted,
            String exerciseType,
            BigDecimal userWeightKg
    ) {
        if (actualDurationMinutes != null && actualDurationMinutes > 0) {
            return calculateCalories(exerciseType, null, actualDurationMinutes, userWeightKg);
        }

        if (setsCompleted != null && setsCompleted > 0 && repsCompleted != null && repsCompleted > 0) {
            // Estimate 45s rest (default) when actual rest data unavailable
            int estimatedMinutes = estimateDurationMinutes(setsCompleted, repsCompleted, 45);
            return calculateCalories(exerciseType, null, estimatedMinutes, userWeightKg);
        }

        return 0;
    }
}
