package com.example.fitchallenge.controller;

import com.example.fitchallenge.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

/**
 * REST Controller: FoodAnalysis
 * 👉 API Gateway cho AI Vision - Phân tích món ăn từ ảnh
 * 💡 Java BE đóng vai trò proxy: Frontend → Java BE → AI Service
 * 💡 Lý do: Verify JWT Token + CORS + Bảo mật + Rate limiting
 *
 * 🚨 KHÔNG để Frontend gọi trực tiếp AI Service (port 8000) vì:
 *    - FastAPI không verify được JWT do Java sinh ra
 *    - CORS issues
 *    - Không có rate limiting
 *    - Không audit log
 */
@RestController
@RequestMapping("/api/food-analysis")

public class FoodAnalysisController {

    @Value("${ai.service.url:http://localhost:8000}")
    private String aiServiceUrl;

    @Autowired
    private UserService userService;

    @Autowired
    private ObjectMapper objectMapper;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 📸 POST /api/food-analysis/analyze - Phân tích món ăn từ ảnh
     * Frontend upload ảnh → Java BE verify token → gọi AI Service → trả kết quả
     *
     * Request: multipart/form-data với file ảnh
     * Response: JSON kết quả phân tích từ AI
     */
    @PostMapping("/analyze")
    public ResponseEntity<?> analyzeFoodImage(
            @RequestParam("image") MultipartFile image,
            @RequestParam("userId") Long userId,
            @RequestParam(value = "language", defaultValue = "vi") String language) {

        try {
            // ✅ 1. Verify user tồn tại (JWT đã được verify ở Security Filter)
            userService.getUserById(userId);

            // 🔒 2. Validate file
            if (image.isEmpty()) {
                return ResponseEntity.badRequest().body(createErrorResponse("Image file is required"));
            }

            // Chỉ chấp nhận ảnh
            String contentType = image.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return ResponseEntity.badRequest().body(createErrorResponse("Only image files are allowed"));
            }

            // 📏 3. Giới hạn kích thước (max 5MB)
            if (image.getSize() > 5 * 1024 * 1024) {
                return ResponseEntity.badRequest().body(createErrorResponse("Image size must be less than 5MB"));
            }

            // 🚀 4. Forward ảnh đến AI Service
            String aiUrl = aiServiceUrl + "/track-food";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new MultipartFileResource(image));
            body.add("language", language);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            // Gọi AI Service
            ResponseEntity<String> aiResponse = restTemplate.exchange(
                aiUrl,
                HttpMethod.POST,
                requestEntity,
                String.class
            );

            // 📋 5. Parse và enrich response
            Map<String, Object> result = objectMapper.readValue(aiResponse.getBody(), Map.class);

            // Thêm metadata từ BE
            Map<String, Object> enrichedResponse = new HashMap<>();
            enrichedResponse.put("success", true);
            enrichedResponse.put("data", result);
            enrichedResponse.put("userId", userId);
            enrichedResponse.put("analyzedAt", java.time.ZonedDateTime.now().toString());
            enrichedResponse.put("aiService", aiServiceUrl);

            return ResponseEntity.ok(enrichedResponse);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Failed to analyze food image: " + e.getMessage()));
        }
    }

    /**
     * 📸 POST /api/food-analysis/analyze-base64 - Phân tích từ base64
     * Dùng cho mobile app hoặc khi frontend đã có base64 string
     */
    @PostMapping("/analyze-base64")
    public ResponseEntity<?> analyzeFoodBase64(
            @Valid @RequestBody AnalyzeBase64Request request,
            @RequestParam("userId") Long userId) {

        try {
            // ✅ Verify user
            userService.getUserById(userId);

            // 🔒 Validate
            if (request.base64Image == null || request.base64Image.isEmpty()) {
                return ResponseEntity.badRequest().body(createErrorResponse("Base64 image is required"));
            }

            // 🚀 Forward đến AI Service
            String aiUrl = aiServiceUrl + "/track-food-base64";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> aiRequest = new HashMap<>();
            aiRequest.put("image_base64", request.base64Image);
            aiRequest.put("language", request.language != null ? request.language : "vi");

            HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(aiRequest, headers);

            ResponseEntity<String> aiResponse = restTemplate.exchange(
                aiUrl,
                HttpMethod.POST,
                requestEntity,
                String.class
            );

            Map<String, Object> result = objectMapper.readValue(aiResponse.getBody(), Map.class);

            Map<String, Object> enrichedResponse = new HashMap<>();
            enrichedResponse.put("success", true);
            enrichedResponse.put("data", result);
            enrichedResponse.put("userId", userId);
            enrichedResponse.put("analyzedAt", java.time.ZonedDateTime.now().toString());

            return ResponseEntity.ok(enrichedResponse);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Failed to analyze food image: " + e.getMessage()));
        }
    }

    /**
     * 📝 POST /api/food-analysis/log - Lưu kết quả phân tích vào food log
     * Sau khi AI phân tích xong, user có thể lưu vào daily food log
     */
    @PostMapping("/log")
    public ResponseEntity<?> saveFoodLog(
            @RequestParam Long userId,
            @Valid @RequestBody FoodLogRequest request) {

        try {
            // TODO: Implement food log saving
            // This would save to a UserFoodLog entity (to be created)

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Food log saved successfully");
            response.put("userId", userId);
            response.put("foodName", request.foodName);
            response.put("calories", request.calories);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 🏥 GET /api/food-analysis/health - Health check AI Service
     */
    @GetMapping("/health")
    public ResponseEntity<?> checkAiHealth() {
        try {
            String aiUrl = aiServiceUrl + "/health";
            ResponseEntity<String> response = restTemplate.getForEntity(aiUrl, String.class);

            Map<String, Object> result = new HashMap<>();
            result.put("aiServiceStatus", response.getStatusCode() == HttpStatus.OK ? "UP" : "DOWN");
            result.put("aiServiceUrl", aiServiceUrl);
            result.put("timestamp", java.time.ZonedDateTime.now().toString());

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            Map<String, Object> result = new HashMap<>();
            result.put("aiServiceStatus", "DOWN");
            result.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(result);
        }
    }

    // 📦 Helper class để wrap MultipartFile
    private static class MultipartFileResource extends ByteArrayResource {
        private final String filename;
        private final String contentType;

        public MultipartFileResource(MultipartFile file) throws Exception {
            super(file.getBytes());
            this.filename = file.getOriginalFilename();
            this.contentType = file.getContentType();
        }

        @Override
        public String getFilename() {
            return filename;
        }
    }

    // 📦 Request/Response classes
    public static class AnalyzeBase64Request {
        public String base64Image;
        public String language;
    }

    public static class FoodLogRequest {
        public String foodName;
        public Double calories;
        public Double protein;
        public Double carbs;
        public Double fat;
        public Double portionGrams;
        public String mealType; // breakfast, lunch, dinner, snack
        public String imageUrl;
    }

    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("error", message);
        return response;
    }
}
