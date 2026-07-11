package com.example.fitchallenge.utils;

import com.example.fitchallenge.Entity.Exercise;

import java.util.regex.Pattern;

/**
 * Phân loại bài tập theo cách đo lường: đếm rep (mặc định) hay đếm THỜI GIAN (giây).
 *
 * Quy ước dữ liệu (đã có sẵn trong seed V2): bài isometric có tempo = "0-0-0"
 * và default_reps mang nghĩa SỐ GIÂY giữ tư thế (vd Side Plank: default_reps=30 → 30 giây).
 * Util này là nơi duy nhất mã hoá quy ước đó — mọi tầng (prescription, weekly gen,
 * response DTO) đều hỏi qua đây thay vì tự đoán.
 */
public final class ExerciseFormatUtil {

    private ExerciseFormatUtil() {}

    /** Tempo "0-0-0" là marker isometric tường minh trong master data. */
    private static final String ISOMETRIC_TEMPO = "0-0-0";

    /**
     * Từ khoá tên bài giữ tư thế (word-boundary để "hanging leg raise" không dính "hang").
     */
    private static final Pattern TIME_BASED_NAME = Pattern.compile(
            "\\b(plank|wall sit|hold|l-sit|isometric|dead hang|superman)\\b",
            Pattern.CASE_INSENSITIVE);

    /**
     * Biến thể ĐỘNG của plank — vẫn đếm rep dù tên chứa "plank"
     * (plank jack, plank shoulder tap, plank up-down, plank row...).
     */
    private static final Pattern DYNAMIC_VARIANT = Pattern.compile(
            "\\b(tap|jack|up-down|up down|walk|twist|rotation|reach|row|knee|crunch|to push)\\b",
            Pattern.CASE_INSENSITIVE);

    /** Bài này đo bằng thời gian (reps = số giây giữ) thay vì đếm rep? */
    public static boolean isTimeBased(Exercise exercise) {
        if (exercise == null) return false;
        return isTimeBased(exercise.getExerciseName(), exercise.getExerciseNameVi(), exercise.getTempo());
    }

    public static boolean isTimeBased(String name, String nameVi, String tempo) {
        // Marker tường minh từ master data thắng mọi heuristic
        if (ISOMETRIC_TEMPO.equals(tempo)) return true;

        String haystack = ((name == null ? "" : name) + " " + (nameVi == null ? "" : nameVi)).trim();
        if (haystack.isEmpty()) return false;

        if (!TIME_BASED_NAME.matcher(haystack).find()) return false;
        // Tên khớp keyword tĩnh nhưng là biến thể động → vẫn là bài đếm rep
        return !DYNAMIC_VARIANT.matcher(haystack).find();
    }
}
