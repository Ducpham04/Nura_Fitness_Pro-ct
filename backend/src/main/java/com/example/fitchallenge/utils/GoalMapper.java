package com.example.fitchallenge.utils;

import java.text.Normalizer;
import java.util.Map;

/**
 * GoalMapper — normalizes raw user goal strings to AI-compatible enum values.
 *
 * Problem: users (and FE) send strings like "build muscle", "tăng cơ", "Muscle Gain", etc.
 * Before this class existed, AIGatewayServiceImpl used ad-hoc .toLowerCase().contains() chains
 * scattered across multiple methods → mismatches silently fell through to "maintenance".
 *
 * This class is the single source of truth for all goal normalization.
 *
 * AI-accepted goal values (must match GoalType enum in ai-service/nutrition.py):
 *   "muscle_gain", "weight_loss", "endurance", "maintenance"
 */
public final class GoalMapper {

    private GoalMapper() {}

    /** MET values (Compendium of Physical Activities 2024) by session type */
    private static final Map<String, Double> SESSION_MET = Map.of(
        "full_body",   5.0,
        "upper_body",  4.5,
        "lower_body",  5.5,
        "cardio",      7.0,
        "hiit",        8.0,
        "rest_day",    1.0,
        "rest",        1.0,
        "stretch",     2.5,
        "mobility",    2.5
    );

    /** Default MET when session type is unknown */
    private static final double DEFAULT_MET = 5.0;

    // ─────────────────────────────────────────────
    // Goal Normalization
    // ─────────────────────────────────────────────

    /**
     * Convert any raw goal string to the AI-service canonical value.
     *
     * @param rawGoal  e.g. "build muscle", "GAIN_MUSCLE", "tăng cơ", "giảm cân", null
     * @return one of: "muscle_gain" | "weight_loss" | "endurance" | "maintenance"
     */
    public static String toAiGoal(String rawGoal) {
        if (rawGoal == null || rawGoal.isBlank()) {
            return "maintenance";
        }

        // Strip diacritics and normalize whitespace for Vietnamese input
        String normalized = stripDiacritics(rawGoal.trim().toLowerCase())
                .replaceAll("[_\\-]", " ")
                .replaceAll("\\s+", " ");

        // ── Strength (checked before muscle — more specific) ───
        if (containsAny(normalized,
                "strength", "suc manh", "nang ta", "powerlifting",
                "nang nang", "heavy")) {
            return "strength";
        }

        // ── Muscle / Hypertrophy ───────────────────────────
        if (containsAny(normalized,
                "muscle", "gain muscle", "tang co", "co bap",
                "hypertrophy", "bulk", "build",
                "muscle gain", "gain_muscle", "gainmuscle")) {
            return "muscle_gain";
        }

        // ── Weight Loss / Fat Loss ─────────────────────────
        if (containsAny(normalized,
                "weight loss", "lose weight", "fat loss", "cut",
                "giam can", "giam mo", "giam beo",
                "weight_loss", "weightloss", "fat")) {
            return "weight_loss";
        }

        // ── Endurance / Cardio ─────────────────────────────
        if (containsAny(normalized,
                "endurance", "cardio", "stamina", "suc ben",
                "marathon", "running")) {
            return "endurance";
        }

        // ── Maintenance / General ──────────────────────────
        if (containsAny(normalized,
                "maintain", "maintenance", "general", "fitness",
                "duy tri", "suc khoe")) {
            return "maintenance";
        }

        return "maintenance"; // safe fallback
    }

    // ─────────────────────────────────────────────
    // Calories Calculation  (MET formula)
    // ─────────────────────────────────────────────

    /**
     * Calculate estimated calories burned per workout session.
     *
     * Formula (WHO / Compendium of Physical Activities):
     *   Calories = MET × weightKg × durationMinutes / 60
     *
     * This replaces the hardcoded "300" that was previously used as a fallback.
     *
     * @param sessionType    AI session type string, e.g. "full_body", "cardio", "rest_day"
     * @param weightKg       user body weight in kg  (uses 70 kg if ≤ 0)
     * @param durationMinutes planned session duration
     * @return estimated kcal burned (0 for rest days)
     */
    public static int calcCaloriesPerSession(String sessionType, double weightKg, int durationMinutes) {
        if (durationMinutes <= 0) return 0;

        String type = sessionType == null ? "" : sessionType.toLowerCase().trim();

        // Rest days burn nothing meaningful from exercise
        if (type.equals("rest_day") || type.equals("rest")) return 0;

        double met = SESSION_MET.getOrDefault(type, DEFAULT_MET);
        double weight = weightKg > 0 ? weightKg : 70.0;

        return (int) Math.round(met * weight * durationMinutes / 60.0);
    }

    /**
     * Override calories on a map representing an AI workout session.
     * Mutates the map in-place so it can be used in AIGatewayServiceImpl
     * immediately after receiving the AI response.
     *
     * @param session      mutable map from AI JSON response
     * @param weightKg     user body weight
     * @param durationMin  planned session duration (minutes)
     */
    @SuppressWarnings("unchecked")
    public static void overrideSessionCalories(
            java.util.Map<String, Object> session,
            double weightKg,
            int durationMin) {

        String sessionType = session.getOrDefault("session_type", "full_body").toString();
        int calories = calcCaloriesPerSession(sessionType, weightKg, durationMin);
        session.put("estimated_calories_burned", calories);
    }

    // ─────────────────────────────────────────────
    // Validation
    // ─────────────────────────────────────────────

    /** Minimum exercise count rules per session type (must stay in sync with AI prompt) */
    private static final Map<String, Integer> MIN_EXERCISES = Map.of(
        "full_body",   4,
        "upper_body",  3,
        "lower_body",  3,
        "cardio",      2
    );

    /**
     * Validate that a workout session has the minimum required number of exercises.
     *
     * @param sessionType   e.g. "full_body"
     * @param exerciseCount number of exercises in the session
     * @return true if valid (or session type has no minimum rule, e.g. rest_day)
     */
    public static boolean isExerciseCountValid(String sessionType, int exerciseCount) {
        if (sessionType == null) return true;
        String type = sessionType.toLowerCase().trim();
        Integer min = MIN_EXERCISES.get(type);
        if (min == null) return true; // no rule → accept
        return exerciseCount >= min;
    }

    // ─────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────

    private static boolean containsAny(String text, String... keywords) {
        for (String kw : keywords) {
            if (text.contains(kw)) return true;
        }
        return false;
    }

    private static String stripDiacritics(String input) {
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD);
        return normalized.replaceAll("\\p{M}", "");
    }
}
