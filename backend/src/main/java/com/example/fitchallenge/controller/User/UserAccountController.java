package com.example.fitchallenge.controller.User;

import com.example.fitchallenge.DTO.user.ChangePasswordRequest;
import com.example.fitchallenge.DTO.user.UpdateMyProfileRequest;
import com.example.fitchallenge.DTO.user.UserDTO;
import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * Cho phép user đang đăng nhập tự quản lý tài khoản của mình:
 * đổi thông tin cơ bản, đổi mật khẩu, vô hiệu hoá tài khoản.
 * userId luôn lấy từ JWT (không tin tham số client gửi).
 */
@RestController
@RequestMapping("/api/user/account")
@RequiredArgsConstructor
public class UserAccountController {

    private final UserService userService;

    private Long currentUserId(UserDetails userDetails) {
        return userService.getUserByEmail(userDetails.getUsername()).getId();
    }

    /** Đổi tên hiển thị / email (xác nhận bằng mật khẩu không bắt buộc cho tên). */
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody UpdateMyProfileRequest request) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(new NotificationResponse(false, "Unauthorized"));
        }
        try {
            UserDTO updated = userService.updateMyProfile(
                    currentUserId(userDetails), request.getFullName(), request.getEmail());
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new NotificationResponse(false, e.getMessage()));
        }
    }

    /** Đổi mật khẩu — yêu cầu mật khẩu hiện tại. */
    @PutMapping("/password")
    public ResponseEntity<NotificationResponse> changePassword(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody ChangePasswordRequest request) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(new NotificationResponse(false, "Unauthorized"));
        }
        try {
            userService.changePassword(
                    currentUserId(userDetails), request.getCurrentPassword(), request.getNewPassword());
            return ResponseEntity.ok(new NotificationResponse(true, "Đổi mật khẩu thành công"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new NotificationResponse(false, e.getMessage()));
        }
    }

    /** Thông tin referral của user đang đăng nhập. */
    @GetMapping("/referral")
    public ResponseEntity<?> getMyReferralInfo(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(new NotificationResponse(false, "Unauthorized"));
        }
        try {
            return ResponseEntity.ok(userService.getMyReferralInfo(currentUserId(userDetails)));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new NotificationResponse(false, e.getMessage()));
        }
    }

    /** Áp dụng mã giới thiệu sau khi đã đăng ký (onboarding step). */
    @PostMapping("/referral/apply")
    public ResponseEntity<?> applyReferralCode(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody java.util.Map<String, String> body) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(new NotificationResponse(false, "Unauthorized"));
        }
        String code = body.get("referralCode");
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(new NotificationResponse(false, "Thiếu mã giới thiệu."));
        }
        try {
            return ResponseEntity.ok(userService.applyReferralCode(currentUserId(userDetails), code));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(new NotificationResponse(false, e.getMessage()));
        }
    }

    /** Tự vô hiệu hoá tài khoản (xoá mềm — giữ dữ liệu). */
    @DeleteMapping
    public ResponseEntity<NotificationResponse> deactivate(
            @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(new NotificationResponse(false, "Unauthorized"));
        }
        try {
            userService.deactivateMyAccount(currentUserId(userDetails));
            return ResponseEntity.ok(new NotificationResponse(true, "Tài khoản đã được vô hiệu hoá"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new NotificationResponse(false, e.getMessage()));
        }
    }
}
