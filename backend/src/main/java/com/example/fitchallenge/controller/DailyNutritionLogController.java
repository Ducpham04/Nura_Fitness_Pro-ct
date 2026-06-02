package com.example.fitchallenge.controller;

import com.example.fitchallenge.Entity.DailyNutritionLog;
import com.example.fitchallenge.Entity.User;
import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.repository.DailyNutritionLogRepository;
import com.example.fitchallenge.repository.User.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/daily-nutrition")
@RequiredArgsConstructor
public class DailyNutritionLogController {

    private final DailyNutritionLogRepository logRepository;
    private final UserRepository userRepository;

    @PostMapping("/log")
    public ResponseEntity<NotificationResponse> logMeal(
            @RequestHeader(value = "userId", required = false) Long headerUserId,
            @RequestBody Map<String, Object> request) {
        
        Long userId = headerUserId != null ? headerUserId : ((Number) request.get("userId")).longValue();
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));

        DailyNutritionLog log = DailyNutritionLog.builder()
                .user(user)
                .trackingDate(LocalDate.now())
                .mealName((String) request.get("mealName"))
                .mealType((String) request.getOrDefault("mealType", "OTHER"))
                .calories(new BigDecimal(request.getOrDefault("calories", 0).toString()))
                .protein(new BigDecimal(request.getOrDefault("protein", 0).toString()))
                .carbs(new BigDecimal(request.getOrDefault("carbs", 0).toString()))
                .fat(new BigDecimal(request.getOrDefault("fat", 0).toString()))
                .cost(((Number) request.getOrDefault("cost", 0)).intValue())
                .build();

        logRepository.save(log);

        return ResponseEntity.ok(new NotificationResponse(true, "Meal logged successfully"));
    }
}
