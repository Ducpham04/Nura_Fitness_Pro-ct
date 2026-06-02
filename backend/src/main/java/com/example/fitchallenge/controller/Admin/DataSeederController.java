package com.example.fitchallenge.controller.Admin;

import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.service.DataSeederService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Controller để import dữ liệu mẫu vào database
 * Chỉ dành cho admin hoặc development
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/data-seeder")
@RequiredArgsConstructor
public class DataSeederController {

    private final DataSeederService dataSeederService;

    /**
     * POST /api/admin/data-seeder/import-all
     * Import toàn bộ dữ liệu mẫu
     */
    @PostMapping("/import-all")
    public ResponseEntity<NotificationResponse> importAllData() {
        try {
            DataSeederService.DataSeederResult result = dataSeederService.importAllData();
            
            Map<String, Object> data = new HashMap<>();
            data.put("usersCreated", result.getUsersCreated());
            data.put("challengesCreated", result.getChallengesCreated());
            data.put("trainingPlansCreated", result.getTrainingPlansCreated());
            data.put("healthProfilesCreated", result.getHealthProfilesCreated());
            data.put("dailyLogsCreated", result.getDailyLogsCreated());
            data.put("userChallengesCreated", result.getUserChallengesCreated());
            data.put("budgetRecordsCreated", result.getBudgetRecordsCreated());
            data.put("rewardsCreated", result.getRewardsCreated());
            data.put("exercisesCreated", result.getExercisesCreated());
            data.put("foodsCreated", result.getFoodsCreated());
            data.put("hybridMealRecordsCreated", result.getHybridMealRecordsCreated());
            data.put("totalRecords", result.getTotalRecords());
            
            NotificationResponse response = new NotificationResponse();
            response.setSuccess(true);
            response.setMessage("Import dữ liệu thành công!");
            response.setData(data);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            NotificationResponse response = new NotificationResponse();
            response.setSuccess(false);
            response.setMessage("Lỗi khi import dữ liệu: " + e.getMessage());
            log.error("Unexpected error", e);
            return ResponseEntity.ok(response);
        }
    }

    /**
     * POST /api/admin/data-seeder/import-exercises
     * Import/complete exercise master data.
     */
    @PostMapping("/import-exercises")
    public ResponseEntity<NotificationResponse> importExercises() {
        try {
            int created = dataSeederService.importExercises();

            NotificationResponse response = new NotificationResponse();
            response.setSuccess(true);
            response.setMessage(created == 0
                    ? "Exercise master data đã tồn tại, không tạo thêm."
                    : "Đã tạo " + created + " exercises.");
            response.setData(Map.of("count", created));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            NotificationResponse response = new NotificationResponse();
            response.setSuccess(false);
            response.setMessage("Lỗi: " + e.getMessage());
            log.error("Unexpected error", e);
            return ResponseEntity.ok(response);
        }
    }

    /**
     * POST /api/admin/data-seeder/import-foods
     * Import/complete food master data.
     */
    @PostMapping("/import-foods")
    public ResponseEntity<NotificationResponse> importFoods() {
        try {
            int created = dataSeederService.importFoods();

            NotificationResponse response = new NotificationResponse();
            response.setSuccess(true);
            response.setMessage(created == 0
                    ? "Food master data đã tồn tại, không tạo thêm."
                    : "Đã tạo " + created + " foods.");
            response.setData(Map.of("count", created));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            NotificationResponse response = new NotificationResponse();
            response.setSuccess(false);
            response.setMessage("Lỗi: " + e.getMessage());
            log.error("Unexpected error", e);
            return ResponseEntity.ok(response);
        }
    }

    /**
     * POST /api/admin/data-seeder/import-users?count=50
     * Import chỉ users
     */
    @PostMapping("/import-users")
    public ResponseEntity<NotificationResponse> importUsers(
            @RequestParam(defaultValue = "50") int count
    ) {
        try {
            int created = dataSeederService.importUsers(count);
            
            NotificationResponse response = new NotificationResponse();
            response.setSuccess(true);
            response.setMessage("Đã tạo " + created + " users");
            response.setData(Map.of("count", created));
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            NotificationResponse response = new NotificationResponse();
            response.setSuccess(false);
            response.setMessage("Lỗi: " + e.getMessage());
            log.error("Unexpected error", e);
            return ResponseEntity.ok(response);
        }
    }

