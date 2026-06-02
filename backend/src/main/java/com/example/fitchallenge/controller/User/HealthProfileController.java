package com.example.fitchallenge.controller.User;

import com.example.fitchallenge.DTO.HealthProfileDTO.HealthProfileRequest;
import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.service.HealthProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/user/health-profile")
@RequiredArgsConstructor
public class HealthProfileController {

    private final HealthProfileService healthProfileService;
    private final com.example.fitchallenge.service.UserService userService;

    /**
     * Tạo hoặc cập nhật Health Profile
     * Tự động tính toán BMI, BMR, TDEE, Body Fat, Lean Body Mass
     */
    @PostMapping
    public ResponseEntity<NotificationResponse> createOrUpdateHealthProfile(
            @Valid @RequestBody HealthProfileRequest request) {
        try {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || auth.getName() == null) {
                return ResponseEntity.ok(new NotificationResponse(false, "Unauthorized: No authentication found"));
            }
            Long userId = userService.getUserByEmail(auth.getName()).getId();
            return ResponseEntity.ok(healthProfileService.createOrUpdateHealthProfile(userId, request));
        } catch (Exception e) {
            log.error("Unexpected error", e);
            return ResponseEntity.ok(new NotificationResponse(false, "Error: " + e.getMessage()));
        }
    }

    /**
     * Lấy Health Profile của user
     */
    @GetMapping
    public ResponseEntity<NotificationResponse> getHealthProfile() {
        try {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || auth.getName() == null) {
                return ResponseEntity.ok(new NotificationResponse(false, "Unauthorized: No authentication found"));
            }
            Long userId = userService.getUserByEmail(auth.getName()).getId();
            return ResponseEntity.ok(healthProfileService.getHealthProfile(userId));
        } catch (Exception e) {
            log.error("Unexpected error", e);
            return ResponseEntity.ok(new NotificationResponse(false, "Error: " + e.getMessage()));
        }
    }

    /**
     * Gợi ý Training Plans dựa trên Health Profile
     */
    @GetMapping("/recommended-plans")
    public ResponseEntity<NotificationResponse> getRecommendedTrainingPlans() {
        try {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || auth.getName() == null) {
                return ResponseEntity.ok(new NotificationResponse(false, "Unauthorized: No authentication found"));
            }
            Long userId = userService.getUserByEmail(auth.getName()).getId();
            return ResponseEntity.ok(healthProfileService.getRecommendedTrainingPlans(userId));
        } catch (Exception e) {
            log.error("Unexpected error", e);
            return ResponseEntity.ok(new NotificationResponse(false, "Error: " + e.getMessage()));
        }
    }

    /**
     * Sinh Personalized Plan Detail tự động
     */
    @PostMapping("/generate-personal-plan")
    public ResponseEntity<NotificationResponse> generatePersonalizedPlanDetail(
            @RequestParam Long trainingPlanId) {
        try {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || auth.getName() == null) {
                return ResponseEntity.ok(new NotificationResponse(false, "Unauthorized: No authentication found"));
            }
            Long userId = userService.getUserByEmail(auth.getName()).getId();
            return ResponseEntity.ok(healthProfileService.generatePersonalizedPlanDetail(userId, trainingPlanId));
        } catch (Exception e) {
            log.error("Unexpected error", e);
            return ResponseEntity.ok(new NotificationResponse(false, "Error: " + e.getMessage()));
        }
    }
}






