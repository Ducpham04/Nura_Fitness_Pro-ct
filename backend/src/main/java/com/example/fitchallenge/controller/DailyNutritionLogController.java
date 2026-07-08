package com.example.fitchallenge.controller;

import com.example.fitchallenge.Entity.DailyNutritionLog;
import com.example.fitchallenge.Entity.User;
import com.example.fitchallenge.Security.AuthenticatedUserIdResolver;
import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.exception.QuotaExceededException;
import com.example.fitchallenge.repository.DailyNutritionLogRepository;
import com.example.fitchallenge.repository.User.UserRepository;
import com.example.fitchallenge.service.LogLimitService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@RestController
@RequestMapping("/api/daily-nutrition")
@RequiredArgsConstructor
public class DailyNutritionLogController {

    private final DailyNutritionLogRepository logRepository;
    private final UserRepository userRepository;
    private final AuthenticatedUserIdResolver authUser;
    private final LogLimitService logLimitService;

    @PostMapping("/log")
    public ResponseEntity<NotificationResponse> logMeal(
            @RequestHeader(value = "userId", required = false) Long headerUserId,
            @RequestBody Map<String, Object> request) {

        // userId từ JWT — không tin header/body để chống ghi log vào tài khoản người khác
        Long userId = authUser.resolve(headerUserId);

        try {
            logLimitService.ensureAndConsume(userId, LogLimitService.LogType.NUTRITION);
        } catch (QuotaExceededException e) {
            return ResponseEntity.status(429).body(new NotificationResponse(false, e.getMessage()));
        }

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

    // Lịch tuân thủ dinh dưỡng: gộp kcal + macro theo từng ngày trong khoảng from..to.
    // userId luôn lấy từ JWT (path chỉ để REST cho rõ) — chống đọc log tài khoản người khác.
    @GetMapping("/{pathUserId}/daily")
    public ResponseEntity<List<Map<String, Object>>> getDailyNutrition(
            @PathVariable Long pathUserId,
            @RequestHeader(value = "userId", required = false) Long headerUserId,
            @RequestParam String from,
            @RequestParam String to) {

        Long userId = authUser.resolve(headerUserId);
        LocalDate start = LocalDate.parse(from);
        LocalDate end = LocalDate.parse(to);

        List<DailyNutritionLog> logs = logRepository.findByUser_IdAndTrackingDateBetween(userId, start, end);

        // date -> [calories, protein, carbs, fat]
        Map<LocalDate, double[]> byDate = new TreeMap<>();
        for (DailyNutritionLog l : logs) {
            double[] agg = byDate.computeIfAbsent(l.getTrackingDate(), k -> new double[4]);
            agg[0] += l.getCalories() != null ? l.getCalories().doubleValue() : 0;
            agg[1] += l.getProtein() != null ? l.getProtein().doubleValue() : 0;
            agg[2] += l.getCarbs() != null ? l.getCarbs().doubleValue() : 0;
            agg[3] += l.getFat() != null ? l.getFat().doubleValue() : 0;
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<LocalDate, double[]> e : byDate.entrySet()) {
            Map<String, Object> day = new LinkedHashMap<>();
            day.put("date", e.getKey().toString());
            day.put("calories", Math.round(e.getValue()[0]));
            day.put("protein", Math.round(e.getValue()[1]));
            day.put("carbs", Math.round(e.getValue()[2]));
            day.put("fat", Math.round(e.getValue()[3]));
            result.add(day);
        }
        return ResponseEntity.ok(result);
    }
}
