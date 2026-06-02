package com.example.fitchallenge.controller.User;

import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.service.DailyTrainingLogService;
import com.example.fitchallenge.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/user/daily-training-logs")
@RequiredArgsConstructor
public class DailyTrainingLogController {

    private final DailyTrainingLogService dailyTrainingLogService;
    private final UserService userService;

    /**
     * GET /api/user/daily-training-logs/plan/{trainingPlanId}
     * Lấy tất cả daily training logs của user hiện tại trong một training plan
     * Kết hợp với challenge information từ template
     */
    @GetMapping("/plan/{trainingPlanId}")
    public ResponseEntity<NotificationResponse> getDailyTrainingLogsByPlan(
            @PathVariable Long trainingPlanId,
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestHeader(value = "userId", required = false) Long headerUserId) {
        
        Long userId = null;
        if (userDetails != null) {
            userId = userService.getUserByEmail(userDetails.getUsername()).getId();
        } else if (headerUserId != null) {
            userId = headerUserId;
        }
        
        if (userId == null) {
            return ResponseEntity.status(401).body(
                new NotificationResponse(false, "Unauthorized")
            );
        }
        
        try {
            NotificationResponse response = dailyTrainingLogService
                    .getDailyTrainingLogsByUserAndPlan(userId, trainingPlanId);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Unexpected error", e);
            return ResponseEntity.status(500).body(
                new NotificationResponse(false, "Error: " + e.getMessage())
            );
        }
    }

    /**
     * GET /api/user/daily-training-logs/plan/{trainingPlanId}/day/{dayNumber}
     * Lấy daily training logs của user hiện tại trong một training plan theo day number
     */
    @GetMapping("/plan/{trainingPlanId}/day/{dayNumber}")
    public ResponseEntity<NotificationResponse> getDailyTrainingLogsByPlanAndDay(
            @PathVariable Long trainingPlanId,
            @PathVariable Integer dayNumber,
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestHeader(value = "userId", required = false) Long headerUserId) {
        
        Long userId = null;
        if (userDetails != null) {
            userId = userService.getUserByEmail(userDetails.getUsername()).getId();
        } else if (headerUserId != null) {
            userId = headerUserId;
        }
        
        if (userId == null) {
            return ResponseEntity.status(401).body(
                new NotificationResponse(false, "Unauthorized")
            );
        }
        
        try {
            NotificationResponse response = dailyTrainingLogService
                    .getDailyTrainingLogsByUserAndPlanAndDay(userId, trainingPlanId, dayNumber);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Unexpected error", e);
            return ResponseEntity.status(500).body(
                new NotificationResponse(false, "Error: " + e.getMessage())
            );
        }
    }

