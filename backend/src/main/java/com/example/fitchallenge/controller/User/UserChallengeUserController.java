package com.example.fitchallenge.controller.User;

import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.config.PoseResultVerifier;
import com.example.fitchallenge.service.UserChallengeService;
import com.example.fitchallenge.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * Controller cho User Challenge APIs (user-facing)
 */
@RestController
@RequestMapping("/api/user/challenges")
@RequiredArgsConstructor
public class UserChallengeUserController {

    @Autowired
    private final UserChallengeService userChallengeService;
    @Autowired
    private final UserService userService;
    @Autowired
    private final PoseResultVerifier poseResultVerifier;

    /**
     * PUT /api/user/challenges/{id}/complete
     * Đánh dấu challenge đã hoàn thành
     * User chỉ có thể đánh dấu challenge của chính mình
     */
    @PutMapping("/{id}/complete")
    public ResponseEntity<NotificationResponse> completeChallenge(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        if (userDetails == null) {
            return ResponseEntity.status(401).body(
                new NotificationResponse(false, "Unauthorized")
            );
        }
        
        try {
            Long userId = userService.getUserByEmail(userDetails.getUsername()).getId();
            NotificationResponse response = userChallengeService.completeChallenge(id, userId);
            
            if (response.isSuccess()) {
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.status(400).body(response);
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body(
                new NotificationResponse(false, "Error: " + e.getMessage())
            );
        }
    }

    /**
     * POST /api/user/challenges/{id}/submit
     * Nộp ảnh bài thi → AI (Groq Vision) chấm điểm form → SUCCESS/FAILED.
     * id = ucId (UserChallenge của user).
     */
    @PostMapping(value = "/{id}/submit", consumes = {"multipart/form-data"})
    public ResponseEntity<NotificationResponse> submitAttempt(
            @PathVariable Long id,
            @RequestPart("image") MultipartFile image,
            @AuthenticationPrincipal UserDetails userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(401).body(new NotificationResponse(false, "Unauthorized"));
        }
        try {
            Long userId = userService.getUserByEmail(userDetails.getUsername()).getId();
            NotificationResponse response = userChallengeService.submitChallengeAttempt(id, userId, image);
            return response.isSuccess() ? ResponseEntity.ok(response)
                                        : ResponseEntity.status(400).body(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(new NotificationResponse(false, "Error: " + e.getMessage()));
        }
    }

    /**
     * POST /api/user/challenges/{id}/submit-result
     * Ghi nhận kết quả buổi thi REALTIME (fitness-ai-service / MediaPipe).
     *
     * SERVER-AUTHORITATIVE: body chứa { token, sig } — kết quả ĐÃ KÝ HMAC bởi
     * pose service. Backend xác minh chữ ký rồi mới lấy reps/quality từ payload đã
     * ký (KHÔNG tin số do client gửi) -> chống gian lận điểm/thưởng.
     */
    @PostMapping("/{id}/submit-result")
    public ResponseEntity<NotificationResponse> submitResult(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(401).body(new NotificationResponse(false, "Unauthorized"));
        }

        // Xác thực kết quả đã ký
        PoseResultVerifier.VerifiedResult verified;
        try {
            String token = body.get("token") != null ? body.get("token").toString() : null;
            String sig = body.get("sig") != null ? body.get("sig").toString() : null;
            verified = poseResultVerifier.verify(token, sig);
        } catch (SecurityException | IllegalArgumentException e) {
            return ResponseEntity.status(400).body(new NotificationResponse(false,
                    "Kết quả không hợp lệ: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(new NotificationResponse(false,
                    "Không xác thực được kết quả: " + e.getMessage()));
        }

        try {
            Long userId = userService.getUserByEmail(userDetails.getUsername()).getId();
            NotificationResponse response = userChallengeService.submitChallengeResult(
                    id, userId, verified.reps(), verified.qualityScore(), verified.exerciseType());
            return response.isSuccess() ? ResponseEntity.ok(response)
                                        : ResponseEntity.status(400).body(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(new NotificationResponse(false, "Error: " + e.getMessage()));
        }
    }

    /**
     * GET /api/user/challenges/my
     * Lấy danh sách challenges của user hiện tại
     */
    @GetMapping("/my")
    public ResponseEntity<NotificationResponse> getMyChallenges(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String status) {
        
        if (userDetails == null) {
            return ResponseEntity.status(401).body(
                new NotificationResponse(false, "Unauthorized")
            );
        }
        
        try {
            Long userId = userService.getUserByEmail(userDetails.getUsername()).getId();
            return ResponseEntity.ok(userChallengeService.getByUserId(userId, status));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(
                new NotificationResponse(false, "Error: " + e.getMessage())
            );
        }
    }
}

