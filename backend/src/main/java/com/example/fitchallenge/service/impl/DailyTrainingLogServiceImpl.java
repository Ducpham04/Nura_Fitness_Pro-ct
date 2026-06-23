package com.example.fitchallenge.service.impl;

import com.example.fitchallenge.DTO.DailyTrainingLogDTO.DailyTrainingLogResponse;
import com.example.fitchallenge.Entity.DailyTrainingLog;
import com.example.fitchallenge.Entity.Exercise;
import com.example.fitchallenge.Entity.PersonalizedPlanDetail;
import com.example.fitchallenge.Entity.UserBodyProfile;
import com.example.fitchallenge.Entity.TrainingPlan;
import com.example.fitchallenge.Entity.TrainingPlanDetail;
import com.example.fitchallenge.Entity.User;
import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.repository.DailyTrainingLogRepository;
import com.example.fitchallenge.repository.UserBodyProfileRepository;
import com.example.fitchallenge.repository.TrainingPlanDetailRepository;
import com.example.fitchallenge.repository.TrainingPlanRepository;
import com.example.fitchallenge.repository.User.UserRepository;
import com.example.fitchallenge.repository.ExerciseRepository;
import com.example.fitchallenge.repository.PersonalizedPlanDetailRepository;
import com.example.fitchallenge.service.DailyTrainingLogService;
import com.example.fitchallenge.utils.CaloriesCalculator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DailyTrainingLogServiceImpl implements DailyTrainingLogService {

    private final DailyTrainingLogRepository dailyTrainingLogRepository;
    private final UserRepository userRepository;
    private final TrainingPlanRepository trainingPlanRepository;
    private final TrainingPlanDetailRepository trainingPlanDetailRepository;
    private final ExerciseRepository exerciseRepository;
    private final PersonalizedPlanDetailRepository personalizedPlanDetailRepository;
    private final UserBodyProfileRepository userBodyProfileRepository;

    @Override
    @Transactional(readOnly = true)
    public NotificationResponse getDailyTrainingLogsByUserAndPlan(Long userId, Long trainingPlanId) {
        try {
            // Verify user and training plan exist
            if (!userRepository.existsById(userId)) {
                throw new RuntimeException("User not found with id: " + userId);
            }
            
            TrainingPlan trainingPlan = trainingPlanRepository.findById(trainingPlanId)
                    .orElseThrow(() -> new RuntimeException("Training plan not found with id: " + trainingPlanId));

            // Get all daily training logs for this user and plan
            List<DailyTrainingLog> logs = dailyTrainingLogRepository
                    .findByUser_IdAndTrainingPlan_TpId(userId, trainingPlanId);

            // Get all training plan details (template) for this plan
            List<TrainingPlanDetail> templateDetails = trainingPlanDetailRepository
                    .findByTrainingPlan_TpId(trainingPlanId);

            // Create a map: (dayNumber, exerciseId) -> TrainingPlanDetail
            Map<String, TrainingPlanDetail> templateMap = templateDetails.stream()
                    .filter(tpd -> tpd.getExercise() != null)
                    .collect(Collectors.toMap(
                            tpd -> tpd.getDayNumber() + "_" + tpd.getExercise().getId(),
                            tpd -> tpd,
                            (existing, replacement) -> existing
                    ));

            // Convert logs to response DTOs, combining with template data
            List<DailyTrainingLogResponse> responses = new ArrayList<>();

            // First, process existing logs
            for (DailyTrainingLog log : logs) {
                DailyTrainingLogResponse response = mapToResponse(log, templateMap, trainingPlan);
                responses.add(response);
            }

            // Then, add missing days from template (not_started status)
            for (TrainingPlanDetail template : templateDetails) {
                boolean exists = logs.stream().anyMatch(log ->
                        log.getDayNumber().equals(template.getDayNumber()) &&
                        log.getExercise() != null &&
                        template.getExercise() != null &&
                        log.getExercise().getId().equals(template.getExercise().getId())
                );

                if (!exists) {
                    // Create a "not_started" log entry from template
                    DailyTrainingLogResponse response = createResponseFromTemplate(template, trainingPlan);
                    responses.add(response);
                }
            }

            // Sort by day number, then by challenge
            responses.sort((a, b) -> {
                int dayCompare = a.getDayNumber().compareTo(b.getDayNumber());
                if (dayCompare != 0) return dayCompare;
                return a.getChallengeId().compareTo(b.getChallengeId());
            });

            return new NotificationResponse(true, 
                    "Daily training logs fetched successfully", 
                    responses);
        } catch (Exception e) {
            log.error("Unexpected error", e);
            return new NotificationResponse(false, 
                    "Error fetching daily training logs: " + e.getMessage(), 
                    null);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public NotificationResponse getDailyTrainingLogsByUserAndPlanAndDay(Long userId, Long trainingPlanId, Integer dayNumber) {
        try {
            List<DailyTrainingLog> logs = dailyTrainingLogRepository
                    .findByUser_IdAndTrainingPlan_TpIdAndDayNumber(userId, trainingPlanId, dayNumber);

            TrainingPlan trainingPlan = trainingPlanRepository.findById(trainingPlanId)
                    .orElseThrow(() -> new RuntimeException("Training plan not found"));

            List<TrainingPlanDetail> templateDetails = trainingPlanDetailRepository
                    .findByTrainingPlan_TpIdAndDayNumber(trainingPlanId, dayNumber);

            Map<String, TrainingPlanDetail> templateMap = templateDetails.stream()
                    .filter(tpd -> tpd.getExercise() != null)
                    .collect(Collectors.toMap(
                            tpd -> tpd.getDayNumber() + "_" + tpd.getExercise().getId(),
                            tpd -> tpd,
                            (existing, replacement) -> existing
                    ));

            List<DailyTrainingLogResponse> responses = new ArrayList<>();

            // Process existing logs
            for (DailyTrainingLog log : logs) {
                responses.add(mapToResponse(log, templateMap, trainingPlan));
            }

            // Add missing challenges from template
            for (TrainingPlanDetail template : templateDetails) {
                boolean exists = logs.stream().anyMatch(log ->
                        log.getExercise() != null &&
                        template.getExercise() != null &&
                        log.getExercise().getId().equals(template.getExercise().getId())
                );

                if (!exists) {
                    responses.add(createResponseFromTemplate(template, trainingPlan));
                }
            }

            responses.sort((a, b) -> a.getChallengeId().compareTo(b.getChallengeId()));

            return new NotificationResponse(true, 
                    "Daily training logs for day " + dayNumber + " fetched successfully", 
                    responses);
        } catch (Exception e) {
            log.error("Unexpected error", e);
            return new NotificationResponse(false, 
                    "Error fetching daily training logs: " + e.getMessage(), 
                    null);
        }
    }

    @Override
    @Transactional
    public NotificationResponse createOrUpdateDailyTrainingLog(
            Long userId, Long trainingPlanId, Integer dayNumber, Long challengeId, String status,
            Integer repsCompleted, Integer setsCompleted, Integer score, Double confidence,
            Integer actualDurationMinutes, Integer fatigueLevel, Double sleepHours,
            Integer caloriesBurnedOverride) {
        // Gọi method chính nhưng truyền override để ghi đè calories tính tự động
        this.caloriesBurnedOverrideHolder.set(caloriesBurnedOverride);
        try {
            return createOrUpdateDailyTrainingLog(userId, trainingPlanId, dayNumber, challengeId, status,
                    repsCompleted, setsCompleted, score, confidence, actualDurationMinutes, fatigueLevel, sleepHours);
        } finally {
            this.caloriesBurnedOverrideHolder.remove();
        }
    }

    @Transactional
    public NotificationResponse createOrUpdateDailyTrainingLog(
            Long userId, Long trainingPlanId, Integer dayNumber, Long challengeId, String status,
            Integer repsCompleted, Integer setsCompleted, Integer score, Double confidence,
            Integer actualDurationMinutes, Integer fatigueLevel, Double sleepHours,
            Integer caloriesBurnedOverride, Integer perceivedDifficulty) {
        this.perceivedDifficultyHolder.set(perceivedDifficulty);
        try {
            return createOrUpdateDailyTrainingLog(userId, trainingPlanId, dayNumber, challengeId, status,
                    repsCompleted, setsCompleted, score, confidence, actualDurationMinutes, fatigueLevel, sleepHours,
                    caloriesBurnedOverride);
        } finally {
            this.perceivedDifficultyHolder.remove();
        }
    }

    private final ThreadLocal<Integer> caloriesBurnedOverrideHolder = new ThreadLocal<>();
    private final ThreadLocal<Integer> perceivedDifficultyHolder = new ThreadLocal<>();

    public NotificationResponse createOrUpdateDailyTrainingLog(
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
            Double sleepHours) {
        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            TrainingPlan trainingPlan = trainingPlanRepository.findById(trainingPlanId)
                    .orElseThrow(() -> new RuntimeException("Training plan not found"));

            // Backward-compatible param name: challengeId means exerciseId for workout logs.
            Exercise exercise = exerciseRepository.findById(challengeId)
                    .orElseThrow(() -> new RuntimeException("Exercise not found with id: " + challengeId));

            // Get user weight for calories calculation
            BigDecimal userWeightKg = null;
            Optional<UserBodyProfile> bodyInfoOpt = userBodyProfileRepository.findByUser_Id(userId);
            if (bodyInfoOpt.isPresent()) {
                userWeightKg = bodyInfoOpt.get().getWeight();
            }

            // Calculate calories burned
            // Ưu tiên: override từ client (estimatedCalories của plan) > tính từ sets/reps/duration
            Integer calculatedCalories = caloriesBurnedOverrideHolder.get();
            if (calculatedCalories == null || calculatedCalories <= 0) {
                if (actualDurationMinutes != null || (setsCompleted != null && repsCompleted != null)) {
                    calculatedCalories = CaloriesCalculator.calculateCaloriesFromLog(
                            actualDurationMinutes, setsCompleted, repsCompleted,
                            exercise.getExerciseType(), userWeightKg);
                }
            }

            // Try to find existing log(s) - handle duplicate records
            List<DailyTrainingLog> existingLogs = dailyTrainingLogRepository
                    .findByUser_IdAndTrainingPlan_TpIdAndDayNumberAndExercise_Id(userId, trainingPlanId, dayNumber, challengeId);
            
            DailyTrainingLog trainingLog = null;
            if (!existingLogs.isEmpty()) {
                if (existingLogs.size() > 1) {
                    // Nếu có duplicate records, lấy record mới nhất và xóa các record cũ
                    log.debug("⚠️ [DailyTrainingLogService] Found {}", existingLogs.size() + 
                            " duplicate records for userId=" + userId + 
                            ", trainingPlanId=" + trainingPlanId + 
                            ", dayNumber=" + dayNumber + 
                            ", challengeId=" + challengeId);
                    
                    // Sort by createdAt descending (newest first)
                    existingLogs.sort((a, b) -> {
                        if (a.getCreatedAt() == null && b.getCreatedAt() == null) return 0;
                        if (a.getCreatedAt() == null) return 1;
                        if (b.getCreatedAt() == null) return -1;
                        return b.getCreatedAt().compareTo(a.getCreatedAt());
                    });
                    
                    // Keep the newest one, delete the rest
                    trainingLog = existingLogs.get(0);
                    for (int i = 1; i < existingLogs.size(); i++) {
                        log.debug("🗑️ [DailyTrainingLogService] Deleting duplicate record dtlId={}", existingLogs.get(i).getDtlId());
                        dailyTrainingLogRepository.delete(existingLogs.get(i));
                    }
                } else {
                    trainingLog = existingLogs.get(0);
                }
            }

            if (trainingLog == null) {
                // Create new log
                trainingLog = DailyTrainingLog.builder()
                        .user(user)
                        .trainingPlan(trainingPlan)
                        .exercise(exercise)
                        .dayNumber(dayNumber)
                        .trainingDate(LocalDate.now())
                        .status(DailyTrainingLog.DailyTrainingStatus.valueOf(status.toUpperCase()))
                        .repsCompleted(repsCompleted) // ✅ FIX: Lưu reps completed
                        .setsCompleted(setsCompleted) // ✅ FIX: Lưu sets completed
                        .score(score != null ? score.doubleValue() : null) // ✅ FIX: Lưu score
                        .confidence(confidence) // ✅ FIX: Lưu confidence
                        .actualDurationMinutes(actualDurationMinutes) // ✅ FIX: Lưu duration
                        .caloriesBurned(calculatedCalories) // ✅ Calculate and save calories
                        .fatigueLevel(fatigueLevel)
                        .sleepHours(sleepHours)
                        .perceivedDifficulty(perceivedDifficultyHolder.get()) // ✅ RPE
                        .build();

                if ("COMPLETED".equalsIgnoreCase(status)) {
                    trainingLog.setCompletedAt(java.time.ZonedDateTime.now());
                }
            } else {
                // Update existing log
                trainingLog.setStatus(DailyTrainingLog.DailyTrainingStatus.valueOf(status.toUpperCase()));
                if (repsCompleted != null) {
                    trainingLog.setRepsCompleted(repsCompleted);
                }
                if (setsCompleted != null) {
                    trainingLog.setSetsCompleted(setsCompleted);
                }
                if (score != null) {
                    trainingLog.setScore(score);
                }
                if (confidence != null) {
                    trainingLog.setConfidence(confidence);
                }
                if (actualDurationMinutes != null) {
                    trainingLog.setActualDurationMinutes(actualDurationMinutes);
                }
                if (fatigueLevel != null) {
                    trainingLog.setFatigueLevel(fatigueLevel);
                }
                if (sleepHours != null) {
                    trainingLog.setSleepHours(sleepHours);
                }
                if (perceivedDifficultyHolder.get() != null) {
                    trainingLog.setPerceivedDifficulty(perceivedDifficultyHolder.get());
                }
                // Update calories if we have new data
                if (calculatedCalories != null) {
                    trainingLog.setCaloriesBurned(calculatedCalories);
                }
                if ("completed".equals(status)) {
                    trainingLog.setCompletedAt(java.time.ZonedDateTime.now());
                }
            }

            DailyTrainingLog savedLog = dailyTrainingLogRepository.save(trainingLog);
            String adaptationNote = adaptNextWorkoutIfFatigued(userId, dayNumber, savedLog);

            log.debug("✅ [DailyTrainingLogService] Saved DailyTrainingLog: {}", "userId=" + userId +
                    ", trainingPlanId=" + trainingPlanId +
                    ", dayNumber=" + dayNumber +
                    ", challengeId=" + challengeId +
                    ", status=" + status +
                    ", repsCompleted=" + repsCompleted +
                    ", setsCompleted=" + setsCompleted);

            // Convert to DTO to avoid circular reference and deep nesting
            DailyTrainingLogResponse responseDTO = convertToResponseDTO(savedLog, trainingPlan);
            responseDTO.setAdaptationNote(adaptationNote);
            
            return new NotificationResponse(true, 
                    "Daily training log saved successfully", 
                    responseDTO);
        } catch (Exception e) {
            log.error("Unexpected error", e);
            log.warn("❌ [DailyTrainingLogService] Error saving daily training log: {}", e.getMessage());
            return new NotificationResponse(false, 
                    "Error saving daily training log: " + e.getMessage(), 
                    null);
        }
    }

    private String adaptNextWorkoutIfFatigued(Long userId, Integer currentDayNumber, DailyTrainingLog savedLog) {
        Integer fatigue = savedLog.getFatigueLevel();
        // Fatigue is on a 1-5 scale from FE; adapt when Mệt (4) or Kiệt sức (5)
        if (fatigue == null || fatigue < 4 || currentDayNumber == null) {
            return null;
        }

        Optional<PersonalizedPlanDetail> nextOpt = personalizedPlanDetailRepository.findByUser_Id(userId).stream()
                .filter(ppd -> ppd.getDayNumber() != null && ppd.getDayNumber() > currentDayNumber)
                .sorted(java.util.Comparator.comparing(PersonalizedPlanDetail::getDayNumber)
                        .thenComparing(PersonalizedPlanDetail::getId))
                .findFirst();

        if (nextOpt.isEmpty()) {
            return null;
        }

        PersonalizedPlanDetail next = nextOpt.get();
        Exercise currentExercise = next.getExercise();
        String type = currentExercise != null && currentExercise.getExerciseType() != null
                ? currentExercise.getExerciseType().toUpperCase()
                : "";
        String exerciseName = next.getExerciseName() != null ? next.getExerciseName() : "bài tập tiếp theo";

        if (java.util.Set.of("SQUAT", "DEADLIFT", "BURPEE", "JUMP", "HIIT").contains(type)) {
            Optional<Exercise> stretch = exerciseRepository.findByExerciseTypeIgnoreCase("STRETCH").stream().findFirst();
            if (stretch.isEmpty()) {
                stretch = exerciseRepository.findByExerciseTypeIgnoreCase("MOBILITY").stream().findFirst();
            }
            if (stretch.isPresent()) {
                Exercise safer = stretch.get();
                String oldName = exerciseName;
                next.setExercise(safer);
                next.setExerciseName(safer.getExerciseName());
                next.setSets(2);
                next.setReps(8);
                next.setRestTime(safer.getDefaultRestSeconds() != null ? safer.getDefaultRestSeconds() : 45);
                next.setDifficulty(safer.getDifficultyLevel() != null ? safer.getDifficultyLevel().name() : "EASY");
                next.setTargetMuscle(safer.getPrimaryMuscle() != null ? safer.getPrimaryMuscle() : "Mobility");
                personalizedPlanDetailRepository.save(next);
                return "AI đã đổi \"" + oldName + "\" → \"" + safer.getExerciseName() + "\" (2 hiệp × 8 reps) để bạn hồi phục tốt hơn.";
            }
        }

        int oldSets = next.getSets() != null ? next.getSets() : 3;
        int oldReps = next.getReps() != null ? next.getReps() : 10;
        int newSets = Math.max(1, oldSets - 1);
        int newReps = Math.max(5, (int) Math.round(oldReps * 0.8));
        int newRest = Math.min(180, (next.getRestTime() != null ? next.getRestTime() : 60) + 30);
        next.setSets(newSets);
        next.setReps(newReps);
        next.setRestTime(newRest);
        personalizedPlanDetailRepository.save(next);
        return "AI đã giảm \"" + exerciseName + "\": " + oldSets + " → " + newSets + " hiệp, " + oldReps + " → " + newReps + " reps, nghỉ thêm 30s để bạn hồi phục.";
    }

    /**
     * Convert DailyTrainingLog entity to response DTO (simple version without template)
     * This avoids circular reference and deep nesting issues
     */
    private DailyTrainingLogResponse convertToResponseDTO(DailyTrainingLog log, TrainingPlan trainingPlan) {
        DailyTrainingLogResponse response = new DailyTrainingLogResponse();
        
        response.setDtlId(log.getDtlId());
        response.setUserId(log.getUser() != null ? log.getUser().getId() : null);
        response.setTrainingPlanId(log.getTrainingPlan() != null ? log.getTrainingPlan().getTpId() : null);
        response.setTrainingPlanTitle(trainingPlan != null ? trainingPlan.getTitle() : null);
        response.setTrainingDate(log.getTrainingDate());
        response.setDayNumber(log.getDayNumber());
        
        if (log.getExercise() != null) {
            response.setChallengeId(log.getExercise().getId());
            response.setExerciseId(log.getExercise().getId());
            response.setChallengeName(log.getExercise().getExerciseName());
            response.setChallengeTitle(log.getExercise().getExerciseName());
            response.setChallengeDescription(log.getExercise().getDescription());
            response.setDifficulty(log.getExercise().getDifficultyLevel() != null ? log.getExercise().getDifficultyLevel().name() : null);
            response.setVideoUrl(log.getExercise().getVideoUrl());
            response.setExerciseType(log.getExercise().getExerciseType());
        }
        
        // Status and progress
        response.setStatus(log.getStatus().name());
        response.setActualDurationMinutes(log.getActualDurationMinutes());
        response.setCaloriesBurned(log.getCaloriesBurned());
        response.setSetsCompleted(log.getSetsCompleted());
        response.setRepsCompleted(log.getRepsCompleted());
        
        // AI evaluation
        response.setScore(log.getScore());
        response.setConfidence(log.getConfidence());
        
        // User notes
        response.setNotes(log.getNotes());
        response.setPerceivedDifficulty(log.getPerceivedDifficulty());
        response.setEffortLevel(log.getEffortLevel());
        response.setFatigueLevel(log.getFatigueLevel());
        response.setSleepHours(log.getSleepHours());
        
        // Timestamps
        response.setStartedAt(log.getStartedAt());
        response.setCompletedAt(log.getCompletedAt());
        response.setCreatedAt(log.getCreatedAt());
        response.setUpdatedAt(log.getUpdatedAt());
        
        return response;
    }

    /**
     * Map DailyTrainingLog entity to response DTO, combining with template data
     */
    private DailyTrainingLogResponse mapToResponse(DailyTrainingLog log, Map<String, TrainingPlanDetail> templateMap, TrainingPlan trainingPlan) {
        DailyTrainingLogResponse response = new DailyTrainingLogResponse();
        
        response.setDtlId(log.getDtlId());
        response.setUserId(log.getUser().getId());
        response.setTrainingPlanId(log.getTrainingPlan().getTpId());
        response.setTrainingPlanTitle(trainingPlan.getTitle());
        response.setTrainingDate(log.getTrainingDate());
        response.setDayNumber(log.getDayNumber());
        
        if (log.getExercise() != null) {
            response.setChallengeId(log.getExercise().getId());
            response.setExerciseId(log.getExercise().getId());
            response.setChallengeName(log.getExercise().getExerciseName());
            response.setChallengeTitle(log.getExercise().getExerciseName());
            response.setChallengeDescription(log.getExercise().getDescription());
            response.setDifficulty(log.getExercise().getDifficultyLevel() != null ? log.getExercise().getDifficultyLevel().name() : null);
            response.setVideoUrl(log.getExercise().getVideoUrl());
            response.setExerciseType(log.getExercise().getExerciseType());
        }
        
        // Get target sets/reps from template
        String key = log.getDayNumber() + "_" + (log.getExercise() != null ? log.getExercise().getId() : "");
        TrainingPlanDetail template = templateMap.get(key);
        if (template != null) {
            response.setTargetSets(template.getSets());
            response.setTargetReps(template.getReps());
        }
        
        // Status and progress
        response.setStatus(log.getStatus().name());
        response.setActualDurationMinutes(log.getActualDurationMinutes());
        response.setCaloriesBurned(log.getCaloriesBurned());
        response.setSetsCompleted(log.getSetsCompleted());
        response.setRepsCompleted(log.getRepsCompleted());
        
        // AI evaluation
        response.setScore(log.getScore());
        response.setConfidence(log.getConfidence());
        
        // User notes
        response.setNotes(log.getNotes());
        response.setPerceivedDifficulty(log.getPerceivedDifficulty());
        response.setEffortLevel(log.getEffortLevel());
        response.setFatigueLevel(log.getFatigueLevel());
        response.setSleepHours(log.getSleepHours());
        
        // Timestamps
        response.setStartedAt(log.getStartedAt());
        response.setCompletedAt(log.getCompletedAt());
        response.setCreatedAt(log.getCreatedAt());
        response.setUpdatedAt(log.getUpdatedAt());
        
        return response;
    }

    /**
     * Create response from template (for not_started challenges)
     */
    private DailyTrainingLogResponse createResponseFromTemplate(TrainingPlanDetail template, TrainingPlan trainingPlan) {
        DailyTrainingLogResponse response = new DailyTrainingLogResponse();
        
        response.setDtlId(null); // Not created yet
        response.setTrainingPlanId(trainingPlan.getTpId());
        response.setTrainingPlanTitle(trainingPlan.getTitle());
        response.setDayNumber(template.getDayNumber());
        response.setTrainingDate(LocalDate.now());
        
        if (template.getExercise() != null) {
            response.setChallengeId(template.getExercise().getId());
            response.setExerciseId(template.getExercise().getId());
            response.setChallengeName(template.getExercise().getExerciseName());
            response.setChallengeTitle(template.getExercise().getExerciseName());
            response.setChallengeDescription(template.getExercise().getDescription());
            response.setDifficulty(template.getExercise().getDifficultyLevel() != null ? template.getExercise().getDifficultyLevel().name() : null);
            response.setVideoUrl(template.getExercise().getVideoUrl());
            response.setExerciseType(template.getExercise().getExerciseType());
        }
        
        // Target from template
        response.setTargetSets(template.getSets());
        response.setTargetReps(template.getReps());
        
        // Default status
        response.setStatus("not_started");
        
        return response;
    }
}