    /**
     * POST /api/user/daily-training-logs
     * Tạo hoặc cập nhật daily training log
     * Nhận analysisData từ request body (JSON)
     */
    @PostMapping
    public ResponseEntity<NotificationResponse> createOrUpdateDailyTrainingLog(
            @RequestParam Long trainingPlanId,
            @RequestParam Integer dayNumber,
            @RequestParam Long challengeId,
            @RequestParam String status,
            @RequestBody(required = false) java.util.Map<String, Object> analysisData,
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestHeader(value = "userId", required = false) Long headerUserId) {
        
        log.debug("🔵 [DailyTrainingLogController] POST /daily-training-logs called");
        
        Long userId = null;
        if (userDetails != null) {
            userId = userService.getUserByEmail(userDetails.getUsername()).getId();
        } else if (headerUserId != null) {
            userId = headerUserId;
        }
        
        if (userId == null) {
            log.warn("❌ [DailyTrainingLogController] Unauthorized - No user identification found");
            return ResponseEntity.status(401).body(
                new NotificationResponse(false, "Unauthorized - User identification required")
            );
        }
        
        try {
            log.debug("✅ [DailyTrainingLogController] User ID: {}", userId);
            
            // Extract analysis data from request body
            Integer repsCompleted = null;
            Integer setsCompleted = null;
            Integer score = null;
            Double confidence = null;
            Integer actualDurationMinutes = null;
            Integer fatigueLevel = null;
            Double sleepHours = null;
            Integer perceivedDifficulty = null; // RPE 1-10 (input cho auto-regulation)
            Integer caloriesBurnedFromClient = null; // kcal từ FE (estimatedCalories của bài)
            
            if (analysisData != null) {
                if (analysisData.containsKey("repsCompleted")) {
                    repsCompleted = analysisData.get("repsCompleted") instanceof Integer 
                            ? (Integer) analysisData.get("repsCompleted")
                            : ((Number) analysisData.get("repsCompleted")).intValue();
                }
                if (analysisData.containsKey("setsCompleted")) {
                    setsCompleted = analysisData.get("setsCompleted") instanceof Integer 
                            ? (Integer) analysisData.get("setsCompleted")
                            : ((Number) analysisData.get("setsCompleted")).intValue();
                }
                if (analysisData.containsKey("score")) {
                    score = analysisData.get("score") instanceof Integer 
                            ? (Integer) analysisData.get("score")
                            : ((Number) analysisData.get("score")).intValue();
                }
                if (analysisData.containsKey("confidence")) {
                    confidence = analysisData.get("confidence") instanceof Double 
                            ? (Double) analysisData.get("confidence")
                            : ((Number) analysisData.get("confidence")).doubleValue();
                }
                if (analysisData.containsKey("actualDurationMinutes")) {
                    actualDurationMinutes = analysisData.get("actualDurationMinutes") instanceof Integer 
                            ? (Integer) analysisData.get("actualDurationMinutes")
                            : ((Number) analysisData.get("actualDurationMinutes")).intValue();
                }
                if (analysisData.containsKey("fatigueLevel")) {
                    fatigueLevel = analysisData.get("fatigueLevel") instanceof Integer
                            ? (Integer) analysisData.get("fatigueLevel")
                            : ((Number) analysisData.get("fatigueLevel")).intValue();
                }
                if (analysisData.containsKey("sleepHours")) {
                    sleepHours = analysisData.get("sleepHours") instanceof Double
                            ? (Double) analysisData.get("sleepHours")
                            : ((Number) analysisData.get("sleepHours")).doubleValue();
                }
                if (analysisData.containsKey("perceivedDifficulty")) {
                    perceivedDifficulty = analysisData.get("perceivedDifficulty") instanceof Integer
                            ? (Integer) analysisData.get("perceivedDifficulty")
                            : ((Number) analysisData.get("perceivedDifficulty")).intValue();
                }
                // Nhận caloriesBurned từ client (= estimatedCalories của bài tập trong plan)
                if (analysisData.containsKey("caloriesBurned")) {
                    caloriesBurnedFromClient = ((Number) analysisData.get("caloriesBurned")).intValue();
                }
            }
            
            log.debug("📤 [DailyTrainingLogController] Calling service with:");
            log.debug("   - userId: {}", userId);
            log.debug("   - repsCompleted: {}", repsCompleted);
            log.debug("   - setsCompleted: {}", setsCompleted);
            log.debug("   - score: {}", score);
            log.debug("   - confidence: {}", confidence);
            log.debug("   - actualDurationMinutes: {}", actualDurationMinutes);
            
            NotificationResponse response = dailyTrainingLogService
                    .createOrUpdateDailyTrainingLog(
                            userId, trainingPlanId, dayNumber, challengeId, status,
                            repsCompleted, setsCompleted, score, confidence,
                            actualDurationMinutes, fatigueLevel, sleepHours,
                            caloriesBurnedFromClient, perceivedDifficulty);
            
            log.debug("✅ [DailyTrainingLogController] Service response: {}", (response.isSuccess() ? "SUCCESS" : "FAILED") + 
                    " - " + response.getMessage());
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.warn("❌ [DailyTrainingLogController] IllegalArgumentException: {}", e.getMessage());
            log.error("Unexpected error", e);
            return ResponseEntity.badRequest().body(
                new NotificationResponse(false, "Invalid request: " + e.getMessage())
            );
        } catch (RuntimeException e) {
            log.warn("❌ [DailyTrainingLogController] RuntimeException: {}", e.getMessage());
            log.error("Unexpected error", e);
            return ResponseEntity.status(400).body(
                new NotificationResponse(false, e.getMessage())
            );
        } catch (Exception e) {
            log.warn("❌ [DailyTrainingLogController] Exception occurred:");
            log.error("Unexpected error", e);
            return ResponseEntity.status(500).body(
                new NotificationResponse(false, "Internal server error: " + e.getMessage())
            );
        }
    }
}
