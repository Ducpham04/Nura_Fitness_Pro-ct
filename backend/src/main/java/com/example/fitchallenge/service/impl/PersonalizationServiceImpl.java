package com.example.fitchallenge.service.impl;

import com.example.fitchallenge.DTO.PersonalizedPlanDetailDTO.PersonalizedPlanDetailResponse;
import com.example.fitchallenge.DTO.PersonalizedPlanDetailDTO.PersonalizedWorkoutSessionResponse;
import com.example.fitchallenge.Entity.*;
import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.repository.*;
import com.example.fitchallenge.service.PersonalizationService;
import com.example.fitchallenge.utils.CaloriesCalculator;
import com.example.fitchallenge.utils.GoalMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PersonalizationServiceImpl implements PersonalizationService {

    private final PersonalizedPlanDetailRepository personalizedPlanDetailRepository;
    private final UserTrainingRepository userTrainingRepository;
    private final TrainingPlanDetailRepository trainingPlanDetailRepository;
    private final HealthProfileRepository healthProfileRepository;
    private final UserBodyProfileRepository userBodyProfileRepository;
    private final ExerciseRepository exerciseRepository;
    private final UserTrainingSessionRepository userTrainingSessionRepository;
    private final ProgramTemplateRepository programTemplateRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Tạo PersonalizedPlanDetail cho user khi bắt đầu training plan
     * Dựa trên Health Profile để chọn template phù hợp và cá nhân hóa
     * 
     * Sử dụng REQUIRES_NEW để tách transaction riêng, tránh rollback transaction cha
     * Không throw exception để tránh "Transaction silently rolled back" warning
     */
    @Override
    @Transactional(propagation = Propagation.REQUIRED)
    public NotificationResponse createPersonalizedPlanDetails(Long utId) {
        try {
            log.debug("{}", "🔄 [PersonalizationService] Creating personalized plan details for utId: " + utId);
            
            UserTraining userTraining = userTrainingRepository.findById(utId)
                    .orElseThrow(() -> {
                        log.debug("{}", "❌ [PersonalizationService] UserTraining not found: " + utId);
                        return new RuntimeException("UserTraining not found with id: " + utId);
                    });

            User user = userTraining.getUser();
            Long userId = user.getId();
            log.debug("{}", "✅ [PersonalizationService] Found UserTraining, userId: " + userId);

            HealthProfile healthProfile = healthProfileRepository.findByUser_Id(userId)
                    .orElseThrow(() -> new IllegalStateException("Health profile is required before generating workout plan"));
            UserBodyProfile bodyProfile = userBodyProfileRepository.findByUser_Id(userId)
                    .orElseThrow(() -> new IllegalStateException("Body profile is required before generating workout plan"));
            log.debug("{}", "✅ [PersonalizationService] Found Health Profile and Body Profile for userId: " + userId);

            // Get all training plan details from template
            Long trainingPlanId = userTraining.getTrainingPlan().getTpId();
            log.debug("{}", "📋 [PersonalizationService] Loading template details for trainingPlanId: " + trainingPlanId);
            
            List<TrainingPlanDetail> templateDetails = trainingPlanDetailRepository
                    .findByTrainingPlan_TpId(trainingPlanId);

            if (templateDetails.isEmpty()) {
                log.debug("{}", "⚠️ [PersonalizationService] No template details found for trainingPlanId: " + trainingPlanId);
                return new NotificationResponse(false, 
                        "Training plan has no exercises. Please contact admin to add exercises.");
            }

            log.debug("✅ [PersonalizationService] Found {}", templateDetails.size() + " template details");

            // Resolve goal: ƯU TIÊN ProgramTemplate.goal (đúng cho program HIỆN TẠI, format AI)
            // → fallback healthProfile.primaryGoal (cho plan admin không có template) → "maintenance".
            // ProgramTemplate.goal là nguồn chuẩn vì template được sinh CHO mục tiêu đó;
            // primaryGoal có thể stale/khác format. Cuối cùng chuẩn hoá qua GoalMapper.
            String planGoal = programTemplateRepository
                    .findTopByUserTrainingIdAndStatusOrderByVersionNumberDesc(utId, "ACTIVE")
                    .map(ProgramTemplate::getGoal)
                    .filter(g -> g != null && !g.isBlank())
                    .orElseGet(() -> (healthProfile.getPrimaryGoal() != null && !healthProfile.getPrimaryGoal().isBlank())
                            ? healthProfile.getPrimaryGoal() : "maintenance");
            final String resolvedGoal = GoalMapper.toAiGoal(planGoal);

            List<PersonalizedPlanDetail> personalizedDetails = new ArrayList<>();
            List<Exercise> safeExercisePool = findSafeExercisePool(healthProfile);

            int successCount = 0;
            int errorCount = 0;
            // Track used exercise IDs per day to prevent duplicates within the same session
            Map<Integer, Set<Long>> usedExerciseIdsByDay = new HashMap<>();

            for (TrainingPlanDetail template : templateDetails) {
                try {
                    int dayNumber = template.getDayNumber() != null ? template.getDayNumber() : 0;
                    Set<Long> usedIds = usedExerciseIdsByDay.computeIfAbsent(dayNumber, k -> new HashSet<>());
                    Exercise selectedExercise = resolveSafeExercise(template.getExercise(), safeExercisePool, healthProfile, usedIds);
                    if (selectedExercise == null) {
                        log.debug("{}", "🛡️ [PersonalizationService] Skipping unsafe/unavailable exercise: "
                                + (template.getExercise() != null ? template.getExercise().getExerciseName() : "null"));
                        continue;
                    }
                    usedIds.add(selectedExercise.getId());
                    log.debug("🔄 [PersonalizationService] Processing template tpdId: {}", template.getTpdId() + ", day: " + template.getDayNumber());
                    PersonalizedPlanDetail personalized = createPersonalizedDetail(
                            user,
                            template,
                            selectedExercise,
                            healthProfile,
                            bodyProfile,
                            utId, // UserTraining ID
                            resolvedGoal
                    );
                    personalizedDetails.add(personalized);
                    successCount++;
                    log.debug("✅ [PersonalizationService] Created personalized detail for day {}", template.getDayNumber() + " (success: " + successCount + ", errors: " + errorCount + ")");
                } catch (Exception e) {
                    errorCount++;
                    log.warn("❌ [PersonalizationService] Error creating personalized detail for template tpdId: {}", template.getTpdId());
                    log.warn("❌ [PersonalizationService] Day: {}", template.getDayNumber());
                    log.warn("❌ [PersonalizationService] Error: {}", e.getMessage());
                    log.warn("❌ [PersonalizationService] Error class: {}", e.getClass().getName());
                    log.error("Unexpected error", e);
                    // Continue with other templates instead of failing entire operation
                }
            }
            
            log.debug("📊 [PersonalizationService] Summary: {}", successCount + " successful, " + errorCount + " errors out of " + templateDetails.size() + " templates");

            if (personalizedDetails.isEmpty()) {
                log.debug("⚠️ [PersonalizationService] No personalized details created");
                return new NotificationResponse(false, 
                        "Could not create any personalized details. Please check template and health profile.");
            }

            log.debug("💾 [PersonalizationService] Saving {}", personalizedDetails.size() + " personalized details");
            
            // Delete existing personalized details for this user and training plan first
            // Để tránh duplicate khi regenerate
            try {
                List<PersonalizedPlanDetail> existingDetails = personalizedPlanDetailRepository.findByUser_Id(userId);
                if (!existingDetails.isEmpty()) {
                    List<PersonalizedPlanDetail> toDelete = existingDetails.stream()
                            .filter(ppd -> utId.equals(ppd.getUtId()))
                            .collect(java.util.stream.Collectors.toList());
                    
                    if (!toDelete.isEmpty()) {
                        log.debug("🗑️ [PersonalizationService] Deleting {}", toDelete.size() + " existing personalized details");
                        personalizedPlanDetailRepository.deleteAll(toDelete);
                        entityManager.flush();
                    }
                }
            } catch (Exception deleteEx) {
                log.warn("⚠️ [PersonalizationService] Error deleting existing details (continuing anyway): {}", deleteEx.getMessage());
                deleteEx.printStackTrace();
                // Continue even if delete fails - không throw để tránh rollback
            }
            
            // Save all personalized details
            List<PersonalizedPlanDetail> savedDetails;
            try {
                savedDetails = personalizedPlanDetailRepository.saveAll(personalizedDetails);
                // Flush to ensure data is persisted immediately
                entityManager.flush();
                log.debug("✅ [PersonalizationService] Successfully saved {}", savedDetails.size() + " personalized details");
            } catch (Exception saveEx) {
                log.warn("❌ [PersonalizationService] Error saving personalized details: {}", saveEx.getMessage());
                saveEx.printStackTrace();
                // Return error response thay vì throw để tránh "Transaction silently rolled back"
                // Transaction sẽ tự rollback khi method kết thúc (vì có exception trong transaction)
                // Nhưng ta return response thay vì throw để Spring không log warning
                return new NotificationResponse(false, 
                        "Failed to save personalized details: " + saveEx.getMessage());
            }
            
            // Verify saved records for this user
            try {
                Long userSavedCount = (long) personalizedPlanDetailRepository.findByUser_Id(userId).size();
                log.debug("{}", "📊 [PersonalizationService] Total personalized details for userId " + userId + ": " + userSavedCount);
            } catch (Exception verifyEx) {
                log.warn("⚠️ [PersonalizationService] Error verifying saved records (non-critical): {}", verifyEx.getMessage());
                // Non-critical, continue
            }

            return new NotificationResponse(true, 
                    "Personalized plan details created successfully", 
                    personalizedDetails.size());
        } catch (Exception e) {
            log.warn("❌ [PersonalizationService] Error creating personalized plan: {}", e.getMessage());
            log.warn("❌ [PersonalizationService] Error class: {}", e.getClass().getName());
            log.error("Unexpected error", e);
            
            // Return error response thay vì throw để tránh "Transaction silently rolled back"
            // Transaction sẽ tự rollback khi method kết thúc (vì có exception trong transaction)
            // Nhưng ta return response thay vì throw để Spring không log warning
            return new NotificationResponse(false, 
                    "Error creating personalized plan: " + e.getMessage());
        }
    }

    /**
     * Lấy danh sách bài tập đã cá nhân hóa cho một ngày cụ thể
     * Video URL và metadata lấy từ Exercise master data
     */
    @Override
    @Transactional(readOnly = true)
    public NotificationResponse getPersonalizedDayDetails(Long utId, Integer dayNumber) {
        try {
            UserTraining userTraining = userTrainingRepository.findById(utId)
                    .orElseThrow(() -> new RuntimeException("UserTraining not found"));
            
            Long userId = userTraining.getUser().getId();
            
            List<PersonalizedPlanDetail> personalizedDetails = 
                    personalizedPlanDetailRepository.findByUser_IdAndDayNumber(userId, dayNumber);

            List<PersonalizedPlanDetailResponse> responses = personalizedDetails.stream()
                    .map(this::toResponse)
                    .collect(Collectors.toList());

            return new NotificationResponse(true, 
                    "Personalized day details retrieved successfully", 
                    responses);
        } catch (Exception e) {
            log.error("Unexpected error", e);
            return new NotificationResponse(false, 
                    "Error retrieving personalized details: " + e.getMessage());
        }
    }

    /**
     * Lấy bài tập cá nhân hóa cho hôm nay (theo userId)
     * GET /personalized/today?userId=123
     */
    @Transactional(readOnly = true)
    public NotificationResponse getTodayPersonalizedWorkout(Long userId, Integer dayNumber) {
        try {
            Optional<UserTraining> activeTraining = userTrainingRepository
                    .findTopByUser_IdAndStatusOrderByUtIdDesc(userId, "active");

            if (activeTraining.isPresent()) {
                Long utId = activeTraining.get().getUtId();
                Optional<UserTrainingSession> sessionOpt = userTrainingSessionRepository.findByUtIdAndDayNumber(utId, dayNumber);
                if (sessionOpt.isPresent()) {
                    List<PersonalizedPlanDetail> personalizedDetails =
                            personalizedPlanDetailRepository.findByUser_IdAndUtIdAndDayNumberOrderByIdAsc(userId, utId, dayNumber);
                    PersonalizedWorkoutSessionResponse response = toWorkoutSessionResponse(sessionOpt.get(), personalizedDetails);
                    return new NotificationResponse(true,
                            "Today's personalized workout retrieved successfully",
                            response);
                }
            }

            List<PersonalizedPlanDetail> personalizedDetails =
                    personalizedPlanDetailRepository.findByUser_IdAndDayNumber(userId, dayNumber);

            List<PersonalizedPlanDetailResponse> responses = personalizedDetails.stream()
                    .map(this::toResponse)
                    .collect(Collectors.toList());

            return new NotificationResponse(true, 
                    "Today's personalized workout retrieved successfully", 
                    responses);
        } catch (Exception e) {
            log.error("Unexpected error", e);
            return new NotificationResponse(false, 
                    "Error retrieving today's workout: " + e.getMessage());
        }
    }

    private PersonalizedWorkoutSessionResponse toWorkoutSessionResponse(
            UserTrainingSession session,
            List<PersonalizedPlanDetail> personalizedDetails) {

        PersonalizedWorkoutSessionResponse response = new PersonalizedWorkoutSessionResponse();
        response.setDayNumber(session.getDayNumber());
        response.setSessionType(session.getSessionType());
        response.setIsRestDay(Boolean.TRUE.equals(session.getRestDay()));
        response.setDurationMinutes(session.getDurationMinutes());
        response.setEstimatedCaloriesBurned(session.getEstimatedCaloriesBurned());
        response.setMuscleGroupsTargeted(readStringList(session.getMuscleGroupsTargeted()));
        response.setWarmup(readStringList(session.getWarmup()));
        response.setCooldown(readStringList(session.getCooldown()));
        response.setNotes(readStringList(session.getNotes()));
        response.setCardio(readJsonObject(session.getCardio()));
        response.setExercises(personalizedDetails.stream()
                .map(this::toResponse)
                .collect(Collectors.toList()));
        return response;
    }

    private List<String> readStringList(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception ignored) {
            return List.of(json);
        }
    }

    private Object readJsonObject(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ignored) {
            return json;
        }
    }

    /**
     * Thuật toán cá nhân hóa dựa trên Health Profile
     * healthProfile có thể null nếu user chưa có Health Profile
     */
    private PersonalizedPlanDetail createPersonalizedDetail(
            User user,
            TrainingPlanDetail template,
            Exercise exercise,
            HealthProfile healthProfile,
            UserBodyProfile bodyProfile,
            Long utId,
            String resolvedGoal) {

        if (exercise == null) {
            log.warn("❌ [PersonalizationService] Exercise is null for template tpdId: {}", template.getTpdId());
            throw new RuntimeException("Exercise not found in template tpdId: " + template.getTpdId());
        }
        
        log.debug("📝 [PersonalizationService] Creating personalized detail for exercise: {}", exercise.getExerciseName());

        ExercisePrescription prescription = prescribeExercise(template, exercise, healthProfile);
        Integer personalizedSets = prescription.sets();
        Integer personalizedReps = prescription.reps();
        Integer personalizedRestTime = prescription.restSeconds();

        // Get exercise name from Exercise master data
        String exerciseName = exercise.getExerciseName() != null ? exercise.getExerciseName() : "Exercise";

        // Get difficulty from Exercise master data
        String difficulty = exercise.getDifficultyLevel() != null 
                ? exercise.getDifficultyLevel().name() 
                : "MEDIUM";

        // Determine target muscle (có thể lấy từ challenge description hoặc mặc định)
        String targetMuscle = determineTargetMuscle(exercise, exerciseName);
        
        // Validate all required fields
        if (user == null) {
            throw new RuntimeException("User cannot be null");
        }
        if (template.getDayNumber() == null) {
            throw new RuntimeException("Day number cannot be null");
        }
        if (exercise == null) {
            throw new RuntimeException("Exercise cannot be null");
        }
        if (exerciseName == null || exerciseName.trim().isEmpty()) {
            exerciseName = "Exercise"; // Default value
        }
        if (personalizedSets == null || personalizedSets <= 0) {
            throw new RuntimeException("Medical prescription produced invalid sets for exerciseId=" + exercise.getId());
        }
        if (personalizedReps == null || personalizedReps <= 0) {
            throw new RuntimeException("Medical prescription produced invalid reps for exerciseId=" + exercise.getId());
        }
        if (personalizedRestTime == null || personalizedRestTime <= 0) {
            throw new RuntimeException("Medical prescription produced invalid rest time for exerciseId=" + exercise.getId());
        }
        if (difficulty == null || difficulty.trim().isEmpty()) {
            difficulty = "MEDIUM"; // Default value
        }
        if (targetMuscle == null || targetMuscle.trim().isEmpty()) {
            targetMuscle = "Full Body"; // Default value
        }
        
        BigDecimal userWeightKg = bodyProfile != null ? bodyProfile.getWeight() : null;

        // Duration based on actual sets, reps, and rest time
        int estimatedDurationMinutes = CaloriesCalculator.estimateDurationMinutes(
                personalizedSets, personalizedReps, personalizedRestTime);

        // Calculate estimated calories using exercise name for accurate MET lookup
        Integer estimatedCalories = CaloriesCalculator.calculateCalories(
                exercise.getExerciseType(),
                exercise.getExerciseName(),
                estimatedDurationMinutes,
                userWeightKg
        );

        log.debug("🔨 [PersonalizationService] Building PersonalizedPlanDetail: day={}", template.getDayNumber() + 
                ", exercise=" + exerciseName + ", sets=" + personalizedSets + ", reps=" + personalizedReps +
                ", estimatedCalories=" + estimatedCalories);

        // 1. Try to extract notes + recommendedWeight from instructions JSON (set by WorkoutDailyPlanGenerator)
        String recommendedWeight = null;
        String rawInstructions = template.getInstructions();
        String notes = null;
        if (rawInstructions != null && rawInstructions.startsWith("{")) {
            try {
                @SuppressWarnings("unchecked")
                java.util.Map<String, Object> instrMap = objectMapper.readValue(rawInstructions,
                        new com.fasterxml.jackson.core.type.TypeReference<java.util.Map<String, Object>>() {});
                Object wt = instrMap.get("recommended_weight");
                if (wt != null && !wt.toString().isBlank()) recommendedWeight = wt.toString();
                Object notesObj = instrMap.get("notes");
                if (notesObj != null && !notesObj.toString().isBlank()) notes = notesObj.toString();
            } catch (Exception ignored) {}
        }

        // 2. If no notes from instructions, build them here from available exercise + goal data
        if (notes == null || notes.isBlank() || notes.startsWith("Generated by backend")) {
            double bw = userWeightKg != null ? userWeightKg.doubleValue() : 70.0;
            notes = buildExerciseNote(exercise, targetMuscle, resolvedGoal);
            if (recommendedWeight == null) {
                recommendedWeight = computeWeightRecommendation(exercise, bw, resolvedGoal);
            }
        }

        PersonalizedPlanDetail result = PersonalizedPlanDetail.builder()
                .tpdId(template.getTpdId()) // ⚠️ QUAN TRỌNG: Set tpdId để reference đến template gốc
                .utId(utId) // ⚠️ QUAN TRỌNG: Set utId để reference đến UserTraining
                .user(user)
                .dayNumber(template.getDayNumber())
                .exercise(exercise)
                .exerciseName(exerciseName)
                .sets(personalizedSets)
                .reps(personalizedReps)
                .restTime(personalizedRestTime)
                .difficulty(difficulty)
                .targetMuscle(targetMuscle)
                .estimatedCalories(estimatedCalories) // ✅ Calculate and save estimated calories
                .notes(notes)
                .recommendedWeight(recommendedWeight)
                .build();
        
        log.debug("🔗 [PersonalizationService] Linked to template tpdId: {}", template.getTpdId() + ", utId: " + utId);
        
        log.debug("✅ [PersonalizationService] PersonalizedPlanDetail built successfully");
        return result;
    }

    private ExercisePrescription prescribeExercise(
            TrainingPlanDetail template,
            Exercise exercise,
            HealthProfile healthProfile
    ) {
        int baseSets = firstPositive(template.getSets(), exercise.getDefaultSets(),
                "sets", exercise.getId(), template.getTpdId());
        int baseReps = firstPositive(template.getReps(), exercise.getDefaultReps(),
                "reps", exercise.getId(), template.getTpdId());
        int baseRest = firstPositive(template.getRestTime(), exercise.getDefaultRestSeconds(),
                "rest seconds", exercise.getId(), template.getTpdId());

        String type = normalize(exercise.getExerciseType());
        String pattern = normalize(exercise.getMovementPattern());
        String difficulty = exercise.getDifficultyLevel() != null ? exercise.getDifficultyLevel().name() : "MEDIUM";
        boolean mobility = type.equals("stretch") || type.equals("mobility") || pattern.equals("mobility");
        boolean highLoad = Boolean.TRUE.equals(exercise.getSpinalLoading())
                || Boolean.TRUE.equals(exercise.getHighImpact())
                || Boolean.TRUE.equals(exercise.getKneeDominant())
                || Boolean.TRUE.equals(exercise.getShoulderOverhead());

        double volumeFactor = readinessVolumeFactor(healthProfile);
        if ("HARD".equalsIgnoreCase(difficulty)) {
            volumeFactor *= 0.90;
        }
        if (highLoad) {
            volumeFactor *= 0.85;
        }
        if (mobility) {
            volumeFactor = Math.max(volumeFactor, 0.90);
        }

        int sets = clamp((int) Math.round(baseSets * volumeFactor), mobility ? 1 : 1, mobility ? 3 : 5);
        int reps = clamp((int) Math.round(baseReps * volumeFactor), mobility ? 5 : 3, mobility ? 15 : 20);
        int rest = prescribeRestSeconds(baseRest, exercise, healthProfile, mobility, highLoad);

        log.debug("{}", "📊 [PersonalizationService] Medical prescription:"
                + " exerciseId=" + exercise.getId()
                + ", baseSets=" + baseSets + " -> " + sets
                + ", baseReps=" + baseReps + " -> " + reps
                + ", baseRest=" + baseRest + " -> " + rest
                + ", volumeFactor=" + String.format("%.2f", volumeFactor));

        return new ExercisePrescription(sets, reps, rest);
    }

    private int firstPositive(Integer templateValue, Integer exerciseValue, String field, Long exerciseId, Long templateId) {
        if (templateValue != null && templateValue > 0) {
            return templateValue;
        }
        if (exerciseValue != null && exerciseValue > 0) {
            return exerciseValue;
        }
        throw new IllegalStateException("Missing medically valid " + field
                + " for exerciseId=" + exerciseId + ", templateDetailId=" + templateId);
    }

    private double readinessVolumeFactor(HealthProfile healthProfile) {
        double factor = 1.0;

        String activity = normalize(healthProfile.getDailyActivityLevel());
        if (activity.equals("sedentary")) {
            factor *= 0.75;
        } else if (activity.equals("lightly_active")) {
            factor *= 0.85;
        } else if (activity.equals("very_active")) {
            factor *= 1.05;
        } else if (activity.equals("extra_active")) {
            factor *= 1.10;
        }

        Integer frequency = healthProfile.getWorkoutFrequencyPerWeek();
        if (frequency != null) {
            if (frequency <= 1) {
                factor *= 0.80;
            } else if (frequency >= 5) {
                factor *= 1.05;
            }
        }

        Integer sleep = healthProfile.getSleepHoursPerDay();
        if (sleep != null && sleep < 6) {
            factor *= 0.80;
        }

        String stress = normalize(healthProfile.getStressLevel());
        if (stress.equals("high")) {
            factor *= 0.85;
        }

        BigDecimal bmi = healthProfile.getBmi();
        if (bmi != null) {
            double bmiValue = bmi.doubleValue();
            if (bmiValue >= 30.0) {
                factor *= 0.85;
            } else if (bmiValue < 18.5) {
                factor *= 0.90;
            }
        }

        return Math.max(0.50, Math.min(1.15, factor));
    }

    private int prescribeRestSeconds(
            int baseRest,
            Exercise exercise,
            HealthProfile healthProfile,
            boolean mobility,
            boolean highLoad
    ) {
        int rest = baseRest;
        if (mobility) {
            rest = Math.max(30, rest);
        }
        if (highLoad) {
            rest += 30;
        }
        if (Boolean.TRUE.equals(exercise.getWristLoading()) || Boolean.TRUE.equals(exercise.getShoulderOverhead())) {
            rest += 15;
        }
        Integer sleep = healthProfile.getSleepHoursPerDay();
        if (sleep != null && sleep < 6) {
            rest += 30;
        }
        if (normalize(healthProfile.getStressLevel()).equals("high")) {
            rest += 15;
        }
        if (normalize(healthProfile.getDailyActivityLevel()).equals("sedentary")) {
            rest += 15;
        }
        return clamp(roundToNearest(rest, 15), mobility ? 30 : 45, mobility ? 120 : 180);
    }

    private int roundToNearest(int value, int step) {
        return (int) Math.round(value / (double) step) * step;
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private record ExercisePrescription(int sets, int reps, int restSeconds) {
    }

    private boolean isExerciseAllowed(Exercise exercise, HealthProfile healthProfile) {
        if (exercise == null) return false;
        if (healthProfile == null) return true;

        String injuries = normalize(healthProfile.getCurrentInjuries());
        // ── Equipment check: use parsed list, NOT raw string ─────────────────────
        // Raw string check like "gym".contains("dumbbell") = false → wrongly blocks gym exercises.
        List<String> allowedEquipment = parseEquipment(healthProfile.getAvailableEquipment());
        String requiredEquipment = normalize(exercise.getRequiredEquipment());

        if (!requiredEquipment.isBlank()) {
            boolean isBodyweight = "bodyweight".equals(requiredEquipment);
            // Bài bodyweight LUÔN được phép — ai cũng có cơ thể, không cần dụng cụ.
            // Chỉ chặn bài cần dụng cụ mà user KHÔNG có.
            if (!isBodyweight && !allowedEquipment.contains(requiredEquipment)) {
                return false;
            }
        }

        if ((injuries.contains("back") || injuries.contains("spine")
                || injuries.contains("lumbar") || injuries.contains("disc")
                || injuries.contains("thoat vi") || injuries.contains("cot song"))
                && Boolean.TRUE.equals(exercise.getSpinalLoading())) {
            return false;
        }
        if ((injuries.contains("knee") || injuries.contains("goi"))
                && (Boolean.TRUE.equals(exercise.getKneeDominant()) || Boolean.TRUE.equals(exercise.getHighImpact()))) {
            return false;
        }
        if ((injuries.contains("shoulder") || injuries.contains("vai"))
                && Boolean.TRUE.equals(exercise.getShoulderOverhead())) {
            return false;
        }
        if ((injuries.contains("wrist") || injuries.contains("co tay"))
                && Boolean.TRUE.equals(exercise.getWristLoading())) {
            return false;
        }

        String contraindications = normalize(exercise.getContraindicatedInjuries());
        return contraindications.isBlank()
                || injuries.isBlank()
                || !java.util.Arrays.stream(injuries.split("[,;]"))
                        .map(String::trim)
                        .filter(s -> !s.isBlank())
                        .anyMatch(contraindications::contains);
    }

    private List<Exercise> findSafeExercisePool(HealthProfile healthProfile) {
        List<String> equipment = parseEquipment(healthProfile.getAvailableEquipment());
        String injuries = normalize(healthProfile.getCurrentInjuries());
        boolean spineRisk   = injuries.contains("back")     || injuries.contains("spine")
                           || injuries.contains("lumbar")   || injuries.contains("disc")
                           || injuries.contains("thoat vi") || injuries.contains("cot song");
        boolean kneeRisk    = injuries.contains("knee")     || injuries.contains("goi");
        boolean shoulderRisk= injuries.contains("shoulder") || injuries.contains("vai");
        boolean wristRisk   = injuries.contains("wrist")    || injuries.contains("co tay");

        // When parseEquipment returns empty (should never happen now), pass null = no filter
        List<String> lowerEquipment = equipment.stream().map(String::toLowerCase).distinct().toList();
        List<Exercise> safe = exerciseRepository.findSafeExercises(
                lowerEquipment.isEmpty() ? null : lowerEquipment,
                spineRisk, kneeRisk, shoulderRisk, kneeRisk, wristRisk
        );

        List<Exercise> filtered = safe.stream()
                .filter(exercise -> isExerciseAllowed(exercise, healthProfile))
                .collect(Collectors.toList());

        // ── Sort: gym equipment exercises FIRST, bodyweight LAST ────────────────
        // When user has gym access, prefer dumbbell/barbell/machine exercises over
        // bodyweight so that the planner doesn't pick Push Up when Bench Press is available.
        boolean hasGymEquipment = equipment.stream().anyMatch(e ->
                e.equals("dumbbell") || e.equals("dumbbells") || e.equals("barbell")
                || e.equals("machine") || e.equals("cable") || e.equals("pull_up_bar")
                || e.equals("kettlebell"));

        if (hasGymEquipment) {
            filtered.sort((a, b) -> {
                int scoreA = gymEquipmentScore(a.getRequiredEquipment());
                int scoreB = gymEquipmentScore(b.getRequiredEquipment());
                return Integer.compare(scoreB, scoreA); // descending: higher score = gym = first
            });
        }

        return filtered;
    }

    /**
     * Trả về điểm ưu tiên cho thiết bị: thiết bị gym = điểm cao, bodyweight = thấp.
     * Dùng để sort danh sách bài tập khi user có phòng gym.
     */
    private int gymEquipmentScore(String requiredEquipment) {
        if (requiredEquipment == null) return 0;
        String eq = requiredEquipment.toUpperCase();
        if (eq.contains("BARBELL"))         return 10;
        if (eq.contains("DUMBBELL"))        return 9;
        if (eq.contains("MACHINE"))         return 8;
        if (eq.contains("CABLE"))           return 7;
        if (eq.contains("PULL_UP_BAR"))     return 6;
        if (eq.contains("KETTLEBELL"))      return 5;
        if (eq.contains("RESISTANCE_BAND")) return 4;
        if (eq.contains("BENCH"))           return 3;
        if (eq.contains("BODYWEIGHT"))      return 1;
        return 2;
    }

    private Exercise resolveSafeExercise(Exercise requested, List<Exercise> safeExercisePool,
                                         HealthProfile healthProfile, Set<Long> usedIds) {
        if (requested != null && isExerciseAllowed(requested, healthProfile) && !usedIds.contains(requested.getId())) {
            return requested;
        }
        if (safeExercisePool == null || safeExercisePool.isEmpty()) return null;

        // Kiểm tra user có thiết bị gym không để ưu tiên bài gym
        List<String> userEquipment = parseEquipment(healthProfile != null ? healthProfile.getAvailableEquipment() : null);
        boolean preferGym = userEquipment.stream().anyMatch(e ->
                e.equals("dumbbell") || e.equals("dumbbells") || e.equals("barbell")
                || e.equals("machine") || e.equals("cable") || e.equals("pull_up_bar")
                || e.equals("kettlebell"));

        // ── Khi cần thay bài: ƯU TIÊN GIỮ ĐÚNG NHÓM CƠ ──────────────────────────
        // exercise_type không đáng tin (lẫn lộn PUSH_UP / PRESS / STRENGTH...),
        // nên dùng primary_muscle + movement_pattern làm tiêu chí chính.
        String requestedMuscle = requested != null ? normalize(requested.getPrimaryMuscle()) : "";
        String requestedPattern = requested != null ? normalize(requested.getMovementPattern()) : "";
        String requestedType = requested != null ? normalize(requested.getExerciseType()) : "";
        String requestedDifficulty = requested != null && requested.getDifficultyLevel() != null
                ? normalize(requested.getDifficultyLevel().name()) : "";

        // Sắp xếp ứng viên: nếu user có gym → ưu tiên bài dùng dụng cụ gym lên trước
        java.util.function.Function<List<Exercise>, Optional<Exercise>> pickPreferGym = candidates -> {
            if (candidates.isEmpty()) return Optional.empty();
            if (!preferGym) return Optional.of(candidates.get(0));
            return candidates.stream()
                    .filter(e -> e.getRequiredEquipment() != null
                            && !e.getRequiredEquipment().toUpperCase().equals("BODYWEIGHT"))
                    .findFirst()
                    .or(() -> Optional.of(candidates.get(0)));
        };

        // 1. Cùng NHÓM CƠ chính + cùng độ khó
        if (!requestedMuscle.isBlank()) {
            List<Exercise> sameMuscleSameDiff = safeExercisePool.stream()
                    .filter(e -> !usedIds.contains(e.getId()))
                    .filter(e -> requestedMuscle.equals(normalize(e.getPrimaryMuscle())))
                    .filter(e -> requestedDifficulty.isBlank() || e.getDifficultyLevel() == null
                            || requestedDifficulty.equals(normalize(e.getDifficultyLevel().name())))
                    .collect(Collectors.toList());
            Optional<Exercise> r = pickPreferGym.apply(sameMuscleSameDiff);
            if (r.isPresent()) return r.get();

            // 2. Cùng nhóm cơ, bất kỳ độ khó
            List<Exercise> sameMuscle = safeExercisePool.stream()
                    .filter(e -> !usedIds.contains(e.getId()))
                    .filter(e -> requestedMuscle.equals(normalize(e.getPrimaryMuscle())))
                    .collect(Collectors.toList());
            r = pickPreferGym.apply(sameMuscle);
            if (r.isPresent()) return r.get();
        }

        // 3. Cùng MOVEMENT PATTERN (vd horizontal_push, hip_hinge...)
        if (!requestedPattern.isBlank()) {
            List<Exercise> samePattern = safeExercisePool.stream()
                    .filter(e -> !usedIds.contains(e.getId()))
                    .filter(e -> requestedPattern.equals(normalize(e.getMovementPattern())))
                    .collect(Collectors.toList());
            Optional<Exercise> r = pickPreferGym.apply(samePattern);
            if (r.isPresent()) return r.get();
        }

        // 4. Cùng exercise_type (legacy, để dự phòng)
        if (!requestedType.isBlank()) {
            List<Exercise> sameType = safeExercisePool.stream()
                    .filter(e -> !usedIds.contains(e.getId()))
                    .filter(e -> requestedType.equals(normalize(e.getExerciseType())))
                    .collect(Collectors.toList());
            Optional<Exercise> r = pickPreferGym.apply(sameType);
            if (r.isPresent()) return r.get();
        }

        // 5. Không tìm được bài cùng nhóm cơ → BỎ QUA bài này (KHÔNG lấy bài random
        //    khác nhóm cơ, vì sẽ làm hỏng cấu trúc buổi tập). Trả null = skip.
        return null;
    }

    /**
     * Chuyển chuỗi thiết bị thô từ HealthProfile → danh sách chuẩn để filter DB.
     *
     * Quy tắc:
     *  - "gym" / "full gym" → TẤT CẢ thiết bị phòng gym (KHÔNG có bodyweight),
     *    vì user phòng gym phải dùng máy/tạ, không phải chống đẩy sàn.
     *  - blank / "none"     → bodyweight only.
     *  - cái khác          → parse từng từ, map sang giá trị DB chuẩn.
     *
     * Danh sách trả về được dùng trực tiếp vào IN filter của SQL (case-insensitive).
     * KHÔNG bao giờ trả về rỗng — luôn có ít nhất "bodyweight" làm fallback.
     */
    private List<String> parseEquipment(String rawEquipment) {
        String normalized = normalize(rawEquipment);

        // ── Full gym: dùng tất cả thiết bị gym, LOẠI bodyweight ────────────────
        if (normalized.contains("full gym") || normalized.contains("full_gym")
                || normalized.equals("gym") || normalized.startsWith("gym ")
                || normalized.endsWith(" gym") || normalized.contains("phong gym")
                || normalized.contains("phong tap")) {
            return List.of("dumbbell", "dumbbells", "barbell", "cable", "machine",
                    "pull_up_bar", "kettlebell", "bench", "ez_bar", "smith_machine");
        }

        // ── Không có thiết bị ────────────────────────────────────────────────
        if (normalized.isBlank() || normalized.equals("none")
                || normalized.equals("bodyweight only") || normalized.equals("bodyweight")
                || normalized.equals("khong can") || normalized.equals("tu trong")) {
            return List.of("bodyweight");
        }

        // ── Parse từng loại thiết bị ─────────────────────────────────────────
        List<String> equipment = new ArrayList<>();

        if (normalized.contains("bodyweight") || normalized.contains("khong ta")
                || normalized.contains("tu trong") || normalized.contains("body weight")) {
            equipment.add("bodyweight");
        }
        if (normalized.contains("dumbbell") || normalized.contains("ta doi")
                || normalized.contains("ta tay") || normalized.contains("ta nang")) {
            equipment.add("dumbbell");
            equipment.add("dumbbells");
        }
        if (normalized.contains("resistance band") || normalized.contains("band")
                || normalized.contains("day khang luc") || normalized.contains("day cao su")) {
            equipment.add("band");
            equipment.add("resistance_band");
        }
        if (normalized.contains("barbell") || normalized.contains("ta don")) {
            equipment.add("barbell");
        }
        if (normalized.contains("pull_up_bar") || normalized.contains("pull up bar")
                || normalized.contains("xa don") || normalized.contains("xa kep")) {
            equipment.add("pull_up_bar");
        }
        if (normalized.contains("cable") || normalized.contains("may cap")) {
            equipment.add("cable");
        }
        if (normalized.contains("machine") || normalized.contains("may tap")) {
            equipment.add("machine");
        }
        if (normalized.contains("kettlebell") || normalized.contains("ta qua ta")) {
            equipment.add("kettlebell");
        }
        if (normalized.contains("bench") || normalized.contains("ghe day")) {
            equipment.add("bench");
        }

        // Fallback nếu không match gì
        if (equipment.isEmpty()) {
            log.warn("[PersonalizationService.parseEquipment] Unrecognised '{}' — fallback bodyweight", rawEquipment);
            return List.of("bodyweight");
        }

        return equipment.stream().distinct().collect(Collectors.toList());
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        String normalized = java.text.Normalizer.normalize(value.trim().toLowerCase(), java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return normalized.replaceAll("\\s+", " ");
    }

    /**
     * Tính số reps cá nhân hóa dựa trên Health Profile
     * Service phân tích và đưa ra số reps phù hợp với user
     */
    private Integer calculatePersonalizedReps(Integer defaultReps, HealthProfile healthProfile) {
        if (healthProfile == null) {
            return defaultReps;
        }
        
        double multiplier = 1.0;

        // Adjust based on daily activity level
        if (healthProfile.getDailyActivityLevel() != null && !healthProfile.getDailyActivityLevel().trim().isEmpty()) {
            switch (healthProfile.getDailyActivityLevel().toLowerCase()) {
                case "sedentary":
                    multiplier = 0.7; // Giảm 30%
                    break;
                case "lightly_active":
                    multiplier = 0.85; // Giảm 15%
                    break;
                case "moderately_active":
                    multiplier = 1.0; // Giữ nguyên
                    break;
                case "very_active":
                    multiplier = 1.15; // Tăng 15%
                    break;
                case "extra_active":
                    multiplier = 1.3; // Tăng 30%
                    break;
            }
        }

        // Adjust based on workout frequency
        if (healthProfile.getWorkoutFrequencyPerWeek() != null) {
            if (healthProfile.getWorkoutFrequencyPerWeek() < 2) {
                multiplier *= 0.8; // Ít tập → giảm
            } else if (healthProfile.getWorkoutFrequencyPerWeek() > 5) {
                multiplier *= 1.2; // Tập nhiều → tăng
            }
        }

        // Adjust based on BMI (nếu có) - BMI là BigDecimal
        if (healthProfile.getBmi() != null) {
            double bmiValue = healthProfile.getBmi().doubleValue();
            if (bmiValue > 30) {
                multiplier *= 0.8; // Béo phì → giảm
            } else if (bmiValue < 18.5) {
                multiplier *= 0.9; // Gầy → giảm nhẹ
            }
        }

        int personalizedReps = (int) Math.round(defaultReps * multiplier);
        int result = Math.max(1, personalizedReps); // Tối thiểu 1 rep
        
        // Log chi tiết để debug
        log.debug("📊 [PersonalizationService] Reps calculation:");
        log.debug("{}", "   - Default: " + defaultReps);
        log.debug("   - Multiplier: {}", String.format("%.2f", multiplier));
        log.debug("{}", "   - Result: " + result);
        log.debug("   - Status: {}", (multiplier != 1.0 ? "✅ PERSONALIZED" : "⚠️ SAME AS TEMPLATE (multiplier = 1.0)"));
        
        return result;
    }

    /**
     * Tính số sets cá nhân hóa dựa trên Health Profile
     * Service phân tích và đưa ra số sets phù hợp với user
     */
    private Integer calculatePersonalizedSets(Integer defaultSets, HealthProfile healthProfile) {
        if (healthProfile == null) {
            return defaultSets;
        }
        
        // Tương tự như reps, nhưng điều chỉnh ít hơn
        double multiplier = 1.0;

        if (healthProfile.getDailyActivityLevel() != null && !healthProfile.getDailyActivityLevel().trim().isEmpty()) {
            switch (healthProfile.getDailyActivityLevel().toLowerCase()) {
                case "sedentary":
                    multiplier = 0.8;
                    break;
                case "very_active":
                case "extra_active":
                    multiplier = 1.1;
                    break;
            }
        }

        int personalizedSets = (int) Math.round(defaultSets * multiplier);
        int result = Math.max(1, personalizedSets); // Tối thiểu 1 set
        
        // Log chi tiết để debug
        log.debug("📊 [PersonalizationService] Sets calculation:");
        log.debug("{}", "   - Default: " + defaultSets);
        log.debug("   - Multiplier: {}", String.format("%.2f", multiplier));
        log.debug("{}", "   - Result: " + result);
        log.debug("   - Status: {}", (multiplier != 1.0 ? "✅ PERSONALIZED" : "⚠️ SAME AS TEMPLATE (multiplier = 1.0)"));
        
        return result;
    }

    /**
     * Lấy tất cả PersonalizedPlanDetail của user (cho admin)
     */
    @Override
    @Transactional(readOnly = true)
    public NotificationResponse getAllPersonalizedPlanDetails(Long userId) {
        try {
            List<PersonalizedPlanDetail> personalizedDetails = 
                    personalizedPlanDetailRepository.findByUser_Id(userId);
            
            List<PersonalizedPlanDetailResponse> responses = personalizedDetails.stream()
                    .map(this::toResponse)
                    .collect(Collectors.toList());
            
            return new NotificationResponse(true, 
                    "All personalized plan details retrieved successfully", 
                    responses);
        } catch (Exception e) {
            log.error("Unexpected error", e);
            return new NotificationResponse(false, 
                    "Error retrieving personalized plan details: " + e.getMessage());
        }
    }

    /**
     * Admin cập nhật PersonalizedPlanDetail của user
     */
    @Override
    @Transactional
    public NotificationResponse updatePersonalizedPlanDetail(Long ppdId, PersonalizedPlanDetailResponse request) {
        try {
            PersonalizedPlanDetail ppd = personalizedPlanDetailRepository.findById(ppdId)
                    .orElseThrow(() -> new RuntimeException("PersonalizedPlanDetail not found with id: " + ppdId));
            
            // Update fields
            if (request.getSets() != null) {
                ppd.setSets(request.getSets());
            }
            if (request.getReps() != null) {
                ppd.setReps(request.getReps());
            }
            if (request.getDifficulty() != null) {
                ppd.setDifficulty(request.getDifficulty());
            }
            if (request.getTargetMuscle() != null) {
                ppd.setTargetMuscle(request.getTargetMuscle());
            }
            if (request.getExerciseName() != null) {
                ppd.setExerciseName(request.getExerciseName());
            }
            
            PersonalizedPlanDetail saved = personalizedPlanDetailRepository.save(ppd);
            PersonalizedPlanDetailResponse response = toResponse(saved);
            
            return new NotificationResponse(true, 
                    "Personalized plan detail updated successfully", 
                    response);
        } catch (Exception e) {
            log.error("Unexpected error", e);
            return new NotificationResponse(false, 
                    "Error updating personalized plan detail: " + e.getMessage());
        }
    }

    /**
     * Xác định nhóm cơ mục tiêu dựa trên tên bài tập
     */
    private String determineTargetMuscle(Exercise exercise, String exerciseName) {
        if (exercise != null && exercise.getPrimaryMuscle() != null && !exercise.getPrimaryMuscle().isBlank()) {
            return exercise.getPrimaryMuscle();
        }
        String nameLower = exerciseName.toLowerCase();
        
        if (nameLower.contains("push") || nameLower.contains("chest")) {
            return "Chest";
        } else if (nameLower.contains("squat") || nameLower.contains("leg")) {
            return "Legs";
        } else if (nameLower.contains("pull") || nameLower.contains("back")) {
            return "Back";
        } else if (nameLower.contains("bicep") || nameLower.contains("tricep") || nameLower.contains("arm")) {
            return "Arms";
        } else if (nameLower.contains("plank") || nameLower.contains("crunch") || nameLower.contains("core") || nameLower.contains("abs")) {
            return "Core";
        } else if (nameLower.contains("shoulder")) {
            return "Shoulders";
        }
        
        return "Full Body"; // Default
    }

    /**
     * Convert PersonalizedPlanDetail to Response DTO
     * Video URL và metadata lấy từ Exercise master data
     */
    private PersonalizedPlanDetailResponse toResponse(PersonalizedPlanDetail ppd) {
        PersonalizedPlanDetailResponse response = new PersonalizedPlanDetailResponse();
        
        response.setId(ppd.getId());
        response.setUserId(ppd.getUser().getId());
        response.setDayNumber(ppd.getDayNumber());
        if (ppd.getExercise() != null) {
            response.setChallengeId(ppd.getExercise().getId());
            response.setExerciseId(ppd.getExercise().getId());
        }
        response.setExerciseName(ppd.getExerciseName());
        // Lấy tên tiếng Việt từ Exercise master data (nếu có)
        if (ppd.getExercise() != null && ppd.getExercise().getExerciseNameVi() != null) {
            response.setExerciseNameVi(ppd.getExercise().getExerciseNameVi());
        }
        response.setSets(ppd.getSets());
        response.setReps(ppd.getReps());
        response.setRestTime(ppd.getRestTime());
        response.setDifficulty(ppd.getDifficulty());
        response.setTargetMuscle(ppd.getTargetMuscle());
        
        // Lấy video URL và metadata từ Exercise master data
        Exercise exercise = ppd.getExercise();
        if (exercise != null) {
            response.setVideoUrl(exercise.getVideoUrl());
            response.setChallengeName(exercise.getExerciseName());
            // Nested exercise metadata for FE card (equipment, type, image)
            response.setExercise(new PersonalizedPlanDetailResponse.ExerciseMeta(
                    exercise.getImageUrl(),
                    exercise.getVideoUrl(),
                    exercise.getExerciseType() != null ? exercise.getExerciseType() : null,
                    exercise.getDifficultyLevel() != null ? exercise.getDifficultyLevel().name() : null,
                    exercise.getPrimaryMuscle(),
                    exercise.getRequiredEquipment(),
                    exercise.getSecondaryMuscles()
            ));
        }

        // Set estimated calories
        response.setEstimatedCalories(ppd.getEstimatedCalories());

        // Set notes and recommended weight
        response.setNotes(ppd.getNotes());
        response.setRecommendedWeight(ppd.getRecommendedWeight());

        return response;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Note & weight helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Build a user-facing note explaining what muscle this exercise trains and why.
     * Example: "[Chest] Trains chest for fat burning & calorie expenditure. Tempo: 3-0-1."
     */
    private String buildExerciseNote(Exercise exercise, String targetMuscle, String goal) {
        String muscle = targetMuscle != null && !targetMuscle.isBlank() ? targetMuscle : "Full Body";
        String goalTxt = goalNoteText(goal);
        String equip   = exercise.getRequiredEquipment() != null
                ? exercise.getRequiredEquipment().toUpperCase() : "BODYWEIGHT";
        String tempo   = inferTempo(exercise);

        StringBuilder sb = new StringBuilder();
        sb.append("[").append(muscle).append("] ");
        sb.append("Trains ").append(muscle.toLowerCase()).append(" for ").append(goalTxt).append(". ");
        if (!equip.contains("BODYWEIGHT")) {
            sb.append("Uses ").append(formatEquipment(equip)).append(". ");
        }
        sb.append("Tempo: ").append(tempo).append(".");
        return sb.toString();
    }

    private String goalNoteText(String goal) {
        if (goal == null) return "overall fitness";
        return switch (goal.toLowerCase()) {
            case "weight_loss", "lose_weight", "lose_fat" -> "fat burning & calorie expenditure";
            case "muscle_gain", "build_muscle"            -> "hypertrophy & muscle size";
            case "strength"                               -> "maximal strength & neural adaptation";
            case "endurance"                              -> "muscular endurance & stamina";
            default                                       -> "general fitness & body composition";
        };
    }

    /**
     * Suggest a starting weight based on equipment type, bodyweight, and goal.
     * Returns null for bodyweight exercises.
     */
    private String computeWeightRecommendation(Exercise exercise, double bodyWeightKg, String goal) {
        String equip = exercise.getRequiredEquipment() != null
                ? exercise.getRequiredEquipment().toUpperCase() : "";
        if (equip.contains("DUMBBELL")) {
            double pct = switch (goal != null ? goal.toLowerCase() : "") {
                case "strength"                       -> 0.20;
                case "muscle_gain", "build_muscle"    -> 0.17;
                default                               -> 0.12;
            };
            double kg = Math.max(2.5, Math.min(30.0, bodyWeightKg * pct));
            kg = Math.round(kg / 2.5) * 2.5;
            return "~" + (int) kg + "kg dumbbell";
        } else if (equip.contains("BARBELL")) {
            double pct = switch (goal != null ? goal.toLowerCase() : "") {
                case "strength"                       -> 0.55;
                case "muscle_gain", "build_muscle"    -> 0.45;
                default                               -> 0.30;
            };
            double kg = Math.max(20.0, Math.min(100.0, bodyWeightKg * pct));
            kg = Math.round(kg / 5.0) * 5.0;
            return "~" + (int) kg + "kg barbell";
        } else if (equip.contains("CABLE")) {
            double kg = Math.max(5.0, Math.min(25.0, bodyWeightKg * 0.10));
            kg = Math.round(kg / 2.5) * 2.5;
            return "~" + (int) kg + "kg cable";
        } else if (equip.contains("MACHINE")) {
            double kg = Math.max(10.0, Math.min(40.0, bodyWeightKg * 0.15));
            kg = Math.round(kg / 5.0) * 5.0;
            return "~" + (int) kg + "kg machine";
        }
        return null; // BODYWEIGHT
    }

    private String inferTempo(Exercise exercise) {
        if (exercise.getTempo() != null && !exercise.getTempo().isBlank()) return exercise.getTempo();
        String movPat  = exercise.getMovementPattern()  != null ? exercise.getMovementPattern().toLowerCase()  : "";
        String exType  = exercise.getExerciseType()     != null ? exercise.getExerciseType().toLowerCase()     : "";
        String cat     = exercise.getExerciseCategory() != null ? exercise.getExerciseCategory().toUpperCase() : "";
        String force   = exercise.getForceType()        != null ? exercise.getForceType().toUpperCase()        : "";
        if ("CARDIO".equals(force) || exType.contains("cardio") || movPat.contains("cardio")) return "N/A";
        if (movPat.contains("isometric") || exType.contains("isometric")) return "hold";
        if ("COMPOUND".equals(cat)) return "3-0-1";
        if ("ISOLATION".equals(cat)) return "2-0-2";
        return "3-0-1";
    }

    private String formatEquipment(String equip) {
        if (equip.contains("DUMBBELL")) return "dumbbell";
        if (equip.contains("BARBELL")) return "barbell";
        if (equip.contains("CABLE")) return "cable machine";
        if (equip.contains("MACHINE")) return "machine";
        return equip.toLowerCase().replace("_", " ");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Swap Exercise Feature
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Lấy danh sách bài tập thay thế.
     * Nếu muscle == null thì dùng primaryMuscle của bài hiện tại.
     */
    @Override
    @Transactional(readOnly = true)
    public NotificationResponse getAlternativeExercises(Long ppdId, String muscle) {
        try {
            // Lấy bài hiện tại để biết nhóm cơ và exclude chính nó
            PersonalizedPlanDetail current = personalizedPlanDetailRepository.findById(ppdId)
                    .orElse(null);
            if (current == null) {
                return new NotificationResponse(false, "Không tìm thấy bài tập");
            }

            String targetMuscle = muscle;
            if (targetMuscle == null || targetMuscle.isBlank()) {
                // Ưu tiên targetMuscle lưu trong PPD (luôn có), sau đó mới dùng Exercise.primaryMuscle
                String savedTarget = current.getTargetMuscle();
                String exercisePrimary = null;
                try {
                    if (current.getExercise() != null) {
                        exercisePrimary = current.getExercise().getPrimaryMuscle();
                    }
                } catch (Exception ignored) { /* lazy load failed — dùng savedTarget */ }
                targetMuscle = (exercisePrimary != null && !exercisePrimary.isBlank())
                        ? exercisePrimary : savedTarget;
            }
            if (targetMuscle == null || targetMuscle.isBlank()) {
                // Fallback: trả về tất cả bài tập active
                targetMuscle = "Full Body";
            }

            Long excludeId = -1L;
            try {
                if (current.getExercise() != null) excludeId = current.getExercise().getId();
            } catch (Exception ignored) { /* lazy load failed — không exclude */ }

            final Long finalExcludeId = excludeId;
            List<Exercise> alternatives;
            if (muscle != null && !muscle.isBlank()) {
                alternatives = exerciseRepository.findByMuscle(targetMuscle);
                alternatives = alternatives.stream()
                        .filter(e -> !e.getId().equals(finalExcludeId))
                        .collect(java.util.stream.Collectors.toList());
            } else {
                alternatives = exerciseRepository.findAlternativesByMuscle(targetMuscle, finalExcludeId);
            }

            // Convert sang DTO gọn
            List<com.example.fitchallenge.DTO.PersonalizedPlanDetailDTO.AlternativeExerciseDTO> dtos =
                    alternatives.stream().map(e -> {
                        com.example.fitchallenge.DTO.PersonalizedPlanDetailDTO.AlternativeExerciseDTO dto =
                                new com.example.fitchallenge.DTO.PersonalizedPlanDetailDTO.AlternativeExerciseDTO();
                        dto.setId(e.getId());
                        dto.setName(e.getExerciseName());
                        dto.setNameVi(e.getExerciseNameVi());
                        dto.setPrimaryMuscle(e.getPrimaryMuscle());
                        dto.setExerciseType(e.getExerciseType());
                        dto.setDifficultyLevel(e.getDifficultyLevel() != null ? e.getDifficultyLevel().name() : null);
                        dto.setRequiredEquipment(e.getRequiredEquipment());
                        dto.setImageUrl(e.getImageUrl());
                        dto.setVideoUrl(e.getVideoUrl());
                        dto.setDefaultSets(e.getDefaultSets());
                        dto.setDefaultReps(e.getDefaultReps());
                        dto.setDefaultRestSeconds(e.getDefaultRestSeconds());
                        return dto;
                    }).collect(java.util.stream.Collectors.toList());

            return new NotificationResponse(true,
                    "Tìm thấy " + dtos.size() + " bài tập thay thế", dtos);
        } catch (Exception e) {
            log.error("Error getting alternative exercises", e);
            return new NotificationResponse(false, "Lỗi: " + e.getMessage());
        }
    }

    /**
     * Đổi bài tập hiện tại sang bài mới trong PersonalizedPlanDetail.
     */
    @Override
    @Transactional
    public NotificationResponse swapExercise(Long ppdId, Long newExerciseId) {
        try {
            PersonalizedPlanDetail ppd = personalizedPlanDetailRepository.findById(ppdId)
                    .orElse(null);
            if (ppd == null) {
                return new NotificationResponse(false, "Không tìm thấy bài tập trong kế hoạch");
            }

            Exercise newExercise = exerciseRepository.findById(newExerciseId).orElse(null);
            if (newExercise == null) {
                return new NotificationResponse(false, "Không tìm thấy bài tập mới");
            }

            // Cập nhật dữ liệu
            ppd.setExercise(newExercise);
            ppd.setExerciseName(newExercise.getExerciseName());
            ppd.setTargetMuscle(newExercise.getPrimaryMuscle() != null
                    ? newExercise.getPrimaryMuscle() : ppd.getTargetMuscle());
            ppd.setDifficulty(newExercise.getDifficultyLevel() != null
                    ? newExercise.getDifficultyLevel().name() : ppd.getDifficulty());

            // Giữ nguyên sets/reps/restTime từ kế hoạch cũ (không override)
            // Rebuild notes cơ bản cho bài mới
            String muscle = newExercise.getPrimaryMuscle() != null ? newExercise.getPrimaryMuscle() : "Full Body";
            String tempo = inferTempo(newExercise);
            String newNotes = "[" + muscle + "] Bài tập thay thế. " +
                    (newExercise.getDescription() != null ? newExercise.getDescription() + " " : "") +
                    "Tempo: " + tempo + ".";
            ppd.setNotes(newNotes);

            PersonalizedPlanDetail saved = personalizedPlanDetailRepository.save(ppd);
            PersonalizedPlanDetailResponse response = toResponse(saved);

            return new NotificationResponse(true,
                    "Đã đổi sang bài \"" + newExercise.getExerciseName() + "\" thành công", response);
        } catch (Exception e) {
            log.error("Error swapping exercise", e);
            return new NotificationResponse(false, "Lỗi khi đổi bài: " + e.getMessage());
        }
    }
}