    /**
     * POST /api/admin/data-seeder/import-hybrid-meals
     * Seed catalog mới cho Smart Meal Hybrid: foods macros/categories, dishes, dish_ingredients.
     */
    @PostMapping("/import-hybrid-meals")
    public ResponseEntity<NotificationResponse> importHybridMeals() {
        try {
            int created = dataSeederService.importHybridMealCatalog();

            NotificationResponse response = new NotificationResponse();
            response.setSuccess(true);
            response.setMessage(created == 0
                    ? "Hybrid meal catalog đã tồn tại, không tạo thêm."
                    : "Đã seed Hybrid meal catalog thành công.");
            response.setData(Map.of("count", created));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            NotificationResponse response = new NotificationResponse();
            response.setSuccess(false);
            response.setMessage("Lỗi: " + e.getMessage());
            log.error("Unexpected error", e);
            return ResponseEntity.ok(response);
        }
    }

    /**
     * POST /api/admin/data-seeder/import-challenges?count=20
     * Import chỉ challenges
     */
    @PostMapping("/import-challenges")
    public ResponseEntity<NotificationResponse> importChallenges(
            @RequestParam(defaultValue = "20") int count
    ) {
        try {
            int created = dataSeederService.importChallenges(count);
            
            NotificationResponse response = new NotificationResponse();
            response.setSuccess(true);
            response.setMessage("Đã tạo " + created + " challenges");
            response.setData(Map.of("count", created));
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            NotificationResponse response = new NotificationResponse();
            response.setSuccess(false);
            response.setMessage("Lỗi: " + e.getMessage());
            log.error("Unexpected error", e);
            return ResponseEntity.ok(response);
        }
    }

    /**
     * POST /api/admin/data-seeder/import-training-plans?count=10
     * Import chỉ training plans
     */
    @PostMapping("/import-training-plans")
    public ResponseEntity<NotificationResponse> importTrainingPlans(
            @RequestParam(defaultValue = "10") int count
    ) {
        try {
            int created = dataSeederService.importTrainingPlans(count);
            
            NotificationResponse response = new NotificationResponse();
            response.setSuccess(true);
            response.setMessage("Đã tạo " + created + " training plans");
            response.setData(Map.of("count", created));
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            NotificationResponse response = new NotificationResponse();
            response.setSuccess(false);
            response.setMessage("Lỗi: " + e.getMessage());
            log.error("Unexpected error", e);
            return ResponseEntity.ok(response);
        }
    }

    /**
     * POST /api/admin/data-seeder/import-daily-logs?count=200
     * Import daily training logs
     */
    @PostMapping("/import-daily-logs")
    public ResponseEntity<NotificationResponse> importDailyLogs(
            @RequestParam(defaultValue = "200") int count
    ) {
        try {
            int created = dataSeederService.importDailyTrainingLogs(count);
            
            NotificationResponse response = new NotificationResponse();
            response.setSuccess(true);
            response.setMessage("Đã tạo " + created + " daily training logs");
            response.setData(Map.of("count", created));
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            NotificationResponse response = new NotificationResponse();
            response.setSuccess(false);
            response.setMessage("Lỗi: " + e.getMessage());
            log.error("Unexpected error", e);
            return ResponseEntity.ok(response);
        }
    }

    /**
     * POST /api/admin/data-seeder/import-user-challenges?count=100
     * Import user challenges
     */
    @PostMapping("/import-user-challenges")
    public ResponseEntity<NotificationResponse> importUserChallenges(
            @RequestParam(defaultValue = "100") int count
    ) {
        try {
            int created = dataSeederService.importUserChallenges(count);
            
            NotificationResponse response = new NotificationResponse();
            response.setSuccess(true);
            response.setMessage("Đã tạo " + created + " user challenges");
            response.setData(Map.of("count", created));
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            NotificationResponse response = new NotificationResponse();
            response.setSuccess(false);
            response.setMessage("Lỗi: " + e.getMessage());
            log.error("Unexpected error", e);
            return ResponseEntity.ok(response);
        }
    }
}

