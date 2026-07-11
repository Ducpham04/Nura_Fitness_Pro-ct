package com.example.fitchallenge.service.impl;

import com.example.fitchallenge.DTO.UserBodyProfileDTO.UserBodyProfileRequest;
import com.example.fitchallenge.DTO.UserBodyProfileDTO.UserBodyProfileResponse;
import com.example.fitchallenge.Entity.Goals;
import com.example.fitchallenge.Entity.User;
import com.example.fitchallenge.Entity.UserBodyProfile;
import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.repository.GoalRepository;
import com.example.fitchallenge.repository.User.UserRepository;
import com.example.fitchallenge.repository.UserBodyProfileRepository;
import com.example.fitchallenge.service.UserBodyProfileService;
import com.example.fitchallenge.utils.BodyMetricsCalculator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserBodyProfileServiceImpl implements UserBodyProfileService {

    private final UserBodyProfileRepository userBodyProfileRepository;
    private final UserRepository userRepository;
    private final GoalRepository goalRepository;
    private final com.example.fitchallenge.repository.HealthProfileRepository healthProfileRepository;

    @Override
    public NotificationResponse createOrUpdateBodyProfile(Long userId, UserBodyProfileRequest request) {
        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            UserBodyProfile profile = userBodyProfileRepository.findByUser_Id(userId)
                    .orElseGet(() -> {
                        UserBodyProfile p = new UserBodyProfile();
                        p.setUser(user);
                        return p;
                    });

            // ── Map basic fields ──────────────────────────────────────
            if (request.getHeight() != null) profile.setHeight(BigDecimal.valueOf(request.getHeight()));
            if (request.getWeight() != null) profile.setWeight(BigDecimal.valueOf(request.getWeight()));
            if (request.getBodyFat() != null) profile.setBodyFat(BigDecimal.valueOf(request.getBodyFat()));
            if (request.getMuscleMass() != null) profile.setMuscleMass(BigDecimal.valueOf(request.getMuscleMass()));
            if (request.getAge() != null) profile.setAge(request.getAge());
            if (request.getGender() != null) profile.setGender(request.getGender());
            if (request.getExperienceLevel() != null) profile.setExperienceLevel(request.getExperienceLevel());
            if (request.getGoal() != null) profile.setGoal(request.getGoal());
            if (request.getInjuryNotes() != null) profile.setInjuryNotes(request.getInjuryNotes());
            if (request.getTargetBudgetPerDay() != null) profile.setTargetBudgetPerDay(request.getTargetBudgetPerDay());

            // ── Mức vận động ──────────────────────────────────────────
            // Ưu tiên giá trị THẬT user chọn (request.activityLevel). Chỉ suy từ
            // experienceLevel khi profile chưa có gì (backward compat flow cũ) —
            // trước đây suy vô điều kiện làm "vận động nhẹ" bị ghi thành sedentary.
            if (request.getActivityLevel() != null && !request.getActivityLevel().isBlank()) {
                profile.setActivityLevel(request.getActivityLevel());
                // Đồng bộ nguồn thật bên HealthProfile để AI meal/workout dùng cùng một số
                healthProfileRepository.findByUser_Id(userId).ifPresent(hp -> {
                    hp.setDailyActivityLevel(request.getActivityLevel());
                    healthProfileRepository.save(hp);
                });
            } else if (request.getExperienceLevel() != null && profile.getActivityLevel() == null) {
                profile.setActivityLevel(mapToActivityLevel(request.getExperienceLevel()));
            }

            // ── Resolve goal FK ───────────────────────────────────────
            if (request.getGoal() != null) {
                String goalName = resolveGoalName(request.getGoal());
                goalRepository.findAll().stream()
                        .filter(g -> g.getName().equalsIgnoreCase(goalName))
                        .findFirst()
                        .ifPresent(profile::setGoalRef);
            }

            // ── Calculate BMI, BMR, Recommended Calories ──────────────
            if (profile.getHeight() != null && profile.getWeight() != null) {
                BigDecimal bmi = BodyMetricsCalculator.calculateBMI(profile.getWeight(), profile.getHeight());
                profile.setBmi(bmi);

                if (profile.getAge() != null && profile.getGender() != null) {
                    BigDecimal bmr = BodyMetricsCalculator.calculateBMR(
                            profile.getWeight(), profile.getHeight(),
                            profile.getAge(), profile.getGender());
                    profile.setBmr(bmr);

                    String actLevel = profile.getActivityLevel() != null ? profile.getActivityLevel() : "sedentary";
                    BigDecimal recommended = BodyMetricsCalculator.calculateRecommendedCalories(bmr, actLevel);
                    profile.setRecommendedCalories(recommended);
                }
            }

            UserBodyProfile saved = userBodyProfileRepository.save(profile);
            return new NotificationResponse(true, "Body profile saved successfully", toResponse(saved));

        } catch (Exception e) {
            return new NotificationResponse(false, "Error saving body profile: " + e.getMessage());
        }
    }

    @Override
    public NotificationResponse getBodyProfile(Long userId) {
        try {
            Optional<UserBodyProfile> profile = userBodyProfileRepository.findByUser_Id(userId);
            if (profile.isEmpty()) {
                return new NotificationResponse(false, "Body profile not found");
            }
            return new NotificationResponse(true, "Body profile retrieved successfully", toResponse(profile.get()));
        } catch (Exception e) {
            return new NotificationResponse(false, "Error retrieving body profile: " + e.getMessage());
        }
    }

    // ── Helper: map goal string → Goals table name ────────────────────
    private String resolveGoalName(String goal) {
        String k = goal.toLowerCase();
        if (k.contains("lose") || k.contains("weight")) return "Lose Weight";
        if (k.contains("muscle") || k.contains("build")) return "Build Muscle";
        if (k.contains("endurance")) return "Improve Endurance";
        if (k.contains("flex")) return "Increase Flexibility";
        return "General Fitness";
    }

    // ── Helper: map experienceLevel → activityLevel ───────────────────
    private String mapToActivityLevel(String exp) {
        return switch (exp.toLowerCase()) {
            case "advanced" -> "very active";
            case "intermediate" -> "moderately active";
            default -> "sedentary";
        };
    }

    // ── Helper: entity → response DTO ────────────────────────────────
    private UserBodyProfileResponse toResponse(UserBodyProfile p) {
        UserBodyProfileResponse r = new UserBodyProfileResponse();
        r.setId(p.getId());
        r.setUserId(p.getUser().getId());
        r.setHeight(p.getHeight() != null ? p.getHeight().doubleValue() : null);
        r.setWeight(p.getWeight() != null ? p.getWeight().doubleValue() : null);
        r.setBmi(p.getBmi() != null ? p.getBmi().doubleValue() : null);
        r.setBodyFat(p.getBodyFat() != null ? p.getBodyFat().doubleValue() : null);
        r.setMuscleMass(p.getMuscleMass() != null ? p.getMuscleMass().doubleValue() : null);
        r.setAge(p.getAge());
        r.setGender(p.getGender());
        r.setExperienceLevel(p.getExperienceLevel());
        r.setGoal(p.getGoal());
        r.setInjuryNotes(p.getInjuryNotes());
        r.setTargetBudgetPerDay(p.getTargetBudgetPerDay());
        r.setCreatedAt(p.getCreatedAt());
        r.setUpdatedAt(p.getUpdatedAt());
        return r;
    }
}
