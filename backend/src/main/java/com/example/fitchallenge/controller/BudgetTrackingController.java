package com.example.fitchallenge.controller;

import com.example.fitchallenge.Entity.BudgetTracking;
import com.example.fitchallenge.service.BudgetTrackingService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST Controller: BudgetTracking
 * 👉 API endpoints theo dõi ngân sách thực tế vs AI ước tính
 * 💡 Đánh giá độ chính xác của AI
 */
@RestController
@RequestMapping("/api/budget")

public class BudgetTrackingController {

    @Autowired
    private BudgetTrackingService budgetService;

    @Autowired
    private com.example.fitchallenge.Security.AuthenticatedUserIdResolver authUser;

    /**
     * 📝 POST /api/budget/{userId}/track - Ghi nhận chi tiêu
     */
    @PostMapping("/{userId}/track")
    public ResponseEntity<?> trackSpending(
            @PathVariable Long userId,
            @Valid @RequestBody TrackSpendingRequest request) {
        userId = authUser.resolve(userId);
        try {
            BudgetTracking tracking = budgetService.trackDailySpending(
                userId,
                request.date,
                request.actualSpent,
                request.dailyBudget,
                request.itemsJson,
                request.notes
            );
            return ResponseEntity.ok(tracking);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 📊 GET /api/budget/{userId}/weekly-report - Report tuần
     */
    @GetMapping("/{userId}/weekly-report")
    public ResponseEntity<?> getWeeklyReport(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStartDate) {
        userId = authUser.resolve(userId);
        try {
            BudgetTrackingService.WeeklyBudgetReport report = budgetService.getWeeklyReport(userId, weekStartDate);
            return ResponseEntity.ok(report);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 📊 GET /api/budget/{userId}/monthly-report - Report tháng
     */
    @GetMapping("/{userId}/monthly-report")
    public ResponseEntity<?> getMonthlyReport(
            @PathVariable Long userId,
            @RequestParam int year,
            @RequestParam int month) {
        userId = authUser.resolve(userId);
        try {
            BudgetTrackingService.MonthlyBudgetReport report = budgetService.getMonthlyReport(userId, year, month);
            return ResponseEntity.ok(report);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 🤖 GET /api/budget/{userId}/ai-accuracy - Đánh giá độ chính xác AI
     */
    @GetMapping("/{userId}/ai-accuracy")
    public ResponseEntity<?> getAiAccuracy(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        userId = authUser.resolve(userId);
        try {
            BudgetTrackingService.AiAccuracyReport report = budgetService.evaluateAiAccuracy(userId, startDate, endDate);
            return ResponseEntity.ok(report);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 📋 GET /api/budget/{userId}/history - Lịch sử chi tiêu
     */
    @GetMapping("/{userId}/history")
    public ResponseEntity<?> getSpendingHistory(
            @PathVariable Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        userId = authUser.resolve(userId);
        try {
            List<BudgetTracking> history = budgetService.getSpendingHistory(userId, startDate, endDate);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    // 📦 Request/Response classes
    public static class TrackSpendingRequest {
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        public LocalDate date;
        public Integer actualSpent;
        public Integer dailyBudget;
        public String itemsJson;
        public String notes;
    }

    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("error", message);
        return response;
    }
}
