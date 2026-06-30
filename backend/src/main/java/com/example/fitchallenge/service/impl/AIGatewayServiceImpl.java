package com.example.fitchallenge.service.impl;

import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.DTO.SmartMealDTO.FoodCatalogEntryDTO;
import com.example.fitchallenge.DTO.SmartMealDTO.SmartMealPlanAiResponseDTO;
import com.example.fitchallenge.Entity.*;
import com.example.fitchallenge.repository.*;
import com.example.fitchallenge.repository.User.UserRepository;
import com.example.fitchallenge.service.AIGatewayService;
import com.example.fitchallenge.service.AiCreditCost;
import com.example.fitchallenge.service.AiUsageService;
import com.example.fitchallenge.service.PersonalizationService;
import com.example.fitchallenge.service.SmartMealPlanTransactionService;
import com.example.fitchallenge.service.UserPreferenceService;
import com.example.fitchallenge.utils.GoalMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AIGatewayServiceImpl implements AIGatewayService {

    private static final int SMART_MEAL_CATALOG_LIMIT = 150;

    private static final Logger log = LoggerFactory.getLogger(AIGatewayServiceImpl.class);

    @Value("${ai.service.url:http://localhost:8001}")
    private String aiServiceUrl;

    private final UserBodyProfileRepository bodyProfileRepository;
    private final UserRepository userRepository;
    private final PersonalizedNutritionPlanRepository pnpRepository;
    private final PersonalizedMealDetailRepository pmdRepository;
    private final TrainingPlanRepository tpRepository;
    private final DailyTrainingLogRepository dtlRepository;
    private final TrainingPlanDetailRepository trainingPlanDetailRepository;
    private final UserTrainingRepository userTrainingRepository;
    private final PersonalizedPlanDetailRepository personalizedPlanDetailRepository;
    private final ExerciseRepository exerciseRepository;
    private final GoalRepository goalRepository;
    private final com.example.fitchallenge.workout.PersonalizationResolver personalizationResolver;
    private final com.example.fitchallenge.nutrition.NutritionSafetyResolver nutritionSafetyResolver;
    private final FoodRepository foodRepository;
    private final UserInventoryRepository userInventoryRepository;
    private final SmartMealPlanTransactionService smartMealPlanTransactionService;
    private final HealthProfileRepository healthProfileRepository;
    private final PersonalizationService personalizationService;
    private final UserTrainingSessionRepository userTrainingSessionRepository;
    private final ProgramTemplateRepository programTemplateRepository;
    private final WorkoutDailyPlanGenerator workoutDailyPlanGenerator;
    private final DailyNutritionLogRepository dailyNutritionLogRepository;
    private final WorkoutWeekGenerationService workoutWeekGenerationService;
    private final UserPreferenceService userPreferenceService;
    private final AiUsageService aiUsageService;
    private final com.example.fitchallenge.service.AiTokenLogService aiTokenLogService;
    private final RestTemplate restTemplate; // injected bean có timeout (RestTemplateConfig)
    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    public NotificationResponse scanFoodImage(MultipartFile image, Long userId) {
        aiUsageService.ensureAndConsume(userId, AiCreditCost.SCAN_IMAGE);
        log.info("Scanning food image for user: {}", userId);
        try {
            String endpoint = aiServiceUrl + "/track-food";
            
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("image", image.getResource());
            
            // Get user target calories if possible
            UserBodyProfile profile = bodyProfileRepository.findByUser_Id(userId).orElse(null);
            if (profile != null && profile.getRecommendedCalories() != null) {
                body.add("user_daily_target", profile.getRecommendedCalories().intValue());
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(endpoint, requestEntity, Map.class);
            return new NotificationResponse(true, "Food image scanned successfully", response.getBody());
        } catch (Exception e) {
            log.error("Error scanning food image", e);
            return new NotificationResponse(false, "Failed to scan food image: " + e.getMessage());
        }
    }

    @Override
    public NotificationResponse scanInventoryImage(MultipartFile image, Long userId) {
        aiUsageService.ensureAndConsume(userId, AiCreditCost.SCAN_IMAGE);
        log.info("Scanning inventory image for user: {}", userId);
        try {
            // Using same vision model but with context
            String endpoint = aiServiceUrl + "/track-food";
            
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("image", image.getResource());
            body.add("meal_context", "inventory_scan");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(endpoint, requestEntity, Map.class);
            return new NotificationResponse(true, "Inventory scanned successfully", response.getBody());
        } catch (Exception e) {
            log.error("Error scanning inventory image", e);
            return new NotificationResponse(false, "Inventory scan failed: " + e.getMessage());
        }
    }

    @Override
    public NotificationResponse generateMealPlan(Map<String, Object> request, Long userId) {
        // Chỉ kiểm tra quota trước (fail-fast). Trừ credit SAU khi AI sinh plan thành công
        // để tránh đốt credit oan khi AI service lỗi (vd 422). Xem luồng hybrid làm chuẩn.
        aiUsageService.ensureQuota(userId, AiCreditCost.PLAN_GENERATE);
        log.info("[SmartMeal] Master-data meal flow for user {}", userId);
        try {
            UserBodyProfile profile = bodyProfileRepository.findByUser_Id(userId).orElse(null);
            if (profile == null) {
                return new NotificationResponse(false, "Profile incomplete. Please complete onboarding first.");
            }

            int days = ((Number) request.getOrDefault("days", 7)).intValue();
            if (days < 1) days = 1;
            if (days > 28) days = 28;

            Object requestedBudget = request.get("budget");
            int dailyBudget = requestedBudget instanceof Number
                    ? ((Number) requestedBudget).intValue()
                    : (profile.getTargetBudgetPerDay() != null ? profile.getTargetBudgetPerDay() : 80000);
            if (dailyBudget < 30000) dailyBudget = 30000;

            List<String> requestedInventoryTags = new ArrayList<>(toStringList(request.get("inventory")));
            userRepository.findById(userId).ifPresent(user -> {
                List<String> savedInventory = userInventoryRepository.findAvailableItemsForAI(user).stream()
                        .map(UserInventory::getDisplayName)
                        .filter(java.util.Objects::nonNull)
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .toList();
                requestedInventoryTags.addAll(savedInventory);
            });
            List<String> inventoryTags = requestedInventoryTags.stream()
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .distinct()
                    .toList();
            List<String> prefs = toStringList(request.get("preferences"));

            // An toàn dinh dưỡng: dị ứng/bệnh nền từ HealthProfile (Java enforce, AI chỉ nhận context)
            HealthProfile healthProfile = healthProfileRepository.findByUser_Id(userId).orElse(null);
            com.example.fitchallenge.nutrition.NutritionSafetyAdvice safety =
                    nutritionSafetyResolver.resolve(healthProfile, userPreferenceService.getFoodsToAvoid(userId));

            List<Food> catalog = new ArrayList<>(
                    foodRepository.findAll(PageRequest.of(0, SMART_MEAL_CATALOG_LIMIT)).getContent());
            catalog.sort(Comparator.comparing(Food::getFoodId));
            if (!safety.getAvoidKeywords().isEmpty()) {
                List<Food> safeCatalog = catalog.stream()
                        .filter(f -> !matchesAvoidKeyword(f.getName(), safety.getAvoidKeywords()))
                        .collect(Collectors.toCollection(ArrayList::new));
                // Chỉ áp filter khi catalog còn đủ món để lập thực đơn
                if (safeCatalog.size() >= 10) {
                    catalog = safeCatalog;
                }
            }
            if (catalog.isEmpty()) {
                return new NotificationResponse(false, "Master foods catalog is empty. Seed foods via admin/import first.");
            }

            List<FoodCatalogEntryDTO> slim = catalog.stream()
                    .map(f -> FoodCatalogEntryDTO.builder().foodId(f.getFoodId()).name(f.getName()).build())
                    .toList();

            Map<String, Object> aiPayload = new LinkedHashMap<>();
            aiPayload.put("days", days);
            aiPayload.put("budget_per_day", dailyBudget);
            aiPayload.put("target_calories_daily",
                    profile.getRecommendedCalories() != null ? profile.getRecommendedCalories().intValue() : 2000);
            aiPayload.put("inventory", inventoryTags);
            List<String> negative = new ArrayList<>(prefs);
            negative.addAll(safety.getAvoidKeywords());
            aiPayload.put("preferences_negative", negative.stream().distinct().toList());
            aiPayload.put("diet_rules", safety.getDietRules());
            aiPayload.put("medical_conditions", safety.getConditions());
            aiPayload.put("user_profile", buildUserProfileHints(profile, dailyBudget));
            aiPayload.put("food_catalog", slim);

            String endpoint = aiServiceUrl + "/smart-meal-plan";
            log.info("[SmartMeal] POST {} payloadBytes≈{}", endpoint, mapper.writeValueAsString(aiPayload).length());

            ResponseEntity<Map> response = restTemplate.postForEntity(endpoint, aiPayload, Map.class);
            aiTokenLogService.record(userId, "meal", response.getHeaders());
            Map<String, Object> body = response.getBody();
            if (body == null) {
                return new NotificationResponse(false, "AI service returned empty body");
            }

            SmartMealPlanAiResponseDTO structured = mapper.convertValue(body, SmartMealPlanAiResponseDTO.class);

            PersonalizedNutritionPlan saved = smartMealPlanTransactionService.saveFromCatalogRecommendation(
                    userId, profile, days, dailyBudget, inventoryTags, structured, catalog, body);

            PersonalizedNutritionPlan hydrated = pnpRepository.findById(saved.getPnpId()).orElse(saved);
            List<PersonalizedMealDetail> details = pmdRepository.findAllByPlanWithItems(hydrated);

            Map<String, Object> clientEnvelope = buildLegacyDailyPlansEnvelope(
                    hydrated, details, days, dailyBudget, inventoryTags, catalog);

            // Minh bạch an toàn y khoa (đồng bộ với luồng workout)
            clientEnvelope.put("requiresMedicalClearance", safety.isRequiresMedicalClearance());
            if (safety.isRequiresMedicalClearance()) {
                clientEnvelope.put("medicalDisclaimer", safety.getDisclaimer());
                clientEnvelope.put("medicalConditions", safety.getConditions());
            }

            // AI sinh plan + lưu thành công → mới trừ credit
            aiUsageService.consume(userId, AiCreditCost.PLAN_GENERATE);
            return new NotificationResponse(true, "Meal plan generated from master catalog", clientEnvelope);
        } catch (Exception e) {
            log.error("Smart meal plan failed", e);
            return new NotificationResponse(false, "Failed to generate meal plan: " + e.getMessage());
        }
    }

    private Map<String, Object> buildUserProfileHints(UserBodyProfile profile, int dailyBudget) {
        Map<String, Object> userProfile = new HashMap<>();
        String rawGoal = profile.getGoal() != null ? profile.getGoal().toLowerCase() : "maintenance";
        String goal = "maintenance";
        if (rawGoal.contains("weight") || rawGoal.contains("giảm") || rawGoal.contains("lose")) goal = "weight_loss";
        else if (rawGoal.contains("muscle") || rawGoal.contains("tăng")) goal = "muscle_gain";
        else if (rawGoal.contains("endurance") || rawGoal.contains("bền")) goal = "endurance";

        String gender = "male";
        if (profile.getGender() != null) {
            String g = profile.getGender().toLowerCase();
            if (g.startsWith("f") || g.contains("nữ")) gender = "female";
        }

        String rawLevel = profile.getExperienceLevel() != null ? profile.getExperienceLevel().toLowerCase() : "beginner";
        String fitnessLevel = "beginner";
        if (rawLevel.contains("inter") || rawLevel.contains("trung")) fitnessLevel = "intermediate";
        else if (rawLevel.contains("adv") || rawLevel.contains("cao")) fitnessLevel = "advanced";

        String activityLevel = "moderate";
        if (goal.equals("weight_loss")) activityLevel = "lightly_active";
        else if (goal.equals("muscle_gain")) activityLevel = "very_active";

        userProfile.put("weight", profile.getWeight());
        userProfile.put("height", profile.getHeight());
        userProfile.put("age", profile.getAge());
        userProfile.put("gender", gender);
        userProfile.put("goal", goal);
        userProfile.put("fitness_level", fitnessLevel);
        userProfile.put("activity_level", activityLevel);
        userProfile.put("budget_per_day", dailyBudget);
        return userProfile;
    }

    /** So khớp tên thực phẩm với từ khóa loại trừ (đã chuẩn hóa bỏ dấu, lowercase). */
    private boolean matchesAvoidKeyword(String foodName, List<String> avoidKeywords) {
        if (foodName == null) return false;
        String name = java.text.Normalizer.normalize(foodName, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT);
        return avoidKeywords.stream().anyMatch(name::contains);
    }

    @SuppressWarnings("unchecked")
    private List<String> toStringList(Object raw) {
        if (!(raw instanceof List<?> list)) {
            return List.of();
        }
        return list.stream()
                .filter(java.util.Objects::nonNull)
                .map(Object::toString)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    private Map<String, Object> buildLegacyDailyPlansEnvelope(
            PersonalizedNutritionPlan plan,
            List<PersonalizedMealDetail> details,
            int durationDays,
            int dailyBudget,
            List<String> inventoryTags,
            List<Food> catalog) {

        Map<Integer, List<PersonalizedMealDetail>> byDay = details.stream()
                .collect(Collectors.groupingBy(PersonalizedMealDetail::getDayNumber));

        List<Map<String, Object>> dailyPlans = new ArrayList<>();
        Set<String> shoppingList = new LinkedHashSet<>();
        for (int d = 1; d <= durationDays; d++) {
            List<PersonalizedMealDetail> dayRows = new ArrayList<>(byDay.getOrDefault(d, List.of()));
            dayRows.sort(Comparator.comparingInt(this::mealTypeOrder));

            double dayCals = 0;
            int daySpend = 0;
            List<Map<String, Object>> meals = new ArrayList<>();

            for (PersonalizedMealDetail pmd : dayRows) {
                List<Map<String, Object>> items = new ArrayList<>();
                if (pmd.getMealItems() != null) {
                    for (PersonalizedMealItem mi : pmd.getMealItems()) {
                        Food food = mi.getFood();
                        BigDecimal qty = mi.getQuantityGrams();
                        SmartMealPlanTransactionService.LineNutrition ln =
                                SmartMealPlanTransactionService.nutritionForLine(food, qty);
                        boolean fromInv = mi.isFromInventory();
                        int lineCost = fromInv ? 0 : ln.costVnd();
                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("name", food.getName());
                        row.put("amount", qty.stripTrailingZeros().toPlainString() + "g");
                        row.put("calories", (int) Math.round(ln.calories()));
                        row.put("protein", round1(ln.protein()));
                        row.put("carb", round1(ln.carbs()));
                        row.put("fat", round1(ln.fat()));
                        row.put("estimated_cost", lineCost);
                        row.put("food_id", food.getFoodId());
                        items.add(row);
                        if (lineCost > 0 && food.getName() != null && !food.getName().isBlank()) {
                            shoppingList.add(food.getName());
                        }
                    }
                }
                if (items.isEmpty()) continue;

                Map<String, Object> mealGroup = new LinkedHashMap<>();
                mealGroup.put("meal_type", pmd.getMealType().name().toLowerCase());
                mealGroup.put("items", items);
                meals.add(mealGroup);

                dayCals += pmd.getTotalCalories() != null ? pmd.getTotalCalories() : 0;
                daySpend += pmd.getEstimatedCost() != null ? pmd.getEstimatedCost() : 0;
            }

            Map<String, Object> dayMap = new LinkedHashMap<>();
            dayMap.put("day", "Day " + d);
            dayMap.put("meals", meals);
            dayMap.put("total_calories", (int) Math.round(dayCals));
            dayMap.put("estimated_cost", daySpend);
            dailyPlans.add(dayMap);
        }

        Map<String, Object> root = new LinkedHashMap<>();
        root.put("plan_id", plan.getAiPlanId());
        root.put("daily_plans", dailyPlans);
        root.put("weekly_totals", Map.of("total_cost", plan.getEstimatedTotalCost() != null ? plan.getEstimatedTotalCost() : 0));
        root.put("shopping_list", new ArrayList<>(shoppingList));
        root.put("total_calories", plan.getTargetCalories() != null ? plan.getTargetCalories().intValue() : 0);
        root.put("recommendations", List.of("Chi phí & calo do backend tính từ bảng foods — AI chỉ gợi ý food_id."));
        root.put("target_budget_per_day", dailyBudget);
        return root;
    }

    private int mealTypeOrder(PersonalizedMealDetail pmd) {
        if (pmd.getMealType() == null) return 99;
        return switch (pmd.getMealType()) {
            case BREAKFAST -> 0;
            case LUNCH -> 1;
            case DINNER -> 2;
            case SNACK -> 3;
        };
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    @Override
    @Transactional
    public NotificationResponse generateWorkoutPlan(Map<String, Object> request, Long userId) {
        // Chỉ kiểm tra quota trước (fail-fast). Trừ credit SAU khi AI sinh plan thành công
        // để tránh đốt credit oan khi AI service lỗi (vd 422). Xem luồng hybrid làm chuẩn.
        aiUsageService.ensureQuota(userId, AiCreditCost.PLAN_GENERATE);
        log.info("Generating intelligent workout plan for user: {}", userId);
        try {
            UserBodyProfile profile = bodyProfileRepository.findByUser_Id(userId).orElse(null);
            if (profile == null) {
                return new NotificationResponse(false, "Profile incomplete. Please complete onboarding first.");
            }
            HealthProfile healthProfile = healthProfileRepository.findByUser_Id(userId).orElse(null);
            if (healthProfile == null) {
                return new NotificationResponse(false, "Health profile incomplete. Please complete health profile first.");
            }
            // ── Resolve equipment: request param overrides health profile ──────────
            // The same list is used for TWO purposes:
            //   1) Filter allowed_exercises (repo query) → AI only receives exercises the user can do
            //   2) Tell the AI which equipment is available → AI picks the right exercise types
            List<String> resolvedEquipment = parseEquipment(healthProfile.getAvailableEquipment());
            Object equipOverride = request.get("equipment");
            if (equipOverride instanceof List<?> overrideList && !overrideList.isEmpty()) {
                // User explicitly passed equipment at generation time — re-parse through the same
                // normalisation pipeline so aliases and case are handled consistently
                String overrideStr = overrideList.stream().map(Object::toString)
                        .collect(java.util.stream.Collectors.joining(","));
                resolvedEquipment = parseEquipment(overrideStr);
                // Persist the chosen equipment so all future generation flows use it (mirrors goal persistence)
                healthProfile.setAvailableEquipment(overrideStr);
                healthProfileRepository.save(healthProfile);
            }

            List<Exercise> safeExercises = findSafeExercisesForAi(healthProfile, resolvedEquipment);
            if (safeExercises.isEmpty()) {
                return new NotificationResponse(false, "No medically safe exercises available for current health profile.");
            }

            safeExercises = safeExercises.stream()
                    .filter(this::isAiReadyExercise)
                    .toList();
            CatalogReadiness catalogReadiness = assessCatalogReadiness(safeExercises);
            if (!catalogReadiness.ready()) {
                return new NotificationResponse(false,
                        "Exercise catalog is not ready for AI workout generation. "
                                + catalogReadiness.message()
                                + " Run Admin > Data Seeder > Bài tập, then Admin > Bài tập > Chạy audit.");
            }

            int totalWeeks = ((Number) request.getOrDefault("totalWeeks", 1)).intValue();
            if (totalWeeks < 1) totalWeeks = 1;
            if (totalWeeks > 12) totalWeeks = 12;
            String programId = Objects.toString(request.getOrDefault("program", totalWeeks + "W"), totalWeeks + "W");

            int totalProgramDays = totalWeeks * 7;
            int currentWeek = 1;

            // Thời lượng buổi tập: ưu tiên giá trị truyền lúc generate; nếu không có
            // thì lấy từ hồ sơ (onboarding đã hỏi "phút/buổi"); cuối cùng mới mặc định 45.
            int profileDuration = healthProfile.getPreferredWorkoutDurationMinutes() != null
                    ? healthProfile.getPreferredWorkoutDurationMinutes() : 45;
            int durationMinutes = ((Number) request.getOrDefault("duration", profileDuration)).intValue();
            // Nếu user đổi thời lượng lúc generate → lưu lại làm mặc định cho lần sau
            if (request.get("duration") != null
                    && !Integer.valueOf(durationMinutes).equals(healthProfile.getPreferredWorkoutDurationMinutes())) {
                healthProfile.setPreferredWorkoutDurationMinutes(durationMinutes);
                healthProfileRepository.save(healthProfile);
            }
            double weightKg = profile.getWeight() != null ? profile.getWeight().doubleValue() : 70.0;

            Map<String, Object> aiRequest = new HashMap<>();
            // week_number drives auto periodization: W1=foundation, W2=volume, W3=intensity, W4=deload
            int weekNumber = ((Number) request.getOrDefault("week_number", 1)).intValue();
            if (weekNumber < 1) weekNumber = 1;

            aiRequest.put("user_id", userId.toString());
            aiRequest.put("days", totalProgramDays);
            aiRequest.put("week_number", weekNumber);
            aiRequest.put("total_weeks", totalWeeks);
            aiRequest.put("available_equipment", resolvedEquipment);
            aiRequest.put("workout_intensity", request.getOrDefault("intensity", "moderate"));
            aiRequest.put("workout_duration_minutes", durationMinutes);
            aiRequest.put("progression_phase", request.getOrDefault("progressionPhase", "foundation"));
            aiRequest.put("preferences", request.getOrDefault("preferences", List.of()));
            aiRequest.put("current_injuries", healthProfile.getCurrentInjuries());
            aiRequest.put("allowed_exercises", safeExercises.stream().map(this::toAiExerciseCatalog).toList());

            // Resolve goal: request param overrides profile (lets user pick at generation time)
            String requestedGoal = Objects.toString(request.get("goal"), "").strip();
            String resolvedGoal;
            if (!requestedGoal.isBlank()) {
                resolvedGoal = GoalMapper.toAiGoal(requestedGoal);
                // Persist the chosen goal so future plan generation + notes use it
                profile.setGoal(resolvedGoal);
                bodyProfileRepository.save(profile);
                // Đồng bộ luôn health_profile.primaryGoal để recommendations & các consumer khác
                // không đọc phải goal cũ (tránh lệch giữa 2 bảng profile).
                healthProfile.setPrimaryGoal(resolvedGoal);
                healthProfileRepository.save(healthProfile);
            } else {
                resolvedGoal = GoalMapper.toAiGoal(profile.getGoal());
            }

            // ── Cá nhân hóa: đơn tập theo guideline (ACSM/NSCA/WHO) ──────────────
            // Biến hồ sơ → ràng buộc tường minh: tầng rủi ro, cường độ trần, low-impact,
            // trần độ khó, vùng cơ ưu tiên, chia buổi. Xem docs/ma-tran-doi-tuong-workout.md.
            List<String> requestedFocus = toStringList(request.get("focusAreas"));
            int daysPerWeek = request.get("daysPerWeek") instanceof Number dn ? dn.intValue() : 0;
            String preferSplit = Objects.toString(request.get("preferSplit"), "");
            com.example.fitchallenge.workout.TrainingPrescription rx =
                    personalizationResolver.resolve(profile, healthProfile, requestedFocus, resolvedGoal, daysPerWeek, preferSplit);

            // Lọc bài theo đơn tập (loại high-impact & bài vượt trần độ khó cho nhóm thận trọng)
            safeExercises = applyPrescriptionFilter(safeExercises, rx);
            if (safeExercises.isEmpty()) {
                return new NotificationResponse(false,
                        "Chưa đủ bài tập an toàn phù hợp hồ sơ này (cần thêm bài low-impact/độ khó phù hợp). "
                                + "Hãy bổ sung thiết bị hoặc liên hệ quản trị để mở rộng kho bài tập.");
            }
            // Cập nhật lại allowed_exercises sau khi lọc (đồng bộ với validate phía dưới)
            aiRequest.put("allowed_exercises", safeExercises.stream().map(this::toAiExerciseCatalog).toList());

            // Đẩy ràng buộc đơn tập xuống AI planner (ràng buộc cứng — AI không tự đoán)
            aiRequest.put("risk_tier", rx.getRiskTier().name());
            aiRequest.put("archetype", rx.getArchetype());
            aiRequest.put("intensity_cap_pct", rx.getIntensityCapPct());
            aiRequest.put("rep_range_hint", rx.getRepRangeHint());
            aiRequest.put("impact_policy", rx.isLowImpactOnly() ? "low_impact_only" : "mixed");
            aiRequest.put("split_strategy", rx.getSplitStrategy());
            aiRequest.put("weekly_pattern", rx.getWeeklyPattern());
            aiRequest.put("days_per_week", rx.getDaysPerWeek());
            aiRequest.put("focus_areas", rx.getFocusAreas());
            aiRequest.put("include_mobility", rx.isIncludeMobility());
            aiRequest.put("include_balance", rx.isIncludeBalance());
            aiRequest.put("education_level", rx.getEducationLevel());

            Map<String, Object> userProfile = new HashMap<>();
            userProfile.put("weight", profile.getWeight());
            userProfile.put("height", profile.getHeight());
            userProfile.put("age", profile.getAge());
            userProfile.put("gender", profile.getGender() != null ? profile.getGender().toLowerCase() : "male");
            userProfile.put("goal", resolvedGoal);

            String rawLevel = profile.getExperienceLevel() != null ? profile.getExperienceLevel().toLowerCase() : "beginner";
            String fitnessLevel = "beginner";
            if (rawLevel.contains("inter") || rawLevel.contains("trung")) fitnessLevel = "intermediate";
            else if (rawLevel.contains("adv") || rawLevel.contains("cao")) fitnessLevel = "advanced";
            userProfile.put("fitness_level", fitnessLevel);
            userProfile.put("activity_level", "moderate");
            userProfile.put("budget_per_day", 100000);
            aiRequest.put("user_profile", userProfile);

            Map<String, Object> programTemplate;
            try {
                String endpoint = aiServiceUrl + "/workout-plan";
                ResponseEntity<Map> response = restTemplate.postForEntity(endpoint, aiRequest, Map.class);
                aiTokenLogService.record(userId, "workout", response.getHeaders());
                programTemplate = response.getBody();
            } catch (Exception ex) {
                log.error("AI Workout Template Service error. Error: {}", ex.getMessage());
                throw new RuntimeException("AI Workout Template Service Failed: " + ex.getMessage(), ex);
            }
            if (programTemplate == null || programTemplate.isEmpty()) {
                throw new IllegalStateException("AI workout template response is empty");
            }

            validateProgramTemplateOrThrow(programTemplate, safeExercises);

            Map<Long, Exercise> allowedById = safeExercises.stream()
                    .collect(Collectors.toMap(Exercise::getId, exercise -> exercise, (a, b) -> a));
            List<Map<String, Object>> sessions = workoutDailyPlanGenerator.generate(
                    programTemplate,
                    allowedById,
                    profile,
                    currentWeek,
                    durationMinutes
            );

            Map<String, Object> aiResponse = new LinkedHashMap<>();
            aiResponse.put("programTemplate", programTemplate);
            aiResponse.put("sessions", sessions);
            aiResponse.put("durationDays", totalProgramDays);
            aiResponse.put("generatedDays", 7);
            aiResponse.put("durationWeeks", totalWeeks);
            aiResponse.put("totalProgramDays", totalProgramDays);
            aiResponse.put("totalWeeks", totalWeeks);
            aiResponse.put("currentWeek", currentWeek);

            // Minh bạch cá nhân hóa + an toàn y khoa
            aiResponse.put("riskTier", rx.getRiskTier().name());
            aiResponse.put("archetype", rx.getArchetype());
            aiResponse.put("prescriptionRationale", rx.getRationale());
            aiResponse.put("requiresMedicalClearance", rx.isRequiresMedicalClearance());
            if (rx.isRequiresMedicalClearance()) {
                aiResponse.put("medicalDisclaimer",
                        "Hồ sơ của bạn có dấu hiệu cần thận trọng. Hãy tham khảo ý kiến bác sĩ trước khi "
                                + "tập với cường độ cao. Kế hoạch này chỉ mang tính tham khảo, không thay thế tư vấn y tế.");
            }

            saveWorkoutPlan(userId, aiResponse, programTemplate, profile, totalWeeks, programId, totalProgramDays, rx.getDaysPerWeek());
            // AI sinh plan + lưu thành công → mới trừ credit
            aiUsageService.consume(userId, AiCreditCost.PLAN_GENERATE);
            return new NotificationResponse(true, "Workout plan generated successfully", aiResponse);
        } catch (Exception e) {
            log.error("Error generating workout plan", e);
            return new NotificationResponse(false, "Failed to generate workout plan: " + e.getMessage());
        }
    }

    private void saveWorkoutPlan(
            Long userId,
            Map<String, Object> aiResponse,
            Map<String, Object> programTemplate,
            UserBodyProfile profile,
            int totalWeeks,
            String programId,
            int totalProgramDays,
            int workoutsPerWeek) {
        try {
            User user = userRepository.findById(userId).orElse(null);
            if (user == null) return;

            List<Map<String, Object>> sessions = (List<Map<String, Object>>) aiResponse.get("sessions");
            if (sessions == null || sessions.isEmpty()) return;

            int durationDays = sessions.stream()
                    .map(session -> toLong(session.get("day_number")))
                    .filter(java.util.Objects::nonNull)
                    .mapToInt(Long::intValue)
                    .max()
                    .orElse(sessions.size());
            if (durationDays < 1) durationDays = sessions.size();

            String planTitle = "AI Neural Protocol - User " + userId;
            TrainingPlan aiTemplate = tpRepository.findAll().stream()
                    .filter(p -> planTitle.equals(p.getTitle()))
                    .findFirst()
                    .orElseGet(() -> {
                        TrainingPlan p = new TrainingPlan();
                        p.setTitle(planTitle);
                        p.setDescription("Intelligent adaptive training plan generated by AI");
                        p.setGoal(goalRepository.findAll().stream().findFirst().orElse(null));
                        return tpRepository.save(p);
                    });

            aiTemplate.setDescription("Intelligent adaptive training plan generated by AI");
            aiTemplate.setDifficultyLevel(profile.getExperienceLevel());
            aiTemplate.setDurationWeeks(Math.max(totalWeeks, (int) Math.ceil(durationDays / 7.0)));

            // Số buổi tập/tuần: ưu tiên giá trị từ đơn tập (prescription),
            // fallback đếm số ngày không phải rest_day trong tuần đầu (day_number 1-7).
            int resolvedWorkoutsPerWeek = workoutsPerWeek;
            if (resolvedWorkoutsPerWeek <= 0) {
                resolvedWorkoutsPerWeek = (int) sessions.stream()
                        .filter(s -> {
                            Long d = toLong(s.get("day_number"));
                            return d != null && d >= 1 && d <= 7;
                        })
                        .filter(s -> !Boolean.TRUE.equals(s.get("is_rest_day"))
                                && !"rest_day".equals(s.get("session_type"))
                                && !"rest".equals(s.get("session_type")))
                        .count();
            }
            aiTemplate.setWorkoutsPerWeek(resolvedWorkoutsPerWeek > 0 ? resolvedWorkoutsPerWeek : null);
            aiTemplate = tpRepository.save(aiTemplate);

            Long trainingPlanId = aiTemplate.getTpId();
            List<UserTraining> oldUserTrainings = userTrainingRepository.findByTrainingPlan_TpId(trainingPlanId).stream()
                    .filter(ut -> ut.getUser() != null && userId.equals(ut.getUser().getId()))
                    .toList();
            Set<Long> oldUtIds = oldUserTrainings.stream()
                    .map(UserTraining::getUtId)
                    .collect(Collectors.toSet());

            if (!oldUtIds.isEmpty()) {
                List<PersonalizedPlanDetail> oldPersonalized = personalizedPlanDetailRepository.findByUser_Id(userId).stream()
                        .filter(ppd -> oldUtIds.contains(ppd.getUtId()))
                        .toList();
                personalizedPlanDetailRepository.deleteAll(oldPersonalized);
                userTrainingSessionRepository.deleteByUtIdIn(oldUtIds);
                programTemplateRepository.deleteByUserTrainingIdIn(oldUtIds);
            }
            dtlRepository.deleteAll(dtlRepository.findByUser_IdAndTrainingPlan_TpId(userId, trainingPlanId));
            userTrainingRepository.deleteAll(oldUserTrainings);
            trainingPlanDetailRepository.deleteAll(trainingPlanDetailRepository.findByTrainingPlan_TpId(trainingPlanId));

            List<TrainingPlanDetail> templateDetails = new ArrayList<>();
            List<DailyTrainingLog> plannedLogs = new ArrayList<>();
            LocalDate today = LocalDate.now();

            for (Map<String, Object> session : sessions) {
                List<Map<String, Object>> exercises = (List<Map<String, Object>>) session.get("exercises");
                if (exercises == null || exercises.isEmpty()) continue;
                int dayNumber = toInt(session.get("day_number"), templateDetails.size() + 1);

                for (Map<String, Object> workoutItem : exercises) {
                    Long exerciseId = toLong(workoutItem.get("exercise_id"));
                    if (exerciseId == null) {
                        log.warn("Skipping AI workout item without exercise_id: {}", workoutItem);
                        continue;
                    }

                    Exercise exercise = exerciseRepository.findById(exerciseId).orElse(null);
                    if (exercise == null) {
                        log.warn("Skipping AI workout item with unknown exercise_id={}", exerciseId);
                        continue;
                    }

                    TrainingPlanDetail detail = new TrainingPlanDetail();
                    detail.setTrainingPlan(aiTemplate);
                    detail.setDayNumber(dayNumber);
                    detail.setExercise(exercise);
                    detail.setSets(toInt(workoutItem.get("sets"), exercise.getDefaultSets()));
                    detail.setReps(parseReps(workoutItem.get("reps"), exercise.getDefaultReps()));
                    detail.setRestTime(toInt(workoutItem.get("rest_seconds"), exercise.getDefaultRestSeconds()));
                    // Store notes + recommended_weight as JSON for PersonalizationService
                    String notesText = workoutItem.get("notes") != null ? workoutItem.get("notes").toString() : "";
                    Object weightRec  = workoutItem.get("recommended_weight");
                    if (weightRec != null && !weightRec.toString().isBlank()) {
                        java.util.Map<String, String> instrMap = new java.util.LinkedHashMap<>();
                        instrMap.put("notes", notesText);
                        instrMap.put("recommended_weight", weightRec.toString());
                        try { notesText = mapper.writeValueAsString(instrMap); } catch (Exception ignored) {}
                    }
                    detail.setInstructions(notesText.isBlank() ? null : notesText);
                    templateDetails.add(detail);

                    plannedLogs.add(DailyTrainingLog.builder()
                            .user(user)
                            .trainingPlan(aiTemplate)
                            .trainingDate(today.plusDays(Math.max(0, dayNumber - 1)))
                            .dayNumber(dayNumber)
                            .exercise(exercise)
                            .status(DailyTrainingLog.DailyTrainingStatus.NOT_STARTED)
                            .caloriesBurned(toInt(session.get("estimated_calories_burned"), 0))
                            .build());
                }
            }

            if (templateDetails.isEmpty()) {
                log.warn("AI workout response contained no persistable exercises for user {}", userId);
                throw new IllegalStateException("AI workout response contained no persistable exercises");
            }

            trainingPlanDetailRepository.saveAll(templateDetails);

            UserTraining userTraining = new UserTraining();
            userTraining.setUser(user);
            userTraining.setTrainingPlan(aiTemplate);
            userTraining.setStartDate(today);
            userTraining.setEndDate(today.plusDays(Math.max(0, totalProgramDays - 1)));
            userTraining.setCompletedDays(0);
            userTraining.setCurrentDay(1);
            userTraining.setCompletionPercentage(0.0);
            userTraining.setStatus("active");
            userTraining.setWeekNumber(1);
            userTraining.setTotalWeeks(Math.max(totalWeeks, (int) Math.ceil(durationDays / 7.0)));
            userTraining.setProgramId(programId);
            UserTraining savedUserTraining = userTrainingRepository.save(userTraining);

            saveProgramTemplate(savedUserTraining, trainingPlanId, programTemplate);
            saveWorkoutSessions(savedUserTraining, trainingPlanId, sessions);

            NotificationResponse personalization = personalizationService.createPersonalizedPlanDetails(savedUserTraining.getUtId());
            if (!personalization.isSuccess()) {
                log.warn("AI workout generated but personalization failed for utId={}: {}",
                        savedUserTraining.getUtId(), personalization.getMessage());
            }

            dtlRepository.saveAll(plannedLogs);
            aiResponse.put("trainingPlanId", trainingPlanId);
            aiResponse.put("userTrainingId", savedUserTraining.getUtId());
            aiResponse.put("personalized", personalization.isSuccess());
        } catch (Exception e) {
            log.error("Failed to save workout plan", e);
            throw new RuntimeException("Failed to save workout plan: " + e.getMessage(), e);
        }
    }

    private void saveProgramTemplate(UserTraining userTraining, Long trainingPlanId, Map<String, Object> template) {
        ProgramTemplate entity = new ProgramTemplate();
        entity.setUserId(userTraining.getUser().getId());
        entity.setTrainingPlanId(trainingPlanId);
        entity.setUserTrainingId(userTraining.getUtId());
        entity.setGoal(Objects.toString(template.getOrDefault("goal", "maintenance"), "maintenance"));
        entity.setWeeklyPatternJson(writeJson(template.getOrDefault("weekly_pattern", List.of())));
        entity.setExercisePoolJson(writeJson(template.getOrDefault("exercise_pool", Map.of())));
        entity.setBaseSets(toInt(template.get("base_sets"), 3));
        entity.setBaseReps(toInt(template.get("base_reps"), 12));
        entity.setBaseRestSeconds(toInt(template.get("base_rest_seconds"), 75));
        entity.setProgressionRate(toDouble(template.get("progression_rate"), 0.10));
        entity.setDurationMinutes(toInt(template.get("duration_minutes"), 45));
        entity.setIntensity(Objects.toString(template.getOrDefault("intensity", "moderate"), "moderate"));
        entity.setVersionNumber(1);
        entity.setStatus("ACTIVE");
        entity.setAdaptationNotes(writeJson(template.getOrDefault("adaptation_notes", List.of())));
        programTemplateRepository.save(entity);
    }

    @SuppressWarnings("unchecked")
    private void saveWorkoutSessions(UserTraining userTraining, Long trainingPlanId, List<Map<String, Object>> sessions) {
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
        if (rows.size() != sessions.size()) {
            throw new IllegalStateException("Workout session metadata count mismatch");
        }
        userTrainingSessionRepository.saveAll(rows);
    }

    private String writeJson(Object value) {
        try {
            return mapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalArgumentException("Cannot serialize workout session metadata", e);
        }
    }

    private void validateProgramTemplateOrThrow(Map<String, Object> template, List<Exercise> safeExercises) {
        List<String> weeklyPattern = readStringList(template.get("weekly_pattern"), "weekly_pattern");
        if (weeklyPattern.size() != 7) {
            throw new IllegalStateException("Program template weekly_pattern must contain exactly 7 entries");
        }
        long restDays = weeklyPattern.stream().filter(type -> "rest".equals(type) || "rest_day".equals(type)).count();
        if (restDays < 2) {
            throw new IllegalStateException("Program template weekly_pattern must include at least 2 rest days");
        }

        Map<String, List<Long>> exercisePool = readExercisePool(template.get("exercise_pool"));
        Map<Long, Exercise> allowedById = safeExercises.stream()
                .collect(Collectors.toMap(Exercise::getId, exercise -> exercise, (a, b) -> a));

        // Từ vựng session type phải khớp PersonalizationResolver + ai-service workout_planner.
        // Ngoài upper_push/upper_pull (PPL) còn có upper (thân trên gộp), push, pull, core
        // dùng trong split upper_lower / push_pull_legs / *_focus.
        Map<String, Integer> requiredPoolSizes = Map.of(
                "upper_push", 3,
                "upper_pull", 3,
                "upper", 3,
                "push", 3,
                "pull", 3,
                "lower", 3,
                "core", 2,
                "full_body", 4,
                "cardio_core", 2
        );

        for (String sessionType : weeklyPattern) {
            if ("rest".equals(sessionType) || "rest_day".equals(sessionType)) {
                continue;
            }
            if (!requiredPoolSizes.containsKey(sessionType)) {
                throw new IllegalStateException("Unsupported session type in weekly_pattern: " + sessionType);
            }
        }

        // Only validate pool types that are actually used in this plan's weekly_pattern.
        // Types absent from the pattern (e.g. cardio_core in a strength-only plan) don't need pool entries.
        Set<String> usedSessionTypes = weeklyPattern.stream()
                .filter(type -> !"rest".equals(type) && !"rest_day".equals(type))
                .collect(java.util.stream.Collectors.toSet());

        for (Map.Entry<String, Integer> rule : requiredPoolSizes.entrySet()) {
            if (!usedSessionTypes.contains(rule.getKey())) {
                continue; // session type not used in this weekly pattern — skip
            }
            List<Long> ids = exercisePool.getOrDefault(rule.getKey(), List.of());
            if (ids.size() < rule.getValue()) {
                throw new IllegalStateException("exercise_pool." + rule.getKey() + " requires at least " + rule.getValue() + " exercises");
            }
            for (Long exerciseId : ids) {
                if (!allowedById.containsKey(exerciseId)) {
                    throw new IllegalStateException("exercise_pool." + rule.getKey() + " contains exercise outside allowed_exercises: " + exerciseId);
                }
            }
        }

        // Only enforce full_body category coverage when full_body is actually in the plan
        if (usedSessionTypes.contains("full_body")) {
            List<Exercise> fullBody = exercisePool.getOrDefault("full_body", List.of()).stream()
                    .map(allowedById::get)
                    .filter(Objects::nonNull)
                    .toList();
            if (fullBody.stream().noneMatch(this::isPushExercise)
                    || fullBody.stream().noneMatch(this::isPullExercise)
                    || fullBody.stream().noneMatch(this::isLowerExercise)
                    || fullBody.stream().noneMatch(this::isCoreExercise)) {
                throw new IllegalStateException("exercise_pool.full_body must cover push, pull, lower, and core");
            }
        }
    }

    private void validatePoolExercise(String sessionType, Exercise exercise) {
        if ("upper_push".equals(sessionType) && !isPushExercise(exercise)) {
            throw new IllegalStateException("upper_push pool contains non-push exercise: " + exercise.getExerciseName());
        }
        if ("upper_pull".equals(sessionType) && !isPullExercise(exercise)) {
            throw new IllegalStateException("upper_pull pool contains non-pull exercise: " + exercise.getExerciseName());
        }
        if ("lower".equals(sessionType) && !isLowerExercise(exercise)) {
            throw new IllegalStateException("lower pool contains non-lower exercise: " + exercise.getExerciseName());
        }
        if ("cardio_core".equals(sessionType) && !(isCoreExercise(exercise) || containsExerciseTerm(exercise, "cardio", "run", "bike", "climber", "burpee", "jump"))) {
            throw new IllegalStateException("cardio_core pool contains non-cardio/core exercise: " + exercise.getExerciseName());
        }
    }

    private List<String> readStringList(Object value, String fieldName) {
        if (value instanceof List<?> raw) {
            return raw.stream().map(Objects::toString).toList();
        }
        throw new IllegalStateException("Program template " + fieldName + " must be an array");
    }

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
                    .filter(Objects::nonNull)
                    .toList());
        }
        return pool;
    }

    private boolean isUpperExercise(Exercise exercise) {
        return isPushExercise(exercise) || isPullExercise(exercise) || containsExerciseTerm(exercise,
                "chest", "back", "shoulder", "tricep", "bicep", "lat", "row", "press", "push", "pull");
    }

    private boolean isLowerExercise(Exercise exercise) {
        return containsExerciseTerm(exercise,
                "leg", "legs", "quad", "hamstring", "glute", "calf", "squat", "hinge", "lunge", "bridge", "deadlift");
    }

    private boolean isCoreExercise(Exercise exercise) {
        return containsExerciseTerm(exercise, "core", "abs", "abdominal", "plank", "crunch", "dead bug");
    }

    private boolean isPushExercise(Exercise exercise) {
        return containsExerciseTerm(exercise, "push", "press", "chest", "tricep");
    }

    private boolean isPullExercise(Exercise exercise) {
        return containsExerciseTerm(exercise, "pull", "row", "back", "lat", "bicep");
    }

    private boolean containsExerciseTerm(Exercise exercise, String... terms) {
        String haystack = normalize(String.join(" ",
                Objects.toString(exercise.getExerciseName(), ""),
                Objects.toString(exercise.getExerciseType(), ""),
                Objects.toString(exercise.getMovementPattern(), ""),
                Objects.toString(exercise.getPrimaryMuscle(), "")
        ));
        for (String term : terms) {
            if (haystack.contains(term)) {
                return true;
            }
        }
        return false;
    }

    private List<String> defaultMuscleGroups(String sessionType) {
        return switch (sessionType) {
            case "upper_body" -> List.of("chest", "back", "shoulders");
            case "lower_body" -> List.of("quads", "hamstrings", "glutes");
            case "full_body" -> List.of("push", "pull", "legs", "core");
            default -> List.of();
        };
    }

    private List<String> defaultWarmup(String sessionType) {
        return switch (sessionType) {
            case "upper_body" -> List.of("Shoulder circles", "Arm swings", "Chest opener");
            case "lower_body" -> List.of("Hip circles", "Leg swings", "Bodyweight squat");
            case "full_body" -> List.of("Shoulder circles", "Hip circles", "Bodyweight squat");
            default -> List.of();
        };
    }

    private List<String> defaultCooldown(String sessionType) {
        return switch (sessionType) {
            case "upper_body" -> List.of("Doorway chest stretch 20-30s", "Lat stretch 20-30s", "Cross-body shoulder stretch 20-30s");
            case "lower_body" -> List.of("Standing quad stretch 20-30s", "Hamstring stretch 20-30s", "Figure-four glute stretch 20-30s");
            case "full_body" -> List.of("Chest stretch 20-30s", "Hip flexor stretch 20-30s", "Hamstring stretch 20-30s");
            default -> List.of("Mobility work", "Light stretching");
        };
    }

    private Map<String, Object> toAiExerciseCatalog(Exercise exercise) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("exercise_id", exercise.getId());
        item.put("exercise_name", exercise.getExerciseName());
        item.put("exercise_type", exercise.getExerciseType());
        item.put("movement_pattern", exercise.getMovementPattern());
        item.put("primary_muscle", exercise.getPrimaryMuscle());
        item.put("secondary_muscles", exercise.getSecondaryMuscles());
        item.put("difficulty_level", exercise.getDifficultyLevel() != null ? exercise.getDifficultyLevel().name() : "MEDIUM");
        item.put("required_equipment", exercise.getRequiredEquipment() != null ? exercise.getRequiredEquipment() : "BODYWEIGHT");
        item.put("force_type", exercise.getForceType());
        item.put("exercise_category", exercise.getExerciseCategory());
        item.put("met_value", exercise.getMetValue() != null ? exercise.getMetValue().doubleValue() : null);
        item.put("spinal_loading", Boolean.TRUE.equals(exercise.getSpinalLoading()));
        item.put("knee_dominant", Boolean.TRUE.equals(exercise.getKneeDominant()));
        item.put("shoulder_overhead", Boolean.TRUE.equals(exercise.getShoulderOverhead()));
        item.put("high_impact", Boolean.TRUE.equals(exercise.getHighImpact()));
        item.put("wrist_loading", Boolean.TRUE.equals(exercise.getWristLoading()));
        item.put("default_sets", requirePositive(exercise.getDefaultSets(), "default_sets", exercise.getId()));
        item.put("default_reps", requirePositive(exercise.getDefaultReps(), "default_reps", exercise.getId()));
        item.put("default_rest_seconds", requirePositive(exercise.getDefaultRestSeconds(), "default_rest_seconds", exercise.getId()));
        return item;
    }

    private boolean isAiReadyExercise(Exercise exercise) {
        return exercise.getId() != null
                && !isBlank(exercise.getExerciseName())
                && !isBlank(exercise.getExerciseType())
                && !isBlank(exercise.getMovementPattern())
                && !isBlank(exercise.getPrimaryMuscle())
                && !isBlank(exercise.getRequiredEquipment())
                && Set.of("PUSH", "PULL", "LEGS", "CORE", "CARDIO", "MOBILITY")
                        .contains(Objects.toString(exercise.getForceType(), "").toUpperCase(Locale.ROOT))
                && Set.of("COMPOUND", "ISOLATION", "MOBILITY")
                        .contains(Objects.toString(exercise.getExerciseCategory(), "").toUpperCase(Locale.ROOT))
                && exercise.getMetValue() != null
                && exercise.getMetValue().compareTo(java.math.BigDecimal.ZERO) > 0
                && exercise.getDefaultSets() != null && exercise.getDefaultSets() > 0
                && exercise.getDefaultReps() != null && exercise.getDefaultReps() > 0
                && exercise.getDefaultRestSeconds() != null && exercise.getDefaultRestSeconds() > 0;
    }

    private CatalogReadiness assessCatalogReadiness(List<Exercise> exercises) {
        int push = 0;
        int pull = 0;
        int legs = 0;
        int core = 0;
        int cardio = 0;
        for (Exercise exercise : exercises) {
            String forceType = Objects.toString(exercise.getForceType(), "").toUpperCase(Locale.ROOT);
            switch (forceType) {
                case "PUSH" -> push++;
                case "PULL" -> pull++;
                case "LEGS" -> legs++;
                case "CORE" -> core++;
                case "CARDIO" -> cardio++;
                default -> {
                }
            }
        }
        return new CatalogReadiness(push, pull, legs, core, cardio);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private record CatalogReadiness(int push, int pull, int legs, int core, int cardio) {
        private boolean ready() {
            return push >= 5
                    && pull >= 5
                    && legs >= 5
                    && core >= 2
                    && cardio >= 1
                    && core + cardio >= 5;
        }

        private String message() {
            return "Current production-ready pool: push=" + push
                    + ", pull=" + pull
                    + ", legs=" + legs
                    + ", core=" + core
                    + ", cardio=" + cardio
                    + ". Required: push>=5, pull>=5, legs>=5, core>=2, cardio>=1, core+cardio>=5.";
        }
    }

    /**
     * Delegates to GoalMapper — kept as a private method for readability.
     */
    private String mapGoalForAi(String rawGoal) {
        return GoalMapper.toAiGoal(rawGoal);
    }

    private int requirePositive(Integer value, String field, Long exerciseId) {
        if (value == null || value <= 0) {
            throw new IllegalStateException("Exercise " + exerciseId + " missing medically valid " + field);
        }
        return value;
    }

    /**
     * Lọc danh sách bài tập an toàn theo "đơn tập":
     *  - low-impact: loại bài high_impact (người lớn tuổi/rủi ro/khớp yếu),
     *  - trần độ khó: loại bài vượt maxDifficulty (EASY<MEDIUM<HARD).
     * Tier A (khỏe mạnh, lowImpact=false, maxDiff=HARD) → không loại gì.
     */
    private List<Exercise> applyPrescriptionFilter(
            List<Exercise> exercises, com.example.fitchallenge.workout.TrainingPrescription rx) {
        int maxDiffOrdinal = rx.getMaxDifficulty() != null
                ? rx.getMaxDifficulty().ordinal()
                : Exercise.DifficultyLevel.HARD.ordinal();
        return exercises.stream()
                .filter(e -> !(rx.isLowImpactOnly() && Boolean.TRUE.equals(e.getHighImpact())))
                .filter(e -> {
                    Exercise.DifficultyLevel d = e.getDifficultyLevel();
                    return d == null || d.ordinal() <= maxDiffOrdinal;
                })
                .toList();
    }

    private List<Exercise> findSafeExercisesForAi(HealthProfile healthProfile, List<String> equipment) {
        String injuries = normalize(healthProfile.getCurrentInjuries());
        boolean spineRisk    = injuries.contains("back")     || injuries.contains("spine")
                            || injuries.contains("lumbar")   || injuries.contains("disc")
                            || injuries.contains("thoat vi") || injuries.contains("cot song");
        boolean kneeRisk     = injuries.contains("knee")  || injuries.contains("goi");
        boolean shoulderRisk = injuries.contains("shoulder") || injuries.contains("vai");
        boolean wristRisk    = injuries.contains("wrist") || injuries.contains("co tay");
        // Convert to lowercase for the LOWER() IN query
        List<String> lowerEquipment = equipment.stream().map(String::toLowerCase).distinct().toList();
        List<Exercise> safeExercises = new ArrayList<>(exerciseRepository.findSafeExercises(
                lowerEquipment.isEmpty() ? null : lowerEquipment,
                spineRisk,
                kneeRisk,
                shoulderRisk,
                kneeRisk,
                wristRisk
        ));

        // Gym users still need safe bodyweight core/cardio/mobility work. Keep bodyweight
        // push/leg strength out of the gym pool, but add recovery and conditioning basics.
        if (!lowerEquipment.contains("bodyweight")) {
            Set<Long> seenIds = safeExercises.stream()
                    .map(Exercise::getId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toCollection(LinkedHashSet::new));
            List<Exercise> bodyweightAccessories = exerciseRepository.findSafeExercises(
                    List.of("bodyweight"),
                    spineRisk,
                    kneeRisk,
                    shoulderRisk,
                    kneeRisk,
                    wristRisk
            );
            for (Exercise exercise : bodyweightAccessories) {
                String forceType = Objects.toString(exercise.getForceType(), "").toUpperCase(Locale.ROOT);
                if (Set.of("CORE", "CARDIO", "MOBILITY").contains(forceType)
                        && exercise.getId() != null
                        && seenIds.add(exercise.getId())) {
                    safeExercises.add(exercise);
                }
            }
        }

        return safeExercises;
    }

    /**
     * Map a raw equipment string from the user's health profile to the normalised list of
     * equipment keys used in the Exercise catalog.
     *
     * Rules:
     *  - "gym" / "full gym" → full gym inventory (machines, barbells, dumbbells, cables,
     *                         pull-up bar) — bodyweight is intentionally EXCLUDED so that
     *                         gym users see gym exercises, not push-ups.
     *  - blank / "none"     → bodyweight only (no equipment available).
     *  - anything else      → parse the comma/semicolon list and resolve aliases.
     *                         bodyweight is NOT auto-added; include it explicitly in the
     *                         profile if the user also wants bodyweight exercises.
     *
     * The returned list is fed directly into findSafeExercises() as an IN filter on
     * requiredEquipment (case-insensitive).  An empty return means "no filter" (all
     * exercises), so returning empty must be avoided — always return at least one key.
     */
    private List<String> parseEquipment(String rawEquipment) {
        String normalized = normalize(rawEquipment);

        // Full-gym scenario: return every gym equipment key.  Bodyweight exercises
        // (push-ups, air squats …) are deliberately excluded — gym users have machines,
        // barbells and dumbbells and should not get bodyweight-only plans.
        if (normalized.contains("full gym") || normalized.contains("full_gym")
                || normalized.equals("gym") || normalized.startsWith("gym ")
                || normalized.endsWith(" gym")) {
            return List.of("dumbbell", "dumbbells", "barbell", "cable", "machine",
                    "pull_up_bar", "kettlebell", "ez_bar", "smith_machine");
        }

        // No equipment / bodyweight-only
        if (normalized.isBlank() || normalized.equals("none") || normalized.equals("bodyweight only")
                || normalized.equals("khong can") || normalized.equals("khong thiet bi")) {
            return List.of("bodyweight");
        }

        List<String> equipment = new ArrayList<>();

        // English + Vietnamese aliases — each block adds the canonical DB value(s)
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

        // If nothing matched, fall back to bodyweight so the repo always gets a valid filter
        if (equipment.isEmpty()) {
            log.warn("[parseEquipment] Unrecognised equipment string '{}' — defaulting to bodyweight", rawEquipment);
            return List.of("bodyweight");
        }

        return equipment.stream().distinct().toList();
    }

    private String normalize(String value) {
        if (value == null) return "";
        // NFD decomposes combining marks (ạ → a + ̣, ô → o + ̂) but NOT đ (U+0111 = standalone).
        // Replace Vietnamese special letters not handled by NFD before normalization.
        String replaced = value.trim().toLowerCase()
                .replace("đ", "d").replace("Đ", "d");
        String normalized = java.text.Normalizer.normalize(replaced, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return normalized.replaceAll("\\s+", " ");
    }

    private Long toLong(Object value) {
        if (value instanceof Number number) return number.longValue();
        if (value instanceof String text && !text.isBlank()) return Long.parseLong(text);
        return null;
    }

    private int toInt(Object value, Integer fallback) {
        if (value instanceof Number number) return number.intValue();
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Integer.parseInt(text.trim());
            } catch (NumberFormatException ignored) {
                return fallback != null && fallback > 0 ? fallback : 1;
            }
        }
        return fallback != null && fallback > 0 ? fallback : 1;
    }

    private double toDouble(Object value, Double fallback) {
        if (value instanceof Number number) return number.doubleValue();
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Double.parseDouble(text.trim());
            } catch (NumberFormatException ignored) {
                return fallback != null ? fallback : 0.0;
            }
        }
        return fallback != null ? fallback : 0.0;
    }

    private int parseReps(Object value, Integer fallback) {
        if (value instanceof Number number) return Math.max(1, number.intValue());
        if (value instanceof String text && !text.isBlank()) {
            java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("\\d+").matcher(text);
            if (matcher.find()) {
                return Math.max(1, Integer.parseInt(matcher.group()));
            }
        }
        return fallback != null && fallback > 0 ? fallback : 1;
    }

    @Override
    public NotificationResponse analyzePose(MultipartFile media, String exerciseType, Long userId) {
        try {
            String endpoint = aiServiceUrl + "/analyze-pose";
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("media", media.getResource());
            body.add("exercise_type", exerciseType);
            body.add("user_id", userId.toString());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(endpoint, requestEntity, Map.class);
            return new NotificationResponse(true, "Pose analysis completed", response.getBody());
        } catch (Exception e) {
            log.warn("Pose engine is not available or failed", e);
            return new NotificationResponse(false,
                    "Pose engine is not configured yet. Enable MediaPipe pose service before using this feature.");
        }
    }

    @Override
    public NotificationResponse calculateNutrition(Map<String, Object> foodData, Long userId) {
        Object rawItems = foodData.getOrDefault("items", foodData.get("foods"));
        if (!(rawItems instanceof List<?> items) || items.isEmpty()) {
            return new NotificationResponse(false, "Nutrition calculation requires items/foods array");
        }

        double calories = 0;
        double protein = 0;
        double carbs = 0;
        double fat = 0;
        for (Object raw : items) {
            if (!(raw instanceof Map<?, ?> item)) continue;
            calories += toDouble(item.get("calories"), 0.0);
            protein += toDouble(item.get("protein_g") != null ? item.get("protein_g") : item.get("protein"), 0.0);
            carbs += toDouble(item.get("carb_g") != null ? item.get("carb_g") : item.get("carbs"), 0.0);
            fat += toDouble(item.get("fat_g") != null ? item.get("fat_g") : item.get("fat"), 0.0);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("calories", Math.round(calories));
        result.put("protein_g", Math.round(protein * 10.0) / 10.0);
        result.put("carbs_g", Math.round(carbs * 10.0) / 10.0);
        result.put("fat_g", Math.round(fat * 10.0) / 10.0);
        result.put("item_count", items.size());
        return new NotificationResponse(true, "Nutrition calculated successfully", result);
    }

    @Override
    @Transactional(readOnly = true)
    public NotificationResponse chatWithCoach(Map<String, Object> chatRequest, Long userId) {
        aiUsageService.ensureAndConsume(userId, AiCreditCost.CHAT);
        log.info("AI Coach chat for user: {}", userId);
        try {
            String endpoint = aiServiceUrl + "/chat";
            chatRequest.put("user_id", userId.toString());
            chatRequest.putIfAbsent("user_context", buildCoachContext(userId));

            ResponseEntity<Map> response = restTemplate.postForEntity(endpoint, chatRequest, Map.class);
            Map<String, Object> aiResponse = response.getBody();

            if (aiResponse != null && (Boolean) aiResponse.getOrDefault("success", false)) {
                return new NotificationResponse(true, "Coach response received", aiResponse);
            } else {
                return new NotificationResponse(false, "Coach is offline (AI Service error)");
            }
        } catch (Exception e) {
            log.error("Chat proxy error", e);
            return new NotificationResponse(false, "Coach link disrupted: " + e.getMessage());
        }
    }

    // ── v2.1: Natural Language Food Logging ──────────────────────────────────
    @Override
    public NotificationResponse logFoodNatural(Map<String, Object> body, Long userId) {
        aiUsageService.ensureAndConsume(userId, AiCreditCost.CHAT);
        log.info("[v2.1] Natural language food log for user: {}", userId);
        try {
            body.put("user_id", userId.toString());
            ResponseEntity<Map> resp = restTemplate.postForEntity(aiServiceUrl + "/log-food-natural", body, Map.class);
            Map<String, Object> result = resp.getBody();
            if (result == null) return new NotificationResponse(false, "Empty response from AI service");
            DailyNutritionLog savedLog = saveNaturalFoodLog(userId, body, result);
            result.put("nutritionLogId", savedLog.getId());
            result.put("persisted", true);
            return new NotificationResponse(true, "Food log parsed successfully", result);
        } catch (Exception e) {
            log.error("[v2.1] logFoodNatural error", e);
            return new NotificationResponse(false, "Natural language food log failed: " + e.getMessage());
        }
    }

    // ── Gợi ý món ăn từ nguyên liệu ──────────────────────────────────────────
    @Override
    public NotificationResponse suggestDishesFromIngredients(Map<String, Object> body, Long userId) {
        aiUsageService.ensureAndConsume(userId, AiCreditCost.CHAT);
        log.info("Suggest dishes for user: {}", userId);
        try {
            ResponseEntity<Map> resp = restTemplate.postForEntity(aiServiceUrl + "/suggest-dishes", body, Map.class);
            Map<String, Object> result = resp.getBody();
            if (result == null || !Boolean.TRUE.equals(result.get("success"))) {
                return new NotificationResponse(false, "AI chưa gợi ý được món, thử lại nhé");
            }
            return new NotificationResponse(true, "Gợi ý món thành công", result);
        } catch (Exception e) {
            log.error("suggestDishes error", e);
            return new NotificationResponse(false, "Gợi ý món thất bại: " + e.getMessage());
        }
    }

    @Override
    public NotificationResponse suggestShoppingList(Map<String, Object> body, Long userId) {
        aiUsageService.ensureAndConsume(userId, AiCreditCost.CHAT);
        log.info("Suggest shopping for user: {}", userId);
        try {
            ResponseEntity<Map> resp = restTemplate.postForEntity(aiServiceUrl + "/suggest-shopping", body, Map.class);
            Map<String, Object> result = resp.getBody();
            if (result == null || !Boolean.TRUE.equals(result.get("success"))) {
                return new NotificationResponse(false, "AI chưa gợi ý được, thử lại nhé");
            }
            return new NotificationResponse(true, "Gợi ý mua sắm thành công", result);
        } catch (Exception e) {
            log.error("suggestShopping error", e);
            return new NotificationResponse(false, "Gợi ý mua sắm thất bại: " + e.getMessage());
        }
    }

    // ── v2.2: Auto-Regulation ────────────────────────────────────────────────
    @Override
    @Transactional
    public NotificationResponse autoRegulate(Map<String, Object> body, Long userId) {
        log.info("[v2.2] Auto-regulate for user: {}", userId);
        try {
            UserTraining userTraining = resolveUserTrainingForRegulation(body, userId);
            int currentWeek = Math.max(1, toInt(userTraining.getWeekNumber(), 1));
            int totalWeeks = Math.max(currentWeek, toInt(userTraining.getTotalWeeks(), currentWeek));
            if (currentWeek >= totalWeeks) {
                return new NotificationResponse(false, "Program already generated all weeks");
            }

            ProgramTemplate currentTemplate = programTemplateRepository
                    .findTopByUserTrainingIdAndStatusOrderByVersionNumberDesc(userTraining.getUtId(), "ACTIVE")
                    .orElseThrow(() -> new IllegalStateException("Active program template not found"));

            Map<String, Object> aiPayload = new LinkedHashMap<>(body);
            aiPayload.put("user_id", userId.toString());
            aiPayload.put("current_week", currentWeek);
            aiPayload.put("total_weeks", totalWeeks);
            aiPayload.put("current_template", programTemplateToMap(currentTemplate));
            List<Map<String, Object>> lastWeekLog = buildLastWeekLog(userTraining, currentWeek);
            aiPayload.put("last_week_log", lastWeekLog);
            aiPayload.putIfAbsent("week_summary", summarizeTrainingLogMaps(lastWeekLog));
            aiPayload.putIfAbsent("preferences", safePreferenceContext(userId));
            aiPayload.putIfAbsent("user_profile", buildAutoRegulationProfile(userId));

            ResponseEntity<Map> resp = restTemplate.postForEntity(aiServiceUrl + "/auto-regulate", aiPayload, Map.class);
            Map<String, Object> result = resp.getBody();
            if (result == null) return new NotificationResponse(false, "Empty response from AI service");

            ProgramTemplate adapted = saveAdaptedProgramTemplate(currentTemplate, result);
            NotificationResponse generation = workoutWeekGenerationService.generateNextWeek(userTraining.getUtId());

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("adaptation", result);
            response.put("templateVersion", adapted.getVersionNumber());
            response.put("generatedNextWeek", generation.isSuccess());
            response.put("generation", generation.getData());
            response.put("message", generation.getMessage());

            if (!generation.isSuccess()) {
                return new NotificationResponse(false,
                        "Auto-regulation saved template v" + adapted.getVersionNumber()
                                + " but next week generation failed: " + generation.getMessage(),
                        response);
            }

            return new NotificationResponse(true, "Auto-regulation applied and next week generated", response);
        } catch (Exception e) {
            log.error("[v2.2] autoRegulate error", e);
            return new NotificationResponse(false, "Auto-regulation failed: " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private DailyNutritionLog saveNaturalFoodLog(Long userId, Map<String, Object> request, Map<String, Object> parsed) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("User not found: " + userId));

        Map<String, Object> total = parsed.get("total") instanceof Map<?, ?> rawTotal
                ? (Map<String, Object>) rawTotal
                : Map.of();

        String mealTime = Objects.toString(
                request.getOrDefault("meal_time", request.getOrDefault("mealType", "OTHER")),
                "OTHER");
        String sourceText = Objects.toString(parsed.getOrDefault("source_text", request.getOrDefault("text", "")), "");
        String mealName = sourceText.isBlank() ? "Natural language food log" : sourceText;

        DailyNutritionLog logRow = DailyNutritionLog.builder()
                .user(user)
                .trackingDate(parseDate(request.get("trackingDate"), LocalDate.now()))
                .mealName(mealName)
                .mealType(mealTime.toUpperCase())
                .calories(toBigDecimal(total.getOrDefault("calories", parsed.getOrDefault("total_calories", 0))))
                .protein(toBigDecimal(total.getOrDefault("protein_g", total.getOrDefault("protein", 0))))
                .carbs(toBigDecimal(total.getOrDefault("carb_g", total.getOrDefault("carbs", 0))))
                .fat(toBigDecimal(total.getOrDefault("fat_g", total.getOrDefault("fat", 0))))
                .cost(0)
                .build();

        return dailyNutritionLogRepository.save(logRow);
    }

    private UserTraining resolveUserTrainingForRegulation(Map<String, Object> body, Long userId) {
        Long utId = toLong(body.getOrDefault("utId", body.get("userTrainingId")));
        if (utId != null) {
            UserTraining training = userTrainingRepository.findById(utId)
                    .orElseThrow(() -> new IllegalStateException("UserTraining not found: " + utId));
            if (!training.getUser().getId().equals(userId)) {
                throw new SecurityException("UserTraining does not belong to user " + userId);
            }
            return training;
        }
        return userTrainingRepository.findTopByUser_IdAndStatusOrderByUtIdDesc(userId, "active")
                .orElseThrow(() -> new IllegalStateException("Active UserTraining not found"));
    }

    private Map<String, Object> buildAutoRegulationProfile(Long userId) {
        Map<String, Object> profileMap = new LinkedHashMap<>();
        bodyProfileRepository.findByUser_Id(userId).ifPresent(profile -> {
            profileMap.put("weight", profile.getWeight());
            profileMap.put("goal", profile.getGoal());
            profileMap.put("fitness_level", profile.getExperienceLevel());
            profileMap.put("recommended_calories", profile.getRecommendedCalories());
        });
        return profileMap;
    }

    private Map<String, Object> buildCoachContext(Long userId) {
        Map<String, Object> context = new LinkedHashMap<>();
        context.put("body_profile", buildAutoRegulationProfile(userId));
        context.put("preferences", safePreferenceContext(userId));
        context.put("retrieval", Map.of(
                "strategy", "body_profile + active_program + recent_training_logs + recent_nutrition_logs + preferences",
                "window_days", 7,
                "generated_at", LocalDate.now().toString()
        ));

        userTrainingRepository.findTopByUser_IdAndStatusOrderByUtIdDesc(userId, "active")
                .ifPresent(training -> {
                    context.put("active_program", Map.of(
                            "ut_id", training.getUtId(),
                            "week_number", valueOrDefault(training.getWeekNumber(), 1),
                            "total_weeks", valueOrDefault(training.getTotalWeeks(), 1),
                            "current_day", valueOrDefault(training.getCurrentDay(), 1)
                    ));
                    List<DailyTrainingLog> recentLogs = dtlRepository.findByUser_IdAndTrainingPlan_TpId(
                            userId,
                            training.getTrainingPlan().getTpId());
                    context.put("training_summary", summarizeDailyTrainingLogs(recentLogs));
                    context.put("recent_training_logs", recentLogs.stream()
                            .sorted(Comparator.comparing(DailyTrainingLog::getDayNumber,
                                    Comparator.nullsLast(Integer::compareTo)).reversed())
                            .limit(12)
                            .map(logRow -> {
                                Map<String, Object> row = new LinkedHashMap<>();
                                row.put("day_number", logRow.getDayNumber());
                                row.put("status", logRow.getStatus() != null ? logRow.getStatus().name() : null);
                                row.put("sets_completed", logRow.getSetsCompleted());
                                row.put("reps_completed", logRow.getRepsCompleted());
                                row.put("fatigue", logRow.getFatigueLevel());
                                row.put("notes", logRow.getNotes());
                                return row;
                            })
                            .toList());
                });

        LocalDate today = LocalDate.now();
        List<DailyNutritionLog> nutritionLogs = dailyNutritionLogRepository
                .findByUser_IdAndTrackingDateBetween(userId, today.minusDays(7), today);
        context.put("recent_nutrition_logs", nutritionLogs.stream()
                .sorted(Comparator.comparing(DailyNutritionLog::getTrackingDate,
                        Comparator.nullsLast(LocalDate::compareTo)).reversed())
                .limit(10)
                .map(logRow -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("date", logRow.getTrackingDate());
                    row.put("meal", logRow.getMealName());
                    row.put("type", logRow.getMealType());
                    row.put("calories", logRow.getCalories());
                    row.put("protein", logRow.getProtein());
                    return row;
                })
                .toList());

        return context;
    }

    private Map<String, Object> safePreferenceContext(Long userId) {
        try {
            return userPreferenceService.buildAiPromptContext(userId);
        } catch (Exception e) {
            log.warn("Could not load preference context for user {}", userId, e);
            return Map.of();
        }
    }

    private Map<String, Object> summarizeDailyTrainingLogs(List<DailyTrainingLog> logs) {
        List<Map<String, Object>> mapped = logs.stream().map(logRow -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("status", logRow.getStatus() != null ? logRow.getStatus().name() : "NOT_STARTED");
            row.put("fatigue", logRow.getFatigueLevel());
            row.put("exercise_name", logRow.getExercise() != null ? logRow.getExercise().getExerciseName() : null);
            return row;
        }).toList();
        return summarizeTrainingLogMaps(mapped);
    }

    private Map<String, Object> summarizeTrainingLogMaps(List<Map<String, Object>> logs) {
        int total = logs.size();
        long completed = logs.stream()
                .filter(item -> "COMPLETED".equalsIgnoreCase(Objects.toString(item.get("status"), "")))
                .count();
        long skipped = logs.stream()
                .filter(item -> "SKIPPED".equalsIgnoreCase(Objects.toString(item.get("status"), "")))
                .count();
        double avgFatigue = logs.stream()
                .map(item -> item.get("fatigue"))
                .filter(Objects::nonNull)
                .mapToInt(value -> toInt(value, 0))
                .filter(value -> value > 0)
                .average()
                .orElse(0.0);
        List<String> skippedExercises = logs.stream()
                .filter(item -> "SKIPPED".equalsIgnoreCase(Objects.toString(item.get("status"), "")))
                .map(item -> Objects.toString(item.getOrDefault("exercise_name", item.get("exercise_id")), ""))
                .filter(value -> !value.isBlank())
                .distinct()
                .limit(8)
                .toList();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("total_logged_items", total);
        summary.put("completed_items", completed);
        summary.put("skipped_items", skipped);
        summary.put("completion_rate", total == 0 ? 0.0 : round1((completed * 1.0) / total));
        summary.put("avg_fatigue", round1(avgFatigue));
        summary.put("skipped_exercises", skippedExercises);
        return summary;
    }

    private List<Map<String, Object>> buildLastWeekLog(UserTraining training, int currentWeek) {
        int startDay = ((Math.max(1, currentWeek) - 1) * 7) + 1;
        int endDay = currentWeek * 7;
        List<DailyTrainingLog> logs = dtlRepository.findByUser_IdAndTrainingPlan_TpIdAndDayNumberBetween(
                training.getUser().getId(),
                training.getTrainingPlan().getTpId(),
                startDay,
                endDay);

        List<Map<String, Object>> result = new ArrayList<>();
        for (DailyTrainingLog logRow : logs) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("day_number", logRow.getDayNumber());
            item.put("status", logRow.getStatus() != null ? logRow.getStatus().name() : "NOT_STARTED");
            item.put("sets_completed", logRow.getSetsCompleted());
            item.put("reps_completed", logRow.getRepsCompleted());
            item.put("fatigue", logRow.getFatigueLevel());
            item.put("effort", logRow.getEffortLevel());
            item.put("perceived_difficulty", logRow.getPerceivedDifficulty());
            item.put("notes", logRow.getNotes());
            if (logRow.getExercise() != null) {
                item.put("exercise_id", logRow.getExercise().getId());
                item.put("exercise_name", logRow.getExercise().getExerciseName());
            }
            result.add(item);
        }
        return result;
    }

    private Map<String, Object> programTemplateToMap(ProgramTemplate template) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("goal", template.getGoal());
        result.put("weekly_pattern", readJsonOrDefault(template.getWeeklyPatternJson(), List.of()));
        result.put("exercise_pool", readJsonOrDefault(template.getExercisePoolJson(), Map.of()));
        result.put("base_sets", template.getBaseSets());
        result.put("base_reps", template.getBaseReps());
        result.put("base_rest_seconds", template.getBaseRestSeconds());
        result.put("progression_rate", template.getProgressionRate());
        result.put("duration_minutes", template.getDurationMinutes());
        result.put("intensity", template.getIntensity());
        result.put("version_number", template.getVersionNumber());
        return result;
    }

    private ProgramTemplate saveAdaptedProgramTemplate(ProgramTemplate current, Map<String, Object> aiResult) {
        int setsDelta = boundedPatchDelta(aiResult, "base_sets_delta", "sets");
        int repsDelta = boundedPatchDelta(aiResult, "base_reps_delta", "reps");
        int restDelta = boundedPatchDelta(aiResult, "base_rest_seconds_delta", "rest");

        boolean deload = Boolean.TRUE.equals(aiResult.get("deload_recommended"));
        if (deload) {
            setsDelta = Math.min(setsDelta, -1);
            restDelta = Math.max(restDelta, 15);
        }

        current.setStatus("SUPERSEDED");
        programTemplateRepository.save(current);

        ProgramTemplate adapted = new ProgramTemplate();
        adapted.setUserId(current.getUserId());
        adapted.setTrainingPlanId(current.getTrainingPlanId());
        adapted.setUserTrainingId(current.getUserTrainingId());
        adapted.setGoal(current.getGoal());
        adapted.setWeeklyPatternJson(current.getWeeklyPatternJson());
        adapted.setExercisePoolJson(current.getExercisePoolJson());
        adapted.setBaseSets(clamp(toInt(current.getBaseSets(), 3) + setsDelta, 1, 6));
        adapted.setBaseReps(clamp(toInt(current.getBaseReps(), 12) + repsDelta, 3, 30));
        adapted.setBaseRestSeconds(clamp(toInt(current.getBaseRestSeconds(), 75) + restDelta, 15, 300));
        adapted.setProgressionRate(current.getProgressionRate() != null ? current.getProgressionRate() : 0.05);
        adapted.setDurationMinutes(current.getDurationMinutes());
        adapted.setIntensity(current.getIntensity());
        adapted.setVersionNumber(toInt(current.getVersionNumber(), 1) + 1);
        adapted.setStatus("ACTIVE");
        adapted.setAdaptationNotes(writeJson(aiResult));
        return programTemplateRepository.save(adapted);
    }

    @SuppressWarnings("unchecked")
    private int boundedPatchDelta(Map<String, Object> aiResult, String patchKey, String area) {
        Object patch = aiResult.get("template_patch");
        if (patch instanceof Map<?, ?> patchMap && patchMap.get(patchKey) != null) {
            return clamp(toInt(patchMap.get(patchKey), 0), -2, 30);
        }

        Object adjustments = aiResult.get("adjustments");
        if (!(adjustments instanceof List<?> list)) {
            return 0;
        }
        int delta = 0;
        for (Object raw : list) {
            if (!(raw instanceof Map<?, ?> adj)) continue;
            String adjArea = Objects.toString(adj.get("area"), "").toLowerCase();
            if (!adjArea.contains(area)) continue;
            String text = (Objects.toString(adj.get("change"), "") + " " + Objects.toString(adj.get("reason"), "")).toLowerCase();
            if (text.contains("reduce") || text.contains("decrease") || text.contains("giảm") || text.contains("-")) {
                delta -= area.equals("rest") ? 15 : 1;
            } else if (text.contains("increase") || text.contains("tăng") || text.contains("+")) {
                delta += area.equals("rest") ? 15 : 1;
            }
        }
        return clamp(delta, area.equals("rest") ? -30 : -2, area.equals("rest") ? 30 : 2);
    }

    private Object readJsonOrDefault(String json, Object fallback) {
        if (json == null || json.isBlank()) {
            return fallback;
        }
        try {
            return mapper.readValue(json, Object.class);
        } catch (Exception e) {
            return fallback;
        }
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value instanceof BigDecimal decimal) return decimal;
        if (value instanceof Number number) return BigDecimal.valueOf(number.doubleValue());
        if (value instanceof String text && !text.isBlank()) {
            try {
                return new BigDecimal(text.trim());
            } catch (NumberFormatException ignored) {
                return BigDecimal.ZERO;
            }
        }
        return BigDecimal.ZERO;
    }

    private LocalDate parseDate(Object value, LocalDate fallback) {
        if (value instanceof String text && !text.isBlank()) {
            try {
                return LocalDate.parse(text.trim());
            } catch (Exception ignored) {
                return fallback;
            }
        }
        return fallback;
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private int valueOrDefault(Integer value, int fallback) {
        return value != null ? value : fallback;
    }
}
