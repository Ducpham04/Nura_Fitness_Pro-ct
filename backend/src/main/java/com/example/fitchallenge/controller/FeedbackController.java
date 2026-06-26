package com.example.fitchallenge.controller;

import com.example.fitchallenge.Entity.UserFeedback;
import com.example.fitchallenge.repository.User.UserRepository;
import com.example.fitchallenge.repository.UserFeedbackRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Tag(name = "Feedback", description = "Gửi và quản lý phản hồi người dùng")
public class FeedbackController {

    private final UserFeedbackRepository feedbackRepository;
    private final UserRepository userRepository;

    /** POST /api/user/feedback — user gửi phản hồi */
    @PostMapping("/api/user/feedback")
    @Operation(summary = "Gửi phản hồi / báo lỗi / góp ý")
    public ResponseEntity<Map<String, Object>> submitFeedback(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, Object> body) {

        var user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Integer rating = body.get("rating") != null ? ((Number) body.get("rating")).intValue() : null;
        String type    = body.get("feedbackType") != null ? String.valueOf(body.get("feedbackType")) : "general";
        String message = body.get("message") != null ? String.valueOf(body.get("message")).strip() : "";
        String page    = body.get("page") != null ? String.valueOf(body.get("page")) : null;

        if (message.isBlank() && rating == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Vui lòng nhập nội dung hoặc đánh giá sao"));
        }

        UserFeedback fb = UserFeedback.builder()
                .userId(user.getId())
                .userEmail(user.getEmail())
                .userName(user.getFullName() != null ? user.getFullName() : user.getUserName())
                .rating(rating)
                .feedbackType(type)
                .message(message)
                .page(page)
                .build();
        feedbackRepository.save(fb);

        return ResponseEntity.ok(Map.of("success", true, "message", "Cảm ơn bạn đã góp ý!"));
    }

    /** GET /api/admin/feedback — admin xem tất cả phản hồi */
    @GetMapping("/api/admin/feedback")
    @Operation(summary = "Danh sách phản hồi người dùng (Admin)")
    public ResponseEntity<List<Map<String, Object>>> listFeedback(
            @RequestParam(required = false) String type) {

        List<UserFeedback> list = feedbackRepository.findAllByOrderByCreatedAtDesc();
        if (type != null && !type.isBlank()) {
            list = list.stream().filter(f -> type.equalsIgnoreCase(f.getFeedbackType())).toList();
        }

        List<Map<String, Object>> result = list.stream().map(f -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", f.getId());
            m.put("userId", f.getUserId());
            m.put("userEmail", f.getUserEmail());
            m.put("userName", f.getUserName());
            m.put("rating", f.getRating());
            m.put("feedbackType", f.getFeedbackType());
            m.put("message", f.getMessage());
            m.put("page", f.getPage());
            m.put("createdAt", f.getCreatedAt() != null ? f.getCreatedAt().toString() : null);
            return m;
        }).toList();

        return ResponseEntity.ok(result);
    }
}
