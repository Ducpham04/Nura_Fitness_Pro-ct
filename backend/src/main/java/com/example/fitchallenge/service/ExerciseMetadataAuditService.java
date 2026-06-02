package com.example.fitchallenge.service;

import com.example.fitchallenge.Entity.Exercise;
import com.example.fitchallenge.repository.ExerciseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ExerciseMetadataAuditService {

    private static final Set<String> FORCE_TYPES = Set.of("PUSH", "PULL", "LEGS", "CORE", "CARDIO", "MOBILITY");
    private static final Set<String> EXERCISE_CATEGORIES = Set.of("COMPOUND", "ISOLATION", "MOBILITY");
    private static final Pattern TEMPO_PATTERN = Pattern.compile("^\\d+-\\d+-\\d+$");
    private static final int MIN_UPPER_PUSH_POOL = 3;
    private static final int MIN_UPPER_PULL_POOL = 3;
    private static final int MIN_LOWER_POOL = 3;
    private static final int MIN_CORE_POOL = 2;
    private static final int MIN_CARDIO_POOL = 1;

    private final ExerciseRepository exerciseRepository;

    @Transactional(readOnly = true)
    public ExerciseMetadataAuditReport audit() {
        List<Exercise> exercises = exerciseRepository.findAll();
        List<ExerciseMetadataIssue> issues = new ArrayList<>();
        Map<String, Integer> severityCounts = orderedCounter("HIGH", "MEDIUM", "LOW");
        Map<String, Integer> missingFieldCounts = new LinkedHashMap<>();
        Map<String, Integer> invalidFieldCounts = new LinkedHashMap<>();
        Map<String, Integer> warningCounts = new LinkedHashMap<>();
        Map<String, Integer> forceTypeCoverage = new LinkedHashMap<>();
        Map<String, Integer> equipmentCoverage = new LinkedHashMap<>();
        Map<String, Integer> primaryMuscleCoverage = new LinkedHashMap<>();

        int activeExercises = 0;
        int validExercises = 0;
        int totalScore = 0;
        Map<String, Integer> generationReadiness = orderedCounter("push", "pull", "legs", "core", "cardio", "mobility");

        for (Exercise exercise : exercises) {
            boolean active = isActive(exercise);
            if (active) {
                activeExercises++;
            }

            ExerciseAuditResult result = auditExercise(exercise);
            totalScore += result.qualityScore();

            if (result.hasIssues()) {
                issues.add(result.issue());
                severityCounts.merge(result.issue().severity(), 1, Integer::sum);
                result.issue().missingFields().forEach(field -> missingFieldCounts.merge(field, 1, Integer::sum));
                result.issue().invalidFields().forEach(field -> invalidFieldCounts.merge(field, 1, Integer::sum));
                result.issue().warnings().forEach(field -> warningCounts.merge(field, 1, Integer::sum));
            }

            String forceType = normalizeUpper(exercise.getForceType(), "UNKNOWN");
            if (active) {
                addCoverage(forceTypeCoverage, forceType);
                addCoverage(equipmentCoverage, normalizeUpper(exercise.getRequiredEquipment(), "UNKNOWN"));
                addCoverage(primaryMuscleCoverage, normalizeUpper(exercise.getPrimaryMuscle(), "UNKNOWN"));
            }

            if (active && result.productionReady()) {
                switch (forceType) {
                    case "PUSH" -> generationReadiness.merge("push", 1, Integer::sum);
                    case "PULL" -> generationReadiness.merge("pull", 1, Integer::sum);
                    case "LEGS" -> generationReadiness.merge("legs", 1, Integer::sum);
                    case "CORE" -> generationReadiness.merge("core", 1, Integer::sum);
                    case "CARDIO" -> generationReadiness.merge("cardio", 1, Integer::sum);
                    case "MOBILITY" -> generationReadiness.merge("mobility", 1, Integer::sum);
                    default -> {
                    }
                }
                validExercises++;
            }
        }

        int averageQualityScore = exercises.isEmpty() ? 0 : Math.round((float) totalScore / exercises.size());
        SessionReadiness sessionReadiness = buildSessionReadiness(generationReadiness);

        List<String> recommendations = buildRecommendations(
                exercises.size(),
                activeExercises,
                validExercises,
                missingFieldCounts,
                invalidFieldCounts,
                warningCounts,
                sessionReadiness
        );

        return new ExerciseMetadataAuditReport(
                exercises.size(),
                activeExercises,
                validExercises,
                Math.max(0, activeExercises - validExercises),
                averageQualityScore,
                sessionReadiness.generationReady(),
                generationReadiness,
                forceTypeCoverage,
                equipmentCoverage,
                primaryMuscleCoverage,
                severityCounts,
                missingFieldCounts,
                invalidFieldCounts,
                warningCounts,
                sessionReadiness,
                recommendations,
                issues
        );
    }

    private ExerciseAuditResult auditExercise(Exercise exercise) {
        Set<String> missing = new LinkedHashSet<>();
        Set<String> invalid = new LinkedHashSet<>();
        List<String> warnings = new ArrayList<>();

        requireText(exercise.getExerciseName(), "exerciseName", missing);
        requireText(exercise.getExerciseType(), "exerciseType", missing);
        requireText(exercise.getMovementPattern(), "movementPattern", missing);
        requireText(exercise.getPrimaryMuscle(), "primaryMuscle", missing);
        requireText(exercise.getRequiredEquipment(), "requiredEquipment", missing);
        requireText(exercise.getForceType(), "forceType", missing);
        requireText(exercise.getExerciseCategory(), "exerciseCategory", missing);

        requirePositive(exercise.getDefaultSets(), "defaultSets", missing, invalid);
        requirePositive(exercise.getDefaultReps(), "defaultReps", missing, invalid);
        requirePositive(exercise.getDefaultRestSeconds(), "defaultRestSeconds", missing, invalid);

        boolean hasMet = exercise.getMetValue() != null && exercise.getMetValue().compareTo(BigDecimal.ZERO) > 0;
        boolean hasEstimatedMet = exercise.getEstimatedMet() != null && exercise.getEstimatedMet() > 0;
        if (!hasMet && !hasEstimatedMet) {
            missing.add("metValue");
        }

        requireExplicitFlag(exercise.getSpinalLoading(), "spinalLoading", missing);
        requireExplicitFlag(exercise.getKneeDominant(), "kneeDominant", missing);
        requireExplicitFlag(exercise.getShoulderOverhead(), "shoulderOverhead", missing);
        requireExplicitFlag(exercise.getHighImpact(), "highImpact", missing);
        requireExplicitFlag(exercise.getWristLoading(), "wristLoading", missing);

        String forceType = normalizeUpper(exercise.getForceType(), "");
        if (!forceType.isBlank() && !FORCE_TYPES.contains(forceType)) {
            invalid.add("forceType");
        }

        String category = normalizeUpper(exercise.getExerciseCategory(), "");
        if (!category.isBlank() && !EXERCISE_CATEGORIES.contains(category)) {
            invalid.add("exerciseCategory");
        }

        if (!forceType.isBlank() && !isForceTypeCoherent(forceType, exercise.getPrimaryMuscle(), exercise.getMovementPattern())) {
            invalid.add("forceType.primaryMuscleMismatch");
        }

        if (isBlank(exercise.getDescription())) warnings.add("description");
        if (isBlank(exercise.getExerciseNameVi())) warnings.add("exerciseNameVi");
        if (isBlank(exercise.getSecondaryMuscles())) warnings.add("secondaryMuscles");
        if (isBlank(exercise.getVideoUrl())) warnings.add("videoUrl");
        if (isBlank(exercise.getImageUrl())) warnings.add("imageUrl");
        if (isBlank(exercise.getTempo())) {
            warnings.add("tempo");
        } else if (!"N/A".equalsIgnoreCase(exercise.getTempo()) && !TEMPO_PATTERN.matcher(exercise.getTempo().trim()).matches()) {
            invalid.add("tempo");
        }

        if (exercise.getSuitableForSenior() == null) warnings.add("suitableForSenior");
        if (exercise.getSuitableForOverweight() == null) warnings.add("suitableForOverweight");
        if (exercise.getIsBilateral() == null) warnings.add("isBilateral");

        validateRpe(exercise, invalid, warnings);

        boolean hasHigh = !missing.isEmpty() || !invalid.isEmpty();
        int qualityScore = score(missing.size(), invalid.size(), warnings.size());
        String severity = resolveSeverity(hasHigh, warnings.size(), qualityScore);
        boolean productionReady = !hasHigh;

        if (!hasHigh && warnings.isEmpty()) {
            return new ExerciseAuditResult(null, qualityScore, true);
        }

        String impact = hasHigh
                ? "Blocks production AI selection until fixed because safety, grouping, or calorie logic may be wrong."
                : "Usable for generation, but coaching quality, media guidance, or adaptive tuning is weaker.";

        return new ExerciseAuditResult(
                new ExerciseMetadataIssue(
                        exercise.getId(),
                        exercise.getExerciseName(),
                        exercise.getStatus(),
                        severity,
                        qualityScore,
                        new ArrayList<>(missing),
                        new ArrayList<>(invalid),
                        warnings,
                        impact
                ),
                qualityScore,
                productionReady
        );
    }

    private void validateRpe(Exercise exercise, Set<String> invalid, List<String> warnings) {
        Short min = exercise.getRpeMin();
        Short max = exercise.getRpeMax();
        if (min == null && max == null) {
            warnings.add("rpeRange");
            return;
        }
        if (min == null || max == null) {
            invalid.add("rpeRange");
            return;
        }
        if (min < 1 || max > 10 || min > max) {
            invalid.add("rpeRange");
        }
    }

    private List<String> buildRecommendations(
            int totalExercises,
            int activeExercises,
            int validExercises,
            Map<String, Integer> missingFieldCounts,
            Map<String, Integer> invalidFieldCounts,
            Map<String, Integer> warningCounts,
            SessionReadiness sessionReadiness) {

        List<String> recommendations = new ArrayList<>();
        if (totalExercises == 0) {
            recommendations.add("Exercise catalog is empty. Seed exercises before enabling AI workout generation.");
            return recommendations;
        }

        if (activeExercises == 0) {
            recommendations.add("No active exercises are available. Activate safe exercises before enabling workout generation.");
            return recommendations;
        }

        if (validExercises < activeExercises) {
            recommendations.add("Fix HIGH severity metadata on active exercises before enabling broad AI workout generation.");
        }

        for (String field : List.of("forceType", "primaryMuscle", "metValue", "exerciseCategory", "movementPattern")) {
            if (missingFieldCounts.getOrDefault(field, 0) > 0 || invalidFieldCounts.getOrDefault(field, 0) > 0) {
                recommendations.add("Prioritize field '" + field + "' because it directly affects AI workout safety and selection.");
            }
        }

        if (!sessionReadiness.upperPushReady()) {
            recommendations.add("Add/fix " + Math.max(0, MIN_UPPER_PUSH_POOL - sessionReadiness.push())
                    + " production-ready PUSH exercises for upper_push sessions.");
        }
        if (!sessionReadiness.upperPullReady()) {
            recommendations.add("Add/fix " + Math.max(0, MIN_UPPER_PULL_POOL - sessionReadiness.pull())
                    + " production-ready PULL exercises for upper_pull sessions.");
        }
        if (!sessionReadiness.lowerReady()) {
            recommendations.add("Add/fix " + Math.max(0, MIN_LOWER_POOL - sessionReadiness.legs())
                    + " production-ready LEGS exercises for lower sessions.");
        }
        if (!sessionReadiness.cardioCoreReady()) {
            recommendations.add("Ensure at least " + MIN_CARDIO_POOL + " CARDIO and " + MIN_CORE_POOL
                    + " CORE production-ready exercises for cardio_core sessions.");
        }

        for (String field : List.of("videoUrl", "imageUrl", "tempo", "rpeRange")) {
            if (warningCounts.getOrDefault(field, 0) > 0) {
                recommendations.add("Enrich '" + field + "' metadata to improve FE guidance and adaptive AI tuning.");
            }
        }

        if (recommendations.isEmpty()) {
            recommendations.add("Exercise catalog is ready for AI ProgramTemplate generation.");
        }

        return recommendations;
    }

    private void requireText(String value, String field, Set<String> missing) {
        if (isBlank(value)) {
            missing.add(field);
        }
    }

    private void requirePositive(Integer value, String field, Set<String> missing, Set<String> invalid) {
        if (value == null) {
            missing.add(field);
        } else if (value <= 0) {
            invalid.add(field);
        }
    }

    private void requireExplicitFlag(Boolean value, String field, Set<String> missing) {
        if (value == null) {
            missing.add(field);
        }
    }

    private int score(int missingCount, int invalidCount, int warningCount) {
        return Math.max(0, 100 - (missingCount * 18) - (invalidCount * 18) - (warningCount * 4));
    }

    private String resolveSeverity(boolean hasHigh, int warningCount, int qualityScore) {
        if (hasHigh) return "HIGH";
        if (warningCount >= 3 || qualityScore < 90) return "MEDIUM";
        if (warningCount > 0) return "LOW";
        return "NONE";
    }

    private boolean isForceTypeCoherent(String forceType, String primaryMuscle, String movementPattern) {
        String haystack = (normalize(primaryMuscle) + " " + normalize(movementPattern)).trim();
        if (haystack.isBlank()) return false;

        return switch (forceType) {
            case "PUSH" -> containsAny(haystack, "chest", "pec", "shoulder", "delt", "tricep", "push", "press");
            case "PULL" -> containsAny(haystack, "back", "lat", "trap", "rhomboid", "bicep", "brachial", "rear delt", "pull", "row");
            case "LEGS" -> containsAny(haystack, "glute", "quad", "hamstring", "calf", "calves", "leg", "thigh", "hip", "squat", "hinge", "lunge");
            case "CORE" -> containsAny(haystack, "core", "ab", "abdominal", "oblique", "trunk", "plank");
            case "CARDIO" -> containsAny(haystack, "cardio", "conditioning", "aerobic", "full body", "jump", "run", "burpee", "mountain climber");
            case "MOBILITY" -> containsAny(haystack, "mobility", "stretch", "spine", "hip flexor", "thoracic", "shoulder", "neck");
            default -> true;
        };
    }

    private SessionReadiness buildSessionReadiness(Map<String, Integer> readiness) {
        int push = readiness.getOrDefault("push", 0);
        int pull = readiness.getOrDefault("pull", 0);
        int legs = readiness.getOrDefault("legs", 0);
        int core = readiness.getOrDefault("core", 0);
        int cardio = readiness.getOrDefault("cardio", 0);
        int mobility = readiness.getOrDefault("mobility", 0);

        boolean fullBodyReady = push >= 1 && pull >= 1 && legs >= 1 && core >= 1;
        boolean upperPushReady = push >= MIN_UPPER_PUSH_POOL;
        boolean upperPullReady = pull >= MIN_UPPER_PULL_POOL;
        boolean lowerReady = legs >= MIN_LOWER_POOL;
        boolean cardioCoreReady = cardio >= MIN_CARDIO_POOL && core >= MIN_CORE_POOL;
        boolean generationReady = fullBodyReady && upperPushReady && upperPullReady && lowerReady && cardioCoreReady;

        return new SessionReadiness(
                push,
                pull,
                legs,
                core,
                cardio,
                mobility,
                MIN_UPPER_PUSH_POOL,
                MIN_UPPER_PULL_POOL,
                MIN_LOWER_POOL,
                MIN_CORE_POOL,
                MIN_CARDIO_POOL,
                fullBodyReady,
                upperPushReady,
                upperPullReady,
                lowerReady,
                cardioCoreReady,
                generationReady
        );
    }

    private Map<String, Integer> orderedCounter(String... keys) {
        Map<String, Integer> counter = new LinkedHashMap<>();
        for (String key : keys) {
            counter.put(key, 0);
        }
        return counter;
    }

    private void addCoverage(Map<String, Integer> coverage, String value) {
        coverage.merge(value, 1, Integer::sum);
    }

    private boolean isActive(Exercise exercise) {
        return exercise.getStatus() == null || "ACTIVE".equalsIgnoreCase(exercise.getStatus());
    }

    private boolean containsAny(String value, String... keys) {
        for (String key : keys) {
            if (value.contains(key)) return true;
        }
        return false;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeUpper(String value, String fallback) {
        return isBlank(value) ? fallback : value.trim().toUpperCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private record ExerciseAuditResult(
            ExerciseMetadataIssue issue,
            int qualityScore,
            boolean productionReady) {
        private boolean hasIssues() {
            return issue != null;
        }
    }

    public record ExerciseMetadataAuditReport(
            int totalExercises,
            int activeExercises,
            int validExercises,
            int invalidExercises,
            int qualityScore,
            boolean generationReady,
            Map<String, Integer> generationReadiness,
            Map<String, Integer> forceTypeCoverage,
            Map<String, Integer> equipmentCoverage,
            Map<String, Integer> primaryMuscleCoverage,
            Map<String, Integer> severityCounts,
            Map<String, Integer> missingFieldCounts,
            Map<String, Integer> invalidFieldCounts,
            Map<String, Integer> warningCounts,
            SessionReadiness sessionReadiness,
            List<String> recommendations,
            List<ExerciseMetadataIssue> issues) {
    }

    public record SessionReadiness(
            int push,
            int pull,
            int legs,
            int core,
            int cardio,
            int mobility,
            int minUpperPush,
            int minUpperPull,
            int minLower,
            int minCore,
            int minCardio,
            boolean fullBodyReady,
            boolean upperPushReady,
            boolean upperPullReady,
            boolean lowerReady,
            boolean cardioCoreReady,
            boolean generationReady) {
    }

    public record ExerciseMetadataIssue(
            Long exerciseId,
            String exerciseName,
            String status,
            String severity,
            int qualityScore,
            List<String> missingFields,
            List<String> invalidFields,
            List<String> warnings,
            String impact) {
    }
}
