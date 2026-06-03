package com.example.fitchallenge.controller;

import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.service.AIGatewayService;
import com.example.fitchallenge.service.SmartMealPlanService;
import com.example.fitchallenge.service.impl.WorkoutWeekGenerationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "AI Gateway", description = "AI-powered features - Food Scanner and Meal Generation")
public class AIGatewayController {

    private final AIGatewayService aiGatewayService;
    private final SmartMealPlanService smartMealPlanService;
    private final WorkoutWeekGenerationService workoutWeekGenerationService;

    /**
     * AI Food Scanner - Analyze food image
     * Proxy to FastAPI Model 3 for food recognition
     */
    @PostMapping("/food-analysis/scan")
    @Operation(summary = "Scan food image", description = "Analyze food image using AI to identify items and calculate nutrition")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Food analysis completed"),
        @ApiResponse(responseCode = "400", description = "Invalid image format"),
        @ApiResponse(responseCode = "500", description = "AI service unavailable")
    })
    public ResponseEntity<NotificationResponse> scanFood(
            @Parameter(description = "Food image file") @RequestParam("image") MultipartFile image,
            @Parameter(description = "User ID for personalization") @RequestHeader("userId") Long userId) {
        try {
            NotificationResponse response = aiGatewayService.scanFoodImage(image, userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                new NotificationResponse(false, "Food scan failed: " + e.getMessage())
            );
        }
    }

    /**
     * AI Meal Generation - Generate personalized meal plan
     * Proxy to FastAPI Model 2 for meal planning
     */
    @PostMapping("/ai-plans/generate-meal")
    @Operation(summary = "Generate AI meal plan", description = "Generate personalized meal plan based on user preferences and goals")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Meal plan generated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid input parameters"),
        @ApiResponse(responseCode = "500", description = "AI service unavailable")
    })
    public ResponseEntity<NotificationResponse> generateMealPlan(
            @Parameter(description = "Meal generation request") @RequestBody Map<String, Object> request,
            @Parameter(description = "User ID") @RequestHeader("userId") Long userId) {
        try {
            NotificationResponse response = aiGatewayService.generateMealPlan(request, userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                new NotificationResponse(false, "Meal generation failed: " + e.getMessage())
            );
        }
    }

    @PostMapping("/ai-plans/generate-meal-hybrid")
    @Operation(summary = "Generate Hybrid Smart Meal plan", description = "Groq selects dish_id only; Java solves ingredients, grams, macros and cost")
    public ResponseEntity<NotificationResponse> generateHybridMealPlan(
            @Parameter(description = "Hybrid meal generation request") @RequestBody Map<String, Object> request,
            @Parameter(description = "User ID") @RequestHeader("userId") Long userId) {
        try {
            int days = ((Number) request.getOrDefault("days", 7)).intValue();
            int budget = ((Number) request.getOrDefault("budget", 80000)).intValue();
            var plan = smartMealPlanService.generateHybridPlan(userId, days, budget);
            return ResponseEntity.ok(new NotificationResponse(true, "Hybrid meal plan generated successfully", Map.of(
                    "planId", plan.getPnpId(),
                    "aiPlanId", plan.getAiPlanId(),
                    "durationDays", plan.getDurationDays(),
                    "estimatedTotalCost", plan.getEstimatedTotalCost(),
                    "targetBudgetPerDay", plan.getTargetBudgetPerDay()
            )));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                new NotificationResponse(false, "Hybrid meal generation failed: " + e.getMessage())
            );
        }
    }

    @PostMapping("/ai-plans/generate-workout")
    @Operation(summary = "Generate AI workout plan", description = "Generate personalized workout plan based on user fitness level and equipment")
    public ResponseEntity<NotificationResponse> generateWorkoutPlan(
            @Parameter(description = "Workout generation request") @RequestBody Map<String, Object> request,
            @Parameter(description = "User ID") @RequestHeader("userId") Long userId) {
        try {
            NotificationResponse response = aiGatewayService.generateWorkoutPlan(request, userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                new NotificationResponse(false, "Workout generation failed: " + e.getMessage())
            );
        }
    }

    @PostMapping("/ai-plans/workout/{utId}/generate-next-week")
    @Operation(summary = "Generate next workout week", description = "Generate the next 7 days from the stored program template without calling AI")
    public ResponseEntity<NotificationResponse> generateNextWorkoutWeek(
            @Parameter(description = "UserTraining ID") @PathVariable Long utId) {
        NotificationResponse response = workoutWeekGenerationService.generateNextWeek(utId);
        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.badRequest().body(response);
    }

    /**
     * AI Pose Engine - Analyze exercise form
     * Proxy to FastAPI for pose detection
     */
    @PostMapping("/ai-analysis/pose")
    @Operation(summary = "Analyze exercise pose", description = "Analyze exercise form using AI pose detection")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Pose analysis completed"),
        @ApiResponse(responseCode = "400", description = "Invalid video/image format"),
        @ApiResponse(responseCode = "500", description = "AI service unavailable")
    })
    public ResponseEntity<NotificationResponse> analyzePose(
            @Parameter(description = "Exercise video/image file") @RequestParam(value = "media", required = false) MultipartFile media,
            @Parameter(description = "Exercise type") @RequestParam(value = "exerciseType", required = false) String exerciseType,
            @Parameter(description = "User ID") @RequestHeader("userId") Long userId) {
        // ── Validate input → trả 400 rõ ràng thay vì 500 ──────────────────────
        if (media == null || media.isEmpty()) {
            return ResponseEntity.badRequest().body(
                new NotificationResponse(false, "Thiếu ảnh/video (field 'media') để phân tích tư thế"));
        }
        if (exerciseType == null || exerciseType.isBlank()) {
            return ResponseEntity.badRequest().body(
                new NotificationResponse(false, "Thiếu loại bài tập (field 'exerciseType')"));
        }
        try {
            NotificationResponse response = aiGatewayService.analyzePose(media, exerciseType, userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                new NotificationResponse(false, "Pose analysis failed: " + e.getMessage())
            );
        }
    }

    /**
     * AI Nutrition Calculator - Calculate nutrition from food list
     */
    @PostMapping("/ai-analysis/nutrition")
    @Operation(summary = "Calculate nutrition", description = "Calculate total nutrition from food items")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Nutrition calculated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid food data"),
        @ApiResponse(responseCode = "500", description = "Calculation failed")
    })
    public ResponseEntity<NotificationResponse> calculateNutrition(
            @Parameter(description = "Food items list") @RequestBody Map<String, Object> foodData,
            @Parameter(description = "User ID") @RequestHeader("userId") Long userId) {
        try {
            NotificationResponse response = aiGatewayService.calculateNutrition(foodData, userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                new NotificationResponse(false, "Nutrition calculation failed: " + e.getMessage())
            );
        }
    }
 
    @PostMapping("/inventory/scan")
    @Operation(summary = "Scan inventory image", description = "Identify food items from image to add to inventory")
    public ResponseEntity<NotificationResponse> scanInventory(
            @RequestParam("image") MultipartFile image,
            @RequestHeader("userId") Long userId) {
        try {
            NotificationResponse response = aiGatewayService.scanInventoryImage(image, userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                new NotificationResponse(false, "Inventory scan failed: " + e.getMessage())
            );
        }
    }
 
    @PostMapping("/ai-coach/chat")
    @Operation(summary = "Chat with AI Coach", description = "Get personalized fitness and nutrition advice")
    public ResponseEntity<NotificationResponse> chatWithCoach(
            @RequestBody Map<String, Object> chatRequest,
            @RequestHeader("userId") Long userId) {
        try {
            NotificationResponse response = aiGatewayService.chatWithCoach(chatRequest, userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                new NotificationResponse(false, "Chat failed: " + e.getMessage())
            );
        }
    }

    // ── v2.1: Natural Language Food Logging ──────────────────────────────────
    @PostMapping("/ai-plans/log-food-natural")
    @Operation(summary = "Log food via natural language",
               description = "v2.1 — Parse free-text food description into structured nutrition data. E.g. 'Sáng ăn 2 trứng và 1 bát phở bò'")
    public ResponseEntity<NotificationResponse> logFoodNatural(
            @RequestBody Map<String, Object> body,
            @RequestHeader("userId") Long userId) {
        try {
            NotificationResponse response = aiGatewayService.logFoodNatural(body, userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                new NotificationResponse(false, "Natural language food log failed: " + e.getMessage())
            );
        }
    }

    @PostMapping("/ai-plans/suggest-dishes")
    @Operation(summary = "Suggest dishes from ingredients",
               description = "Nhập nguyên liệu đang có → AI gợi ý món Việt nấu được (tên, nguyên liệu, calo ước tính, cách làm ngắn)")
    public ResponseEntity<NotificationResponse> suggestDishes(
            @RequestBody Map<String, Object> body,
            @RequestHeader("userId") Long userId) {
        try {
            NotificationResponse response = aiGatewayService.suggestDishesFromIngredients(body, userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                new NotificationResponse(false, "Gợi ý món thất bại: " + e.getMessage())
            );
        }
    }

    // ── v2.2: Auto-Regulation ────────────────────────────────────────────────
    @PostMapping("/ai-plans/auto-regulate")
    @Operation(summary = "Auto-regulate next week's plan",
               description = "v2.2 — Analyze last week's actual performance (RPE, completed sets, notes) and generate adaptive adjustments for next week")
    public ResponseEntity<NotificationResponse> autoRegulate(
            @RequestBody Map<String, Object> body,
            @RequestHeader("userId") Long userId) {
        try {
            NotificationResponse response = aiGatewayService.autoRegulate(body, userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                new NotificationResponse(false, "Auto-regulation failed: " + e.getMessage())
            );
        }
    }
}
