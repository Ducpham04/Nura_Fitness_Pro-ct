package com.example.fitchallenge.controller;

import com.example.fitchallenge.Security.AuthenticatedUserIdResolver;
import com.example.fitchallenge.service.AiUsageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller: AI Usage Info
 * Cho user xem lượt AI còn lại trong chu kỳ hiện tại.
 */
@RestController
@RequestMapping("/api/ai-usage")
@RequiredArgsConstructor
@Tag(name = "AI Usage", description = "Thông tin lượt dùng AI của user")
public class AiUsageController {

    private final AiUsageService aiUsageService;
    private final AuthenticatedUserIdResolver authUser;

    /**
     * GET /api/ai-usage/me?userId={userId}
     * Trả về {packageCode, packageName, quota, used, remaining, isUnlimited, resetAt, packageExpiresAt}
     */
    @GetMapping("/me")
    @Operation(summary = "Lấy thông tin lượt AI của user hiện tại")
    public ResponseEntity<Map<String, Object>> getMyUsage(
            @RequestHeader("userId") Long userId) {
        return ResponseEntity.ok(aiUsageService.getUsageInfo(authUser.resolve(userId)));
    }
}
