package com.example.fitchallenge.controller;

import com.example.fitchallenge.Entity.UserPreference;
import com.example.fitchallenge.Entity.User;
import com.example.fitchallenge.service.UserPreferenceService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

/**
 * REST Controller: UserPreference
 * 👉 API endpoints quản lý preferences và feedback cho AI
 * 💡 Đồng bộ với AI Service preference_store
 */
@RestController
@RequestMapping("/api/preferences")

public class UserPreferenceController {

    @Autowired
    private UserPreferenceService preferenceService;

    @Autowired
    private com.example.fitchallenge.service.UserService userService;

    /**
     * 📋 GET /api/preferences/{userId} - Lấy tất cả preferences của user
     */
    @GetMapping("/{userId}")
    public ResponseEntity<?> getUserPreferences(@PathVariable Long userId) {
        try {
            // Verify user exists
            userService.getUserEntityById(userId);
            
            List<UserPreference> preferences = preferenceService.getUserPreferences(userId);
            return ResponseEntity.ok(preferences);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 📋 GET /api/preferences/{userId}/type/{type} - Lấy preferences theo type
     */
    @GetMapping("/{userId}/type/{type}")
    public ResponseEntity<?> getPreferencesByType(
            @PathVariable Long userId,
            @PathVariable String type) {
        try {
            UserPreference.PreferenceType preferenceType = UserPreference.PreferenceType.valueOf(type.toUpperCase());
            List<UserPreference> preferences = preferenceService.getPreferencesByType(userId, preferenceType);
            return ResponseEntity.ok(preferences);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 📝 POST /api/preferences/{userId}/disliked-food - Ghi nhận thực phẩm không thích
     */
    @PostMapping("/{userId}/disliked-food")
    public ResponseEntity<?> recordDislikedFood(
            @PathVariable Long userId,
            @Valid @RequestBody DislikedFoodRequest request) {
        try {
            preferenceService.recordDislikedFood(userId, request.foodName, request.reason);
            return ResponseEntity.ok(createSuccessResponse("Disliked food recorded"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 📝 POST /api/preferences/{userId}/liked-food - Ghi nhận thực phẩm yêu thích
     */
    @PostMapping("/{userId}/liked-food")
    public ResponseEntity<?> recordLikedFood(
            @PathVariable Long userId,
            @Valid @RequestBody LikedFoodRequest request) {
        try {
            preferenceService.recordLikedFood(userId, request.foodName, request.reason);
            return ResponseEntity.ok(createSuccessResponse("Liked food recorded"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 📝 POST /api/preferences/{userId}/skipped-exercise - Ghi nhận bài tập bị skip
     */
    @PostMapping("/{userId}/skipped-exercise")
    public ResponseEntity<?> recordSkippedExercise(
            @PathVariable Long userId,
            @Valid @RequestBody SkippedExerciseRequest request) {
        try {
            preferenceService.recordSkippedExercise(userId, request.exerciseName, request.reason, request.challengeId);
            return ResponseEntity.ok(createSuccessResponse("Skipped exercise recorded"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 🍳 PUT /api/preferences/{userId}/cooking-equipment - Cập nhật dụng cụ nấu ăn
     */
    @PutMapping("/{userId}/cooking-equipment")
    public ResponseEntity<?> updateCookingEquipment(
            @PathVariable Long userId,
            @Valid @RequestBody CookingEquipmentRequest request) {
        try {
            preferenceService.updateCookingEquipment(userId, request.equipment);
            return ResponseEntity.ok(createSuccessResponse("Cooking equipment updated"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * ⏱️ PUT /api/preferences/{userId}/meal-prep-time - Cập nhật thời gian chuẩn bị
     */
    @PutMapping("/{userId}/meal-prep-time")
    public ResponseEntity<?> updateMealPrepTime(
            @PathVariable Long userId,
            @Valid @RequestBody MealPrepTimeRequest request) {
        try {
            preferenceService.updateMealPrepTime(userId, request.maxPrepTimeMinutes);
            return ResponseEntity.ok(createSuccessResponse("Meal prep time updated"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 💼 PUT /api/preferences/{userId}/work-schedule - Cập nhật lịch làm việc
     */
    @PutMapping("/{userId}/work-schedule")
    public ResponseEntity<?> updateWorkSchedule(
            @PathVariable Long userId,
            @Valid @RequestBody WorkScheduleRequest request) {
        try {
            preferenceService.updateWorkSchedule(userId, request.schedule);
            return ResponseEntity.ok(createSuccessResponse("Work schedule updated"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 🍽️ GET /api/preferences/{userId}/foods-to-avoid - Lấy danh sách thực phẩm nên tránh
     */
    @GetMapping("/{userId}/foods-to-avoid")
    public ResponseEntity<?> getFoodsToAvoid(@PathVariable Long userId) {
        try {
            List<String> foods = preferenceService.getFoodsToAvoid(userId);
            return ResponseEntity.ok(foods);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 🍽️ GET /api/preferences/{userId}/foods-to-prioritize - Lấy danh sách thực phẩm ưu tiên
     */
    @GetMapping("/{userId}/foods-to-prioritize")
    public ResponseEntity<?> getFoodsToPrioritize(@PathVariable Long userId) {
        try {
            List<String> foods = preferenceService.getFoodsToPrioritize(userId);
            return ResponseEntity.ok(foods);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 🤖 GET /api/preferences/{userId}/ai-context - Lấy context cho AI prompt
     */
    @GetMapping("/{userId}/ai-context")
    public ResponseEntity<?> getAiContext(@PathVariable Long userId) {
        try {
            Map<String, Object> context = preferenceService.buildAiPromptContext(userId);
            return ResponseEntity.ok(context);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 📊 GET /api/preferences/{userId}/stats - Thống kê preferences
     */
    @GetMapping("/{userId}/stats")
    public ResponseEntity<?> getPreferenceStats(@PathVariable Long userId) {
        try {
            UserPreferenceService.PreferenceStats stats = preferenceService.getPreferenceStats(userId);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 🗑️ DELETE /api/preferences/{preferenceId} - Deactivate preference
     */
    @DeleteMapping("/{preferenceId}")
    public ResponseEntity<?> deactivatePreference(@PathVariable Long preferenceId) {
        try {
            preferenceService.deactivatePreference(preferenceId);
            return ResponseEntity.ok(createSuccessResponse("Preference deactivated"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    // 📦 Request classes
    public static class DislikedFoodRequest {
        public String foodName;
        public String reason;
    }

    public static class LikedFoodRequest {
        public String foodName;
        public String reason;
    }

    public static class SkippedExerciseRequest {
        public String exerciseName;
        public String reason;
        public Long challengeId;
    }

    public static class CookingEquipmentRequest {
        public List<String> equipment;
    }

    public static class MealPrepTimeRequest {
        public int maxPrepTimeMinutes;
    }

    public static class WorkScheduleRequest {
        public String schedule;
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
}
