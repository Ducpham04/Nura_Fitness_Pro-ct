package com.example.fitchallenge.controller;

import com.example.fitchallenge.DTO.PersonalizedNutritionDTO.PersonalizedMealDetailResponse;
import com.example.fitchallenge.DTO.PersonalizedNutritionDTO.PersonalizedMealItemResponse;
import com.example.fitchallenge.Entity.Food;
import com.example.fitchallenge.Entity.PersonalizedMealItem;
import com.example.fitchallenge.DTO.PersonalizedNutritionDTO.PersonalizedNutritionPlanResponse;
import com.example.fitchallenge.Entity.PersonalizedMealDetail;
import com.example.fitchallenge.Entity.PersonalizedNutritionPlan;
import com.example.fitchallenge.Entity.User;
import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.service.PersonalizedNutritionPlanService;
import com.example.fitchallenge.service.SmartMealPlanTransactionService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * REST Controller: PersonalizedNutritionPlan
 * 👉 API endpoints quản lý AI-generated meal plans{
 *   "user_id": "user_test_123",
 *   "user_profile": {
 *     "weight": 70,
 *     "height": 175,
 *     "age": 30,
 *     "gender": "male",
 *     "body_fat_percentage": 18,
 *     "activity_level": "moderate",
 *     "goal": "muscle_gain",
 *     "budget_per_day": 150000,
 *     "fitness_level": "intermediate",
 *     "dietary_restrictions": []
 *   },
 *   "days": 3,
 *   "preferences": [],
 *   "workout_intensity": "moderate",
 *   "available_equipment": ["Tạ đôi"],
 *   "workout_duration_minutes": 60
 *
 * 💡 Tích hợp với AI Service để tạo và quản lý plans
 */
@Slf4j
@RestController
@RequestMapping("/api/personalized-plans")

public class PersonalizedNutritionPlanController {

    @Autowired
    private PersonalizedNutritionPlanService planService;

    @Autowired
    private com.example.fitchallenge.service.UserService userService;

    @Autowired
    private com.example.fitchallenge.service.SmartMealPlanService smartMealPlanService;

    @Autowired
    private com.example.fitchallenge.Security.AuthenticatedUserIdResolver authUser;

    @Autowired
    private com.example.fitchallenge.service.SwapLimitService swapLimitService;

    /**
     * 📋 GET /api/personalized-plans/{userId} - Lấy tất cả plans của user
     */
    @GetMapping("/{userId}")
    public ResponseEntity<?> getUserPlans(
            @PathVariable Long userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            if (userDetails == null) {
                return ResponseEntity.status(401).body(createErrorResponse("Unauthorized"));
            }
            
            // Verify the authenticated user matches the requested userId
            Long authenticatedUserId = userService.getUserByEmail(userDetails.getUsername()).getId();
            if (!authenticatedUserId.equals(userId)) {
                return ResponseEntity.status(403).body(createErrorResponse("Forbidden: User ID mismatch"));
            }
            
            List<PersonalizedNutritionPlan> plans = planService.getUserPlans(userId);
            return ResponseEntity.ok(plans);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 📋 GET /api/personalized-plans/{userId}/active - Lấy active plan
     */
    @GetMapping("/{userId}/active")
    public ResponseEntity<NotificationResponse> getActivePlan(
            @PathVariable Long userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        log.debug("🔍 [Controller] GET /api/personalized-plans/{}", userId + "/active called");
        try {
            if (userDetails == null) {
                log.debug("❌ [Controller] Unauthorized - no user details");
                return ResponseEntity.status(401).body(new NotificationResponse(false, "Unauthorized"));
            }
            
            // Verify the authenticated user matches the requested userId
            Long authenticatedUserId = userService.getUserByEmail(userDetails.getUsername()).getId();
            if (!authenticatedUserId.equals(userId)) {
                log.debug("❌ [Controller] Forbidden - User ID mismatch: {}", authenticatedUserId + " != " + userId);
                return ResponseEntity.status(403).body(new NotificationResponse(false, "Forbidden: User ID mismatch"));
            }
            
            log.debug("✅ [Controller] User authenticated: {}", userDetails.getUsername());
            
            Optional<com.example.fitchallenge.Entity.PersonalizedNutritionPlan> planOpt = planService.getActivePlan(userId);
            
            if (planOpt.isPresent()) {
                com.example.fitchallenge.Entity.PersonalizedNutritionPlan plan = planOpt.get();
                log.debug("✅ [Controller] Returning active plan - ID: {}", plan.getPnpId() + ", Status: " + plan.getStatus());
                return ResponseEntity.ok(new NotificationResponse(true, "Active plan retrieved", toPlanResponse(plan)));
            } else {
                log.debug("⚠️ [Controller] No active plan found, returning null data");
                return ResponseEntity.ok(new NotificationResponse(true, "No active plan", null));
            }
        } catch (Exception e) {
            log.debug("❌ [Controller] Error getting active plan: {}", e.getMessage());
            log.error("Unexpected error", e);
            return ResponseEntity.badRequest().body(new NotificationResponse(false, e.getMessage()));
        }
    }

    /**
     * 📋 GET /api/personalized-plans/{userId}/{planId} - Lấy plan chi tiết
     */
    @GetMapping("/{userId}/{planId}")
    public ResponseEntity<?> getPlan(
            @PathVariable Long userId,
            @PathVariable Long planId,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            if (userDetails == null) {
                return ResponseEntity.status(401).body(createErrorResponse("Unauthorized"));
            }
            
            Long authenticatedUserId = userService.getUserByEmail(userDetails.getUsername()).getId();
            if (!authenticatedUserId.equals(userId)) {
                return ResponseEntity.status(403).body(createErrorResponse("Forbidden: User ID mismatch"));
            }
            
            PersonalizedNutritionPlan plan = planService.getPlan(planId, userId);
            return ResponseEntity.ok(plan);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 🆕 POST /api/personalized-plans/{userId}/create - Tạo plan mới từ AI
     */
    @PostMapping("/{userId}/create")
    public ResponseEntity<?> createPlan(@PathVariable Long userId, @Valid @RequestBody CreatePlanRequest request) {
        userId = authUser.resolve(userId); // chống tạo plan dưới tài khoản người khác
        try {
            PersonalizedNutritionPlan plan = planService.createPlan(
                userId,
                request.aiPlanId,
                request.startDate,
                request.durationDays,
                request.budgetPerDay,
                request.targetCalories,
                request.targetProtein,
                request.targetCarbs,
                request.targetFat,
                request.aiContext
            );
            return ResponseEntity.ok(plan);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 🍽️ POST /api/personalized-plans/{planId}/meals - Thêm meal details
     */
    @PostMapping("/{planId}/meals")
    public ResponseEntity<?> addMealDetails(
            @PathVariable Long planId,
            @Valid @RequestBody List<PersonalizedNutritionPlanService.MealDetailRequest> meals) {
        try {
            planService.addMealDetails(planId, authUser.resolve(null), meals);
            return ResponseEntity.ok(createSuccessResponse("Meals added successfully"));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 📅 GET /api/personalized-plans/{planId}/day/{dayNumber} - Lấy meals của một ngày
     */
    @GetMapping("/{planId}/day/{dayNumber}")
    public ResponseEntity<NotificationResponse> getDayMeals(
            @PathVariable Long planId,
            @PathVariable Integer dayNumber,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            if (userDetails == null) {
                return ResponseEntity.status(401).body(new NotificationResponse(false, "Unauthorized"));
            }

            Long authenticatedUserId = userService.getUserByEmail(userDetails.getUsername()).getId();
            planService.getPlan(planId, authenticatedUserId);

            List<PersonalizedMealDetail> meals = planService.getDayMeals(planId, dayNumber);
            List<PersonalizedMealDetailResponse> response = meals.stream()
                    .map(this::toMealDetailResponse)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(new NotificationResponse(true, "Day meals retrieved", response));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new NotificationResponse(false, e.getMessage()));
        }
    }

    /**
     * 🔄 POST /api/personalized-plans/meals/{mealDetailId}/swap-dish - Đổi sang món khác cùng vai trò
     */
    @PostMapping("/meals/{mealDetailId}/swap-dish")
    public ResponseEntity<NotificationResponse> swapMealDish(
            @PathVariable Long mealDetailId,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            if (userDetails == null) {
                return ResponseEntity.status(401).body(new NotificationResponse(false, "Unauthorized"));
            }
            Long authenticatedUserId = userService.getUserByEmail(userDetails.getUsername()).getId();
            swapLimitService.ensureAndConsume(authenticatedUserId, com.example.fitchallenge.service.SwapLimitService.SwapType.MEAL);
            com.example.fitchallenge.Entity.PersonalizedMealDetail updated =
                    smartMealPlanService.swapMealDish(mealDetailId, authenticatedUserId);
            return ResponseEntity.ok(new NotificationResponse(true, "Dish swapped successfully", toMealDetailResponse(updated)));
        } catch (com.example.fitchallenge.exception.QuotaExceededException e) {
            return ResponseEntity.status(429).body(new NotificationResponse(false, e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(new NotificationResponse(false, e.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(new NotificationResponse(false, e.getMessage()));
        } catch (Exception e) {
            log.error("Swap dish failed for mealDetailId={}", mealDetailId, e);
            return ResponseEntity.status(500).body(new NotificationResponse(false, "Swap failed: " + e.getMessage()));
        }
    }

    /**
     * ✅ PUT /api/personalized-plans/meals/{mealDetailId}/feedback - Cập nhật feedback
     */
    @PutMapping("/meals/{mealDetailId}/feedback")
    public ResponseEntity<?> updateMealFeedback(
            @PathVariable Long mealDetailId,
            @Valid @RequestBody MealFeedbackRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            if (userDetails == null) {
                return ResponseEntity.status(401).body(createErrorResponse("Unauthorized"));
            }

            Long authenticatedUserId = userService.getUserByEmail(userDetails.getUsername()).getId();
            planService.updateMealFeedback(mealDetailId, authenticatedUserId, request.wasEaten, request.rating, request.feedback);
            return ResponseEntity.ok(createSuccessResponse("Feedback updated successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 💰 PUT /api/personalized-plans/{planId}/actual-cost - Cập nhật chi phí thực tế
     */
    @PutMapping("/{planId}/actual-cost")
    public ResponseEntity<?> updateActualCost(
            @PathVariable Long planId,
            @Valid @RequestBody ActualCostRequest request) {
        try {
            planService.updateActualCost(planId, authUser.resolve(null), request.actualCost);
            return ResponseEntity.ok(createSuccessResponse("Actual cost updated successfully"));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * ✅ POST /api/personalized-plans/{planId}/complete - Hoàn thành plan
     */
    @PostMapping("/{planId}/complete")
    public ResponseEntity<?> completePlan(@PathVariable Long planId) {
        try {
            planService.completePlan(planId, authUser.resolve(null));
            return ResponseEntity.ok(createSuccessResponse("Plan marked as completed"));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 📊 GET /api/personalized-plans/{userId}/budget-report - Lấy budget report
     */
    @GetMapping("/{userId}/budget-report")
    public ResponseEntity<?> getBudgetReport(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        userId = authUser.resolve(userId); // chống đọc báo cáo ngân sách người khác
        try {
            PersonalizedNutritionPlanService.BudgetReport report = planService.getBudgetReport(userId, startDate, endDate);
            return ResponseEntity.ok(report);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 🗑️ DELETE /api/personalized-plans/{userId}/{planId} - Xóa plan (soft delete)
     */
    @DeleteMapping("/{userId}/{planId}")
    public ResponseEntity<?> deletePlan(@PathVariable Long userId, @PathVariable Long planId) {
        userId = authUser.resolve(userId); // chống xoá plan người khác (service scope theo userId)
        try {
            planService.deletePlan(planId, userId);
            return ResponseEntity.ok(createSuccessResponse("Plan deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 🔄 POST /api/personalized-plans/{planId}/restore - Khôi phục plan
     */
    @PostMapping("/{planId}/restore")
    public ResponseEntity<?> restorePlan(@PathVariable Long planId) {
        try {
            planService.restorePlan(planId, authUser.resolve(null));
            return ResponseEntity.ok(createSuccessResponse("Plan restored successfully"));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    // 📦 Request/Response classes
    public static class CreatePlanRequest {
        public String aiPlanId;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        public LocalDate startDate;
        public Integer durationDays;
        public Integer budgetPerDay;
        public Double targetCalories;
        public Double targetProtein;
        public Double targetCarbs;
        public Double targetFat;
        public String aiContext;
    }

    public static class MealFeedbackRequest {
        public Boolean wasEaten;
        public Integer rating;
        public String feedback;
    }

    public static class ActualCostRequest {
        public Integer actualCost;
    }

    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("error", message);
        return response;
    }

    private Map<String, Object> createSuccessResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", message);
        return response;
    }

    private PersonalizedNutritionPlanResponse toPlanResponse(PersonalizedNutritionPlan plan) {
        if (plan == null) {
            return null;
        }

        return PersonalizedNutritionPlanResponse.builder()
                .pnpId(plan.getPnpId())
                .aiPlanId(plan.getAiPlanId())
                .version(plan.getVersion())
                .startDate(plan.getStartDate())
                .endDate(plan.getEndDate())
                .durationDays(plan.getDurationDays())
                .targetBudgetPerDay(plan.getTargetBudgetPerDay())
                .estimatedTotalCost(plan.getEstimatedTotalCost())
                .actualTotalCost(plan.getActualTotalCost())
                .targetCalories(plan.getTargetCalories())
                .targetProtein(plan.getTargetProtein())
                .targetCarbs(plan.getTargetCarbs())
                .targetFat(plan.getTargetFat())
                .status(plan.getStatus() != null ? plan.getStatus().name() : null)
                .isDeleted(plan.getIsDeleted())
                .createdAt(plan.getCreatedAt())
                .updatedAt(plan.getUpdatedAt())
                .build();
    }

    /** Ảnh đại diện bữa ăn: ưu tiên ảnh món (dish), fallback ảnh nguyên liệu (food). */
    private String pickMealImage(PersonalizedMealDetail meal) {
        if (meal == null || meal.getMealItems() == null) return null;
        String foodImg = null;
        for (PersonalizedMealItem mi : meal.getMealItems()) {
            if (mi.getDish() != null && mi.getDish().getImageUrl() != null && !mi.getDish().getImageUrl().isBlank()) {
                return mi.getDish().getImageUrl();
            }
            if (foodImg == null && mi.getFood() != null && mi.getFood().getImageUrl() != null && !mi.getFood().getImageUrl().isBlank()) {
                foodImg = mi.getFood().getImageUrl();
            }
        }
        return foodImg;
    }

    private PersonalizedMealDetailResponse toMealDetailResponse(PersonalizedMealDetail meal) {
        if (meal == null) {
            return null;
        }

        List<PersonalizedMealItemResponse> mealItems =
                meal.getMealItems() == null ? Collections.emptyList() :
                        meal.getMealItems().stream().map(mi -> mapMealItem(mi)).collect(Collectors.toList());

        return PersonalizedMealDetailResponse.builder()
                .pmdId(meal.getPmdId())
                .dayNumber(meal.getDayNumber())
                .mealType(meal.getMealType() != null ? meal.getMealType().name() : null)
                .mealName(suggestMealName(meal, mealItems))
                .imageUrl(pickMealImage(meal))
                .mealItemsJson(meal.getMealItemsJson())
                .mealItems(mealItems)
                .totalCalories(meal.getTotalCalories())
                .totalProtein(meal.getTotalProtein())
                .totalCarbs(meal.getTotalCarbs())
                .totalFat(meal.getTotalFat())
                .estimatedCost(meal.getEstimatedCost())
                .prepTimeMinutes(meal.getPrepTimeMinutes())
                .cookingInstructions(meal.getCookingInstructions())
                .wasEaten(meal.getWasEaten())
                .userRating(meal.getUserRating())
                .userFeedback(meal.getUserFeedback())
                .skipReason(meal.getSkipReason())
                .aiPromptVersion(meal.getAiPromptVersion())
                .createdAt(meal.getCreatedAt())
                .updatedAt(meal.getUpdatedAt())
                .build();
    }

    private String suggestMealName(PersonalizedMealDetail meal, List<PersonalizedMealItemResponse> mealItems) {
        if (meal.getDish() != null && meal.getDish().getDishName() != null && !meal.getDish().getDishName().isBlank()) {
            return meal.getDish().getDishName();
        }

        String mealType = meal.getMealType() != null ? meal.getMealType().name() : "MEAL";
        List<String> names = mealItems == null ? Collections.emptyList() : mealItems.stream()
                .map(PersonalizedMealItemResponse::getFoodName)
                .filter(name -> name != null && !name.isBlank())
                .toList();

        if (names.isEmpty()) {
            return switch (mealType) {
                case "BREAKFAST" -> "Bữa sáng cân bằng";
                case "LUNCH" -> "Bữa trưa cân bằng";
                case "DINNER" -> "Bữa tối cân bằng";
                case "SNACK" -> "Bữa phụ thông minh";
                default -> "Món ăn cân bằng";
            };
        }

        String primary = names.get(0);
        Optional<String> carb = names.stream()
                .filter(name -> containsAny(name, "cơm", "rice", "bún", "phở", "mì", "noodle", "khoai", "bread", "oats"))
                .findFirst();
        Optional<String> protein = names.stream()
                .filter(name -> containsAny(name, "gà", "chicken", "bò", "beef", "heo", "pork", "cá", "fish", "tôm", "shrimp", "trứng", "egg", "đậu", "tofu"))
                .findFirst();
        Optional<String> vegetable = names.stream()
                .filter(name -> containsAny(name, "rau", "cải", "salad", "broccoli", "spinach", "cucumber", "tomato"))
                .findFirst();

        if (carb.isPresent() && protein.isPresent()) {
            return carb.get() + " với " + protein.get();
        }
        if (protein.isPresent() && vegetable.isPresent()) {
            return protein.get() + " và " + vegetable.get();
        }
        if (names.size() >= 2) {
            return primary + " cùng " + names.get(1);
        }
        return primary;
    }

    private boolean containsAny(String value, String... keywords) {
        String lower = value.toLowerCase();
        for (String keyword : keywords) {
            if (lower.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    private PersonalizedMealItemResponse mapMealItem(PersonalizedMealItem mi) {
        Food food = mi.getFood();
        var ln = SmartMealPlanTransactionService.nutritionForLine(food, mi.getQuantityGrams());
        double calories = mi.getLineCalories() != null ? mi.getLineCalories() : ln.calories();
        double protein = mi.getLineProtein() != null ? mi.getLineProtein() : ln.protein();
        double carbs = mi.getLineCarbs() != null ? mi.getLineCarbs() : ln.carbs();
        double fat = mi.getLineFat() != null ? mi.getLineFat() : ln.fat();
        int cost = mi.isFromInventory() ? 0 : (mi.getLineCostVnd() != null ? mi.getLineCostVnd() : ln.costVnd());
        return PersonalizedMealItemResponse.builder()
                .pmiId(mi.getPmiId())
                .foodId(food != null ? food.getFoodId() : null)
                .foodName(food != null ? food.getName() : null)
                .quantityGrams(mi.getQuantityGrams())
                .fromInventory(mi.isFromInventory())
                .lineCalories(calories)
                .lineProtein(protein)
                .lineCarbs(carbs)
                .lineFat(fat)
                .lineEstimatedCost(cost)
                .build();
    }
}
