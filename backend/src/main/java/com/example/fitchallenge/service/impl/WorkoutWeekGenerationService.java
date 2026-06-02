package com.example.fitchallenge.service.impl;

import com.example.fitchallenge.Entity.DailyTrainingLog;
import com.example.fitchallenge.Entity.Exercise;
import com.example.fitchallenge.Entity.ProgramTemplate;
import com.example.fitchallenge.Entity.TrainingPlan;
import com.example.fitchallenge.Entity.TrainingPlanDetail;
import com.example.fitchallenge.Entity.User;
import com.example.fitchallenge.Entity.UserBodyProfile;
import com.example.fitchallenge.Entity.UserTraining;
import com.example.fitchallenge.Entity.UserTrainingSession;
import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.repository.DailyTrainingLogRepository;
import com.example.fitchallenge.repository.ExerciseRepository;
import com.example.fitchallenge.repository.ProgramTemplateRepository;
import com.example.fitchallenge.repository.TrainingPlanDetailRepository;
import com.example.fitchallenge.repository.UserBodyProfileRepository;
import com.example.fitchallenge.repository.UserTrainingRepository;
import com.example.fitchallenge.repository.UserTrainingSessionRepository;
import com.example.fitchallenge.service.PersonalizationService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkoutWeekGenerationService {

    private final UserTrainingRepository userTrainingRepository;
    private final ProgramTemplateRepository programTemplateRepository;
    private final UserTrainingSessionRepository userTrainingSessionRepository;
    private final TrainingPlanDetailRepository trainingPlanDetailRepository;
    private final DailyTrainingLogRepository dailyTrainingLogRepository;
    private final ExerciseRepository exerciseRepository;
    private final UserBodyProfileRepository userBodyProfileRepository;
    private final PersonalizationService personalizationService;
    private final WorkoutDailyPlanGenerator workoutDailyPlanGenerator;
    private final ObjectMapper mapper;
    private final TransactionTemplate transactionTemplate;

    @Scheduled(cron = "0 15 2 * * *")
    public void generateEligibleNextWeeks() {
        List<UserTraining> activePrograms = userTrainingRepository.findActiveProgramsWithWeeksRemaining();
        for (UserTraining userTraining : activePrograms) {
            if (!shouldGenerateNextWeek(userTraining, LocalDate.now())) {
                continue;
            }
            NotificationResponse response = generateNextWeek(userTraining.getUtId());
            if (!response.isSuccess()) {
                log.warn("Could not generate next workout week for utId={}: {}",
                        userTraining.getUtId(), response.getMessage());
            }
        }
    }

    public NotificationResponse generateNextWeek(Long userTrainingId) {
        try {
            GeneratedWeekResult result = transactionTemplate.execute(status ->
                    persistNextWeek(userTrainingId));

            if (result == null) {
                throw new IllegalStateException("Next week generation returned no result");
            }

            NotificationResponse personalization =
                    personalizationService.createPersonalizedPlanDetails(userTrainingId);
            if (!personalization.isSuccess()) {
                return new NotificationResponse(false,
                        "Next workout week generated, but personalization refresh failed: "
                                + personalization.getMessage(),
                        result);
            }

            return new NotificationResponse(true,
                    "Next workout week generated from program template",
                    result);
        } catch (Exception e) {
            log.error("Failed to generate next workout week for utId={}", userTrainingId, e);
            return new NotificationResponse(false,
                    "Failed to generate next workout week: " + e.getMessage());
        }
    }

    private GeneratedWeekResult persistNextWeek(Long userTrainingId) {
        UserTraining userTraining = userTrainingRepository.findById(userTrainingId)
                .orElseThrow(() -> new IllegalStateException("UserTraining not found: " + userTrainingId));

        int currentWeek = valueOrDefault(userTraining.getWeekNumber(), 1);
        int totalWeeks = valueOrDefault(userTraining.getTotalWeeks(), 1);
        if (currentWeek >= totalWeeks) {
            throw new IllegalStateException("Program already generated all weeks");
        }

        int nextWeek = currentWeek + 1;
        int startDay = ((nextWeek - 1) * 7) + 1;
        int endDay = nextWeek * 7;

        ProgramTemplate template = programTemplateRepository
                .findTopByUserTrainingIdAndStatusOrderByVersionNumberDesc(userTrainingId, "ACTIVE")
                .orElseThrow(() -> new IllegalStateException("Active program template not found"));

        User user = userTraining.getUser();
        TrainingPlan trainingPlan = userTraining.getTrainingPlan();
        UserBodyProfile profile = userBodyProfileRepository.findByUser_Id(user.getId())
                .orElseThrow(() -> new IllegalStateException("Body profile is required before generating next week"));

        Map<String, Object> templateMap = toTemplateMap(template);
        Map<Long, Exercise> allowedById = loadExercisePool(templateMap);
        List<Map<String, Object>> sessions = workoutDailyPlanGenerator.generate(
                templateMap,
                allowedById,
                profile,
                nextWeek,
                valueOrDefault(template.getDurationMinutes(), 45));

        deleteExistingWeekRows(user.getId(), trainingPlan.getTpId(), userTrainingId, startDay, endDay);
        saveSessionMetadata(userTraining, trainingPlan.getTpId(), sessions);
        saveExerciseRows(user, trainingPlan, sessions, userTraining.getStartDate());

        userTraining.setWeekNumber(nextWeek);
        userTrainingRepository.save(userTraining);

        return new GeneratedWeekResult(userTrainingId, trainingPlan.getTpId(), nextWeek, startDay, endDay, sessions.size());
    }

    private boolean shouldGenerateNextWeek(UserTraining userTraining, LocalDate today) {
        LocalDate startDate = userTraining.getStartDate();
        if (startDate == null) {
            return false;
        }
        int currentWeek = valueOrDefault(userTraining.getWeekNumber(), 1);
        LocalDate currentWeekEnd = startDate.plusDays((long) currentWeek * 7 - 1);
        return !currentWeekEnd.isAfter(today.plusDays(2));
    }

    private void deleteExistingWeekRows(Long userId, Long trainingPlanId, Long userTrainingId, int startDay, int endDay) {
        userTrainingSessionRepository.deleteByUtIdAndDayNumberBetween(userTrainingId, startDay, endDay);
        trainingPlanDetailRepository.deleteByTrainingPlan_TpIdAndDayNumberBetween(trainingPlanId, startDay, endDay);
        dailyTrainingLogRepository.deleteByUser_IdAndTrainingPlan_TpIdAndDayNumberBetween(
                userId, trainingPlanId, startDay, endDay);
    }

    @SuppressWarnings("unchecked")
    private void saveExerciseRows(User user, TrainingPlan trainingPlan, List<Map<String, Object>> sessions, LocalDate startDate) {
        List<TrainingPlanDetail> details = new ArrayList<>();
        List<DailyTrainingLog> logs = new ArrayList<>();
        LocalDate effectiveStartDate = startDate != null ? startDate : LocalDate.now();

        for (Map<String, Object> session : sessions) {
            List<Map<String, Object>> exercises = (List<Map<String, Object>>) session.getOrDefault("exercises", List.of());
            if (exercises.isEmpty()) {
                continue;
            }
            int dayNumber = toInt(session.get("day_number"), 1);
            // Session-level calories are stored in UserTrainingSession (metadata table).
            // Each DailyTrainingLog gets per-exercise calories so the sum is accurate.
            int exerciseCount = exercises.size();
            int sessionCalories = toInt(session.get("estimated_calories_burned"), 0);

            for (Map<String, Object> item : exercises) {
                Long exerciseId = toLong(item.get("exercise_id"));
                Exercise exercise = exerciseRepository.findById(exerciseId)
                        .orElseThrow(() -> new IllegalStateException("Exercise not found: " + exerciseId));

                // Per-exercise calorie estimate using MET formula from CaloriesCalculator.
                // This is more accurate than dividing session calories by exercise count
                // because each exercise has a different MET value (e.g. push-up 8 MET vs plank 3.5 MET).
                int sets = toInt(item.get("sets"), valueOrDefault(exercise.getDefaultSets(), 3));
                int reps = parseReps(item.get("reps"), valueOrDefault(exercise.getDefaultReps(), 10));
                int restSeconds = toInt(item.get("rest_seconds"), valueOrDefault(exercise.getDefaultRestSeconds(), 60));
                int estimatedExerciseMinutes = com.example.fitchallenge.utils.CaloriesCalculator
                        .estimateDurationMinutes(sets, reps, restSeconds);
                int perExerciseCalories = com.example.fitchallenge.utils.CaloriesCalculator.calculateCalories(
                        exercise.getExerciseType(),
                        exercise.getExerciseName(),
                        estimatedExerciseMinutes,
                        null  // weight is refined by PersonalizationService later
                );

                TrainingPlanDetail detail = new TrainingPlanDetail();
                detail.setTrainingPlan(trainingPlan);
                detail.setDayNumber(dayNumber);
                detail.setExercise(exercise);
                detail.setSets(sets);
                detail.setReps(reps);
                detail.setRestTime(toInt(item.get("rest_seconds"), valueOrDefault(exercise.getDefaultRestSeconds(), 60)));
                // Store notes + recommended_weight as JSON so PersonalizationService can parse both
                String notesText = Objects.toString(item.getOrDefault("notes", ""), "");
                Object weightRec  = item.get("recommended_weight");
                if (weightRec != null && !weightRec.toString().isBlank()) {
                    java.util.Map<String, String> instrMap = new java.util.LinkedHashMap<>();
                    instrMap.put("notes", notesText);
                    instrMap.put("recommended_weight", weightRec.toString());
                    try { notesText = mapper.writeValueAsString(instrMap); } catch (Exception ignored) {}
                }
                detail.setInstructions(notesText);
                details.add(detail);

                logs.add(DailyTrainingLog.builder()
                        .user(user)
                        .trainingPlan(trainingPlan)
                        .trainingDate(effectiveStartDate.plusDays(Math.max(0, dayNumber - 1)))
                        .dayNumber(dayNumber)
                        .exercise(exercise)
                        .status(DailyTrainingLog.DailyTrainingStatus.NOT_STARTED)
                        .caloriesBurned(perExerciseCalories)
                        .build());
            }
        }

        if (details.isEmpty()) {
            throw new IllegalStateException("Generated week contains no workout exercises");
        }

        trainingPlanDetailRepository.saveAll(details);
        dailyTrainingLogRepository.saveAll(logs);
    }

    private void saveSessionMetadata(UserTraining userTraining, Long trainingPlanId, List<Map<String, Object>> sessions) {
        List<UserTrainingSession> rows = new ArrayList<>();
        for (Map<String, Object> session : sessions) {
            UserTrainingSession row = new UserTrainingSession();
            row.setUtId(userTraining.getUtId());
            row.setUserId(userTraining.getUser().getId());
            row.setTrainingPlanId(trainingPlanId);
            row.setDayNumber(toInt(session.get("day_number"), rows.size() + 1));
            row.setSessionType(Objects.toString(session.getOrDefault("session_type", "full_body"), "full_body"));
            row.setRestDay(Boolean.TRUE.equals(session.get("is_rest_day")));
            row.setDurationMinutes(toInt(session.get("duration_minutes"), 0));
            row.setEstimatedCaloriesBurned(toInt(session.get("estimated_calories_burned"), 0));
            row.setMuscleGroupsTargeted(writeJson(session.getOrDefault("muscle_groups_targeted", List.of())));
            row.setWarmup(writeJson(session.getOrDefault("warmup", List.of())));
            row.setCooldown(writeJson(session.getOrDefault("cooldown", List.of())));
            row.setNotes(writeJson(session.getOrDefault("notes", List.of())));
            Object cardio = session.get("cardio");
            row.setCardio(cardio == null ? null : writeJson(cardio));
            rows.add(row);
        }
        if (rows.size() != 7) {
            throw new IllegalStateException("Next week generation must produce exactly 7 sessions");
        }
        userTrainingSessionRepository.saveAll(rows);
    }

    private Map<String, Object> toTemplateMap(ProgramTemplate template) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("goal", template.getGoal());
        result.put("weekly_pattern", readJson(template.getWeeklyPatternJson(), new TypeReference<List<String>>() {}));
        result.put("exercise_pool", readJson(template.getExercisePoolJson(), new TypeReference<Map<String, List<Long>>>() {}));
        result.put("base_sets", template.getBaseSets());
        result.put("base_reps", template.getBaseReps());
        result.put("base_rest_seconds", template.getBaseRestSeconds());
        result.put("progression_rate", template.getProgressionRate());
        result.put("duration_minutes", template.getDurationMinutes());
        result.put("intensity", template.getIntensity());
        return result;
    }

    @SuppressWarnings("unchecked")
    private Map<Long, Exercise> loadExercisePool(Map<String, Object> templateMap) {
        Object rawPool = templateMap.get("exercise_pool");
        if (!(rawPool instanceof Map<?, ?> pool)) {
            throw new IllegalStateException("Program template exercise_pool is invalid");
        }

        Set<Long> ids = new LinkedHashSet<>();
        for (Object value : pool.values()) {
            if (value instanceof List<?> values) {
                values.forEach(id -> ids.add(toLong(id)));
            }
        }
        if (ids.isEmpty()) {
            throw new IllegalStateException("Program template exercise_pool is empty");
        }

        Map<Long, Exercise> byId = exerciseRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Exercise::getId, exercise -> exercise, (a, b) -> a));
        if (byId.size() != ids.size()) {
            ids.removeAll(byId.keySet());
            throw new IllegalStateException("Program template references missing exercise IDs: " + ids);
        }
        return byId;
    }

    private <T> T readJson(String json, TypeReference<T> type) {
        try {
            return mapper.readValue(json, type);
        } catch (Exception e) {
            throw new IllegalStateException("Cannot parse stored program template JSON", e);
        }
    }

    private String writeJson(Object value) {
        try {
            return mapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException("Cannot serialize generated workout session metadata", e);
        }
    }

    private int parseReps(Object value, int fallback) {
        if (value == null) {
            return fallback;
        }
        String text = value.toString().trim();
        if (text.isEmpty()) {
            return fallback;
        }
        int dashIndex = text.indexOf('-');
        String firstNumber = dashIndex >= 0 ? text.substring(0, dashIndex) : text;
        try {
            return Integer.parseInt(firstNumber.replaceAll("[^0-9]", ""));
        } catch (Exception e) {
            return fallback;
        }
    }

    private Long toLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            return Long.parseLong(text.trim());
        }
        throw new IllegalStateException("Exercise ID must be numeric");
    }

    private int toInt(Object value, int fallback) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            return Integer.parseInt(text.trim());
        }
        return fallback;
    }

    private int valueOrDefault(Integer value, int fallback) {
        return value != null ? value : fallback;
    }

    public record GeneratedWeekResult(
            Long userTrainingId,
            Long trainingPlanId,
            int weekNumber,
            int startDay,
            int endDay,
            int sessionCount) {}
}
