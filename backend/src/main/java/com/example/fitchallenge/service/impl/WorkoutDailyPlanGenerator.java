package com.example.fitchallenge.service.impl;

import com.example.fitchallenge.Entity.Exercise;
import com.example.fitchallenge.Entity.UserBodyProfile;
import com.example.fitchallenge.utils.GoalMapper;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class WorkoutDailyPlanGenerator {

    public List<Map<String, Object>> generate(
            Map<String, Object> template,
            Map<Long, Exercise> allowedById,
            UserBodyProfile profile,
            int weekNumber,
            int durationMinutes) {

        List<String> pattern = readStringList(template.get("weekly_pattern"));
        Map<String, List<Long>> pool = readExercisePool(template.get("exercise_pool"));
        int baseSets = toInt(template.get("base_sets"), 3);
        int baseReps = toInt(template.get("base_reps"), 12);
        int baseRest = toInt(template.get("base_rest_seconds"), 75);
        double weightKg = profile.getWeight() != null ? profile.getWeight().doubleValue() : 70.0;
        String goal = Objects.toString(template.getOrDefault("goal", "maintenance"), "maintenance");

        Volume volume = volumeForWeek(weekNumber, baseSets, baseReps, baseRest);
        List<Map<String, Object>> sessions = new ArrayList<>();

        // Count how many times each session type appears in the weekly pattern.
        // Used to split the exercise pool into slices so that the 1st and 2nd occurrences
        // of e.g. "lower" draw from different halves of the pool (Day A vs Day B).
        Map<String, Long> typeFrequency = pattern.stream()
                .filter(t -> !"rest".equals(t) && !"rest_day".equals(t))
                .collect(Collectors.groupingBy(t -> t, Collectors.counting()));
        // Tracks which occurrence (1-indexed) of each session type we are currently generating.
        Map<String, Integer> typeOccurrenceCounter = new LinkedHashMap<>();

        for (int day = 1; day <= 7; day++) {
            int programDay = ((Math.max(1, weekNumber) - 1) * 7) + day;
            String sessionType = pattern.get(day - 1);
            if ("rest".equals(sessionType) || "rest_day".equals(sessionType)) {
                sessions.add(restSession(programDay));
                continue;
            }

            List<Long> rawIds = pool.getOrDefault(sessionType, List.of());
            if (rawIds.isEmpty()) {
                throw new IllegalStateException("Program template has no exercise pool for " + sessionType);
            }

            // Deduplicate while preserving insertion order
            List<Long> allIds = new ArrayList<>(new LinkedHashSet<>(rawIds));

            // ── GUARDRAIL 1: Lọc theo nhóm cơ phù hợp với session ────────────────────
            // Đảm bảo buổi "lower" chỉ có bài chân, "upper_push" chỉ ngực/vai/tay...
            // Bất kể AI sinh pool thế nào — Java là chốt chặn cuối cho coherence.
            List<Long> coherentIds = allIds.stream()
                    .filter(id -> {
                        Exercise ex = allowedById.get(id);
                        return ex != null && sessionAllowsMuscle(sessionType, ex.getPrimaryMuscle());
                    })
                    .collect(Collectors.toList());

            // Nếu pool gốc không đủ bài đúng nhóm → bổ sung từ full_body (cũng lọc đúng nhóm)
            int wantMin = Math.max(3, durationMinutes / 8);
            if (coherentIds.size() < wantMin) {
                for (Long fid : pool.getOrDefault("full_body", List.of())) {
                    if (coherentIds.contains(fid)) continue;
                    Exercise ex = allowedById.get(fid);
                    if (ex != null && sessionAllowsMuscle(sessionType, ex.getPrimaryMuscle())) {
                        coherentIds.add(fid);
                        if (coherentIds.size() >= wantMin) break;
                    }
                }
            }
            // Production rule: nếu không đủ bài đúng nhóm cơ thì fail rõ.
            // Không fallback sang pool gốc vì có thể nhét squat vào upper hoặc push-up vào lower.
            if (coherentIds.size() < Math.min(3, wantMin)) {
                throw new IllegalStateException(
                        "Not enough coherent exercises for session_type=" + sessionType
                                + ". Required at least " + Math.min(3, wantMin)
                                + ", found " + coherentIds.size());
            }
            allIds = coherentIds;

            // ── Pool slicing for repeated session types ──────────────────────────────
            // If this session type appears N times/week, divide the pool into N equal
            // slices. The k-th occurrence uses the k-th slice, so Day-A lower draws
            // quad-dominant exercises and Day-B lower draws hip-dominant exercises.
            int occurrence = typeOccurrenceCounter.merge(sessionType, 1, Integer::sum);
            long totalOccurrences = typeFrequency.getOrDefault(sessionType, 1L);
            List<Long> exerciseIds;
            if (totalOccurrences > 1 && allIds.size() >= totalOccurrences * 3) {
                int sliceSize = allIds.size() / (int) totalOccurrences;
                int startIdx  = (occurrence - 1) * sliceSize;
                int endIdx    = (occurrence < totalOccurrences) ? startIdx + sliceSize : allIds.size();
                exerciseIds   = allIds.subList(startIdx, Math.min(endIdx, allIds.size()));
            } else {
                exerciseIds = allIds;
            }
            exerciseIds = new ArrayList<>(exerciseIds); // mutable copy

            // Cap per session: ~1 exercise per 8 minutes, min 3
            int maxEx = Math.max(3, durationMinutes / 8);

            // If slice is smaller than minimum, pad from the sibling slice or full_body
            int minTarget = Math.min(3, maxEx);
            if (exerciseIds.size() < minTarget) {
                List<Long> fallback = pool.getOrDefault("full_body", allIds);
                for (Long fid : fallback) {
                    if (!exerciseIds.contains(fid)) exerciseIds.add(fid);
                    if (exerciseIds.size() >= minTarget) break;
                }
            }

            // Rotate start offset each week so users see different exercises across weeks
            int offset = (weekNumber - 1) % Math.max(1, exerciseIds.size());
            List<Long> selected = new ArrayList<>();
            for (int i = 0; i < Math.min(maxEx, exerciseIds.size()); i++) {
                selected.add(exerciseIds.get((offset + i) % exerciseIds.size()));
            }

            // ── GUARDRAIL 2: Sắp xếp compound TRƯỚC, isolation SAU ───────────────────
            // Nguyên tắc huấn luyện: bài compound (nhiều khớp, nặng) tập khi còn sung sức.
            selected.sort((a, b) -> {
                int ra = compoundRank(allowedById.get(a));
                int rb = compoundRank(allowedById.get(b));
                return Integer.compare(ra, rb); // rank nhỏ = compound = lên đầu
            });

            List<Map<String, Object>> exercises = new ArrayList<>();
            Set<String> seenNames = new LinkedHashSet<>();
            for (Long exerciseId : selected) {
                Exercise exercise = allowedById.get(exerciseId);
                if (exercise == null) {
                    throw new IllegalStateException("Program template contains unavailable exercise_id=" + exerciseId);
                }
                String nameLower = exercise.getExerciseName() != null ? exercise.getExerciseName().toLowerCase() : "";
                if (!seenNames.add(nameLower)) continue; // skip name duplicate within same session
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("exercise_id", exercise.getId());
                item.put("name", exercise.getExerciseName());
                item.put("muscle_group", exercise.getPrimaryMuscle());
                // Per-exercise rep range: compound = lower reps, isolation = higher reps
                int exReps  = exerciseReps(exercise, volume.reps());
                int exSets  = volume.sets();
                int exRest  = exerciseRest(exercise, volume.restSeconds());
                item.put("sets", exSets);
                item.put("reps", String.valueOf(exReps));
                item.put("rest_seconds", exRest);
                item.put("equipment", exercise.getRequiredEquipment());
                item.put("tempo", tempo(exercise));
                item.put("notes", buildNote(exercise, volume, goal, weightKg, weekNumber));
                String weightRec = weightRecommendation(exercise, weightKg, goal, volume.phase(), weekNumber);
                if (weightRec != null) {
                    item.put("recommended_weight", weightRec);
                }
                exercises.add(item);
            }

            Map<String, Object> session = new LinkedHashMap<>();
            session.put("day", "Day " + programDay);
            session.put("day_number", programDay);
            session.put("session_type", sessionType);
            session.put("is_rest_day", false);
            session.put("duration_minutes", durationMinutes);
            session.put("muscle_groups_targeted", muscleGroups(sessionType));
            session.put("estimated_calories_burned", GoalMapper.calcCaloriesPerSession(toMetSessionType(sessionType), weightKg, durationMinutes));
            session.put("warmup", warmup(sessionType));
            session.put("exercises", exercises);
            session.put("cardio", null);
            session.put("cooldown", cooldown(sessionType));
            session.put("notes", List.of("Week " + weekNumber + " " + volume.phase() + " progression"));
            sessions.add(session);
        }
        return sessions;
    }

    private Volume volumeForWeek(int weekNumber, int baseSets, int baseReps, int baseRest) {
        // Every 4th week is a deload: reduce sets, maintain reps for recovery
        if (weekNumber % 4 == 0) {
            return new Volume("deload", Math.max(1, baseSets - 1), baseReps, baseRest);
        }

        // Position within the current 4-week block (0 = first, 1 = second, 2 = third active week)
        // Week 4 / 8 / 12 is deload (handled above), so weekInBlock is always 0, 1, or 2.
        int weekInBlock = (weekNumber - 1) % 4; // 0, 1, 2 for active weeks

        // 4-week block determines training phase with micro-progression WITHIN each block:
        //   block 0 (weeks 1–3)  → Foundation:  +1 rep/week  (3×12 → 3×13 → 3×14)
        //   block 1 (weeks 5–7)  → Build:       +1 rep/week  (3×14 → 3×15 → 3×16)
        //   block 2+ (weeks 9+)  → Overload:    +½ set every 2 weeks (4×10 → 4×10 → 5×10)
        int block = (weekNumber - 1) / 4;
        return switch (block) {
            case 0 -> new Volume("foundation", baseSets,     baseReps + weekInBlock,            baseRest);
            case 1 -> new Volume("build",      baseSets,     baseReps + 2 + weekInBlock,         baseRest);
            default -> new Volume("overload",  baseSets + 1 + (weekInBlock / 2),
                                               Math.max(baseReps - 2, 3),                        baseRest + 30);
        };
    }

    private Map<String, Object> restSession(int day) {
        Map<String, Object> session = new LinkedHashMap<>();
        session.put("day", "Day " + day);
        session.put("day_number", day);
        session.put("session_type", "rest_day");
        session.put("is_rest_day", true);
        session.put("duration_minutes", 0);
        session.put("muscle_groups_targeted", List.of());
        session.put("estimated_calories_burned", 0);
        session.put("warmup", List.of());
        session.put("exercises", List.of());
        session.put("cardio", null);
        session.put("cooldown", List.of("Mobility work", "Light stretching"));
        session.put("notes", List.of("Recovery day"));
        return session;
    }

    @SuppressWarnings("unchecked")
    private List<String> readStringList(Object value) {
        if (value instanceof List<?> raw) {
            return raw.stream().map(Objects::toString).toList();
        }
        throw new IllegalStateException("Program template weekly_pattern must be a list");
    }

    @SuppressWarnings("unchecked")
    private Map<String, List<Long>> readExercisePool(Object value) {
        if (!(value instanceof Map<?, ?> rawMap)) {
            throw new IllegalStateException("Program template exercise_pool must be an object");
        }
        Map<String, List<Long>> pool = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : rawMap.entrySet()) {
            if (!(entry.getValue() instanceof List<?> rawIds)) {
                throw new IllegalStateException("Program template exercise_pool values must be arrays");
            }
            pool.put(Objects.toString(entry.getKey()), rawIds.stream()
                    .filter(Objects::nonNull)
                    .map(this::toLong)
                    .toList());
        }
        return pool;
    }

    private Long toLong(Object value) {
        if (value instanceof Number number) return number.longValue();
        if (value instanceof String text && !text.isBlank()) return Long.parseLong(text.trim());
        throw new IllegalStateException("Exercise pool contains a non-numeric exercise ID");
    }

    private int toInt(Object value, int fallback) {
        if (value instanceof Number number) return number.intValue();
        if (value instanceof String text && !text.isBlank()) return Integer.parseInt(text.trim());
        return fallback;
    }

    private String toMetSessionType(String sessionType) {
        if ("lower".equals(sessionType)) return "lower_body";
        if ("cardio_core".equals(sessionType)) return "cardio";
        if ("upper_push".equals(sessionType) || "upper_pull".equals(sessionType)) return "upper_body";
        return sessionType;
    }

    private List<String> muscleGroups(String sessionType) {
        return switch (sessionType) {
            case "upper_push" -> List.of("chest", "shoulders", "triceps");
            case "upper_pull" -> List.of("back", "biceps");
            case "lower" -> List.of("quads", "hamstrings", "glutes");
            case "full_body" -> List.of("push", "pull", "legs", "core");
            case "cardio_core" -> List.of("cardio", "core");
            default -> List.of();
        };
    }

    /**
     * GUARDRAIL: bài tập có primary_muscle có phù hợp với loại buổi tập không?
     * Dùng từ khoá nhóm cơ (khớp một phần, không phân biệt hoa thường) để bền với
     * sự khác biệt tên cơ trong DB ("Upper Chest", "Latissimus Dorsi"...).
     */
    private boolean sessionAllowsMuscle(String sessionType, String primaryMuscle) {
        if (primaryMuscle == null) return false;
        String m = primaryMuscle.toLowerCase();
        String s = sessionType == null ? "" : sessionType.toLowerCase();

        java.util.function.Predicate<String[]> any = keys -> {
            for (String k : keys) if (m.contains(k)) return true;
            return false;
        };
        String[] push = {"chest", "pec", "shoulder", "delt", "tricep"};
        String[] pull = {"back", "lat", "trap", "rhomboid", "bicep", "brachial", "erector", "rear delt"};
        String[] legs = {"glute", "quad", "hamstring", "calf", "calves", "adductor", "abductor", "thigh", "hip flexor"};
        String[] core = {"core", "ab", "oblique", "abdominal", "transverse"};
        String[] cardio = {"cardio", "conditioning", "aerobic", "run", "bike", "row", "jump"};

        return switch (s) {
            case "upper_push", "push" -> any.test(push);
            case "upper_pull", "pull" -> any.test(pull);
            case "lower", "legs" -> any.test(legs);
            case "cardio_core", "core", "cardio" -> any.test(core) || any.test(cardio);
            // full_body và các loại khác: chấp nhận mọi nhóm cơ
            default -> true;
        };
    }

    /**
     * GUARDRAIL: rank để sắp xếp compound trước isolation.
     * 0 = COMPOUND, 1 = không rõ, 2 = ISOLATION/MOBILITY.
     */
    private int compoundRank(Exercise ex) {
        if (ex == null) return 1;
        String cat = ex.getExerciseCategory() != null ? ex.getExerciseCategory().toUpperCase() : "";
        if (cat.contains("COMPOUND")) return 0;
        if (cat.contains("ISOLATION") || cat.contains("MOBILITY")) return 2;
        return 1;
    }

    private List<String> warmup(String sessionType) {
        return switch (sessionType) {
            case "lower" -> List.of("Hip circles", "Leg swings", "Bodyweight squat");
            case "upper_push", "upper_pull" -> List.of("Shoulder circles", "Arm swings", "Chest opener");
            default -> List.of("Shoulder circles", "Hip circles", "Bodyweight squat");
        };
    }

    private List<String> cooldown(String sessionType) {
        return switch (sessionType) {
            case "lower" -> List.of("Standing quad stretch 20-30s", "Hamstring stretch 20-30s", "Figure-four glute stretch 20-30s");
            case "upper_push", "upper_pull" -> List.of("Doorway chest stretch 20-30s", "Lat stretch 20-30s", "Cross-body shoulder stretch 20-30s");
            default -> List.of("Chest stretch 20-30s", "Hip flexor stretch 20-30s", "Hamstring stretch 20-30s");
        };
    }

    /**
     * Determine appropriate tempo for an exercise.
     * Priority: use per-exercise tempo stored in catalog, then infer from type/category.
     *
     * Format: "eccentric-pause-concentric" (e.g. "3-0-1")
     *   Compound lifts:  "3-0-1" — controlled down, explosive up
     *   Isolation:       "2-0-2" — slow both ways, maximise time-under-tension
     *   Cardio/dynamic:  "N/A"   — tempo concept does not apply
     *   Isometric:       "hold"  — duration in seconds, not reps
     */
    private String tempo(Exercise exercise) {
        if (exercise.getTempo() != null && !exercise.getTempo().isBlank()) {
            return exercise.getTempo();
        }
        String movPat  = exercise.getMovementPattern()  != null ? exercise.getMovementPattern().toLowerCase()  : "";
        String exType  = exercise.getExerciseType()     != null ? exercise.getExerciseType().toLowerCase()     : "";
        String category = exercise.getExerciseCategory() != null ? exercise.getExerciseCategory().toUpperCase() : "";
        String force   = exercise.getForceType()        != null ? exercise.getForceType().toUpperCase()        : "";

        if ("CARDIO".equals(force) || exType.contains("cardio") || movPat.contains("cardio")) {
            return "N/A";
        }
        if (movPat.contains("isometric") || exType.contains("isometric")) {
            return "hold";
        }
        if ("COMPOUND".equals(category)) {
            return "3-0-1";
        }
        if ("ISOLATION".equals(category)) {
            return "2-0-2";
        }
        return "3-0-1";
    }

    /**
     * Build a user-readable note for each exercise card.
     * Format: "[Muscle] Week N · Phase phase · Goal note. Weight/progression tip. Tempo: Y."
     */
    private String buildNote(Exercise exercise, Volume volume, String goal, double bodyWeightKg, int weekNumber) {
        String muscle    = exercise.getPrimaryMuscle() != null ? exercise.getPrimaryMuscle() : "Full Body";
        String phase     = capitalize(volume.phase()) + " phase";
        String tempo     = tempo(exercise);
        String goalTxt   = goalNote(goal);
        String weightRec = weightRecommendation(exercise, bodyWeightKg, goal, volume.phase(), weekNumber);
        String equip     = exercise.getRequiredEquipment() != null ? exercise.getRequiredEquipment().toUpperCase() : "";

        StringBuilder sb = new StringBuilder();
        sb.append("[").append(muscle).append("] ")
          .append("Week ").append(weekNumber).append(" · ").append(phase).append(". ")
          .append("Trains ").append(muscle.toLowerCase()).append(" for ").append(goalTxt).append(". ");
        if (weightRec != null) {
            sb.append("Suggested weight: ").append(weightRec).append(". ");
        } else if (equip.contains("BODYWEIGHT") || equip.isBlank()) {
            // Bodyweight progressive overload hint
            if (weekNumber > 1) {
                sb.append("Progressive overload: add 1-2 reps or try a harder variation. ");
            }
        }
        sb.append("Tempo: ").append(tempo).append(".");
        return sb.toString();
    }

    /** Translate goal key to human-readable purpose. */
    private String goalNote(String goal) {
        if (goal == null) return "overall health & fitness";
        return switch (goal.toLowerCase()) {
            case "weight_loss"  -> "fat burning & calorie expenditure";
            case "muscle_gain"  -> "hypertrophy & muscle size";
            case "strength"     -> "maximal strength & neural adaptation";
            case "endurance"    -> "muscular endurance & stamina";
            case "maintenance"  -> "general fitness & body composition";
            default             -> "overall health & fitness";
        };
    }

    /**
     * Estimate a starting weight based on equipment, bodyweight, goal, phase, and week.
     * Progressive overload: weight increases every 2 weeks.
     * Returns null for bodyweight exercises (reps/variation progression used instead).
     */
    private String weightRecommendation(Exercise exercise, double bodyWeightKg, String goal, String phase, int weekNumber) {
        String equip = exercise.getRequiredEquipment() != null
                ? exercise.getRequiredEquipment().toUpperCase() : "";

        // Progressive increment: add weight every 2 weeks (week 1-2 = 0, week 3-4 = +1 step, ...)
        int progressSteps = (weekNumber - 1) / 2; // 0 for weeks 1-2, 1 for weeks 3-4, etc.

        if (equip.contains("DUMBBELL")) {
            double pct = switch (goal) {
                case "strength"    -> 0.20;
                case "muscle_gain" -> 0.17;
                default            -> 0.12; // weight_loss, endurance, maintenance
            };
            if ("overload".equals(phase)) pct += 0.05;
            double baseKg = Math.max(2.5, Math.min(25.0, bodyWeightKg * pct));
            baseKg = Math.round(baseKg / 2.5) * 2.5;
            // +2.5 kg per 2-week step, cap at 40 kg
            double kg = Math.min(40.0, baseKg + progressSteps * 2.5);
            kg = Math.round(kg / 2.5) * 2.5;
            return "~" + (int) kg + "kg dumbbell";
        } else if (equip.contains("BARBELL")) {
            double pct = switch (goal) {
                case "strength"    -> 0.55;
                case "muscle_gain" -> 0.45;
                default            -> 0.30;
            };
            if ("overload".equals(phase)) pct += 0.10;
            double baseKg = Math.max(20.0, Math.min(80.0, bodyWeightKg * pct));
            baseKg = Math.round(baseKg / 5.0) * 5.0;
            // +5 kg per 2-week step, cap at 120 kg
            double kg = Math.min(120.0, baseKg + progressSteps * 5.0);
            kg = Math.round(kg / 5.0) * 5.0;
            return "~" + (int) kg + "kg barbell";
        } else if (equip.contains("CABLE")) {
            double baseKg = Math.max(5.0, Math.min(20.0, bodyWeightKg * 0.10));
            baseKg = Math.round(baseKg / 2.5) * 2.5;
            double kg = Math.min(30.0, baseKg + progressSteps * 2.5);
            kg = Math.round(kg / 2.5) * 2.5;
            return "~" + (int) kg + "kg cable";
        } else if (equip.contains("MACHINE")) {
            double baseKg = Math.max(10.0, Math.min(35.0, bodyWeightKg * 0.15));
            baseKg = Math.round(baseKg / 5.0) * 5.0;
            double kg = Math.min(60.0, baseKg + progressSteps * 5.0);
            kg = Math.round(kg / 5.0) * 5.0;
            return "~" + (int) kg + "kg machine";
        }
        return null; // BODYWEIGHT or unrecognised → no weight suggestion (reps progression used)
    }

    /**
     * Adjust rep count per exercise based on category and movement pattern.
     * NSCA/ACSM guidelines:
     *   Compound movements (squat, deadlift, bench, row, press): 6-10 for strength, 8-12 for hypertrophy
     *   Isolation movements (curl, extension, fly, raise):        12-15 for hypertrophy
     *   Core / isometric:                                         15-20 or hold
     *   Cardio / dynamic:                                         use volume reps as-is
     */
    private int exerciseReps(Exercise exercise, int volumeReps) {
        String category = exercise.getExerciseCategory() != null ? exercise.getExerciseCategory().toUpperCase() : "";
        String movPat   = exercise.getMovementPattern()  != null ? exercise.getMovementPattern().toLowerCase()  : "";
        String exType   = exercise.getExerciseType()     != null ? exercise.getExerciseType().toLowerCase()     : "";

        if (exType.contains("cardio") || movPat.contains("cardio") || movPat.contains("dynamic")) {
            return volumeReps;
        }
        if (movPat.contains("isometric") || exType.contains("isometric") || movPat.contains("core")) {
            return Math.max(volumeReps, 15);
        }
        if ("ISOLATION".equals(category)) {
            return Math.max(volumeReps, 12); // push reps up for isolation
        }
        if ("COMPOUND".equals(category)) {
            return Math.min(volumeReps, 12); // keep reps moderate for compound
        }
        // Use exercise's own default if available and reasonable
        if (exercise.getDefaultReps() != null && exercise.getDefaultReps() >= 4 && exercise.getDefaultReps() <= 25) {
            return exercise.getDefaultReps();
        }
        return volumeReps;
    }

    /**
     * Adjust inter-set rest based on exercise category.
     * Compound lifts need more recovery; isolation & cardio need less.
     */
    private int exerciseRest(Exercise exercise, int volumeRest) {
        String category = exercise.getExerciseCategory() != null ? exercise.getExerciseCategory().toUpperCase() : "";
        String movPat   = exercise.getMovementPattern()  != null ? exercise.getMovementPattern().toLowerCase()  : "";

        if (movPat.contains("cardio") || movPat.contains("dynamic")) return Math.max(30, volumeRest - 30);
        if ("COMPOUND".equals(category))  return Math.max(60, volumeRest);
        if ("ISOLATION".equals(category)) return Math.max(45, volumeRest - 15);
        return volumeRest;
    }

    private String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    private record Volume(String phase, int sets, int reps, int restSeconds) {}
}
