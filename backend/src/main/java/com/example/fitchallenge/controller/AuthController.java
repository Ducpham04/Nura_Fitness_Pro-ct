package com.example.fitchallenge.controller;

import com.example.fitchallenge.DTO.user.LoginRequest;
import com.example.fitchallenge.DTO.user.RegisterRequestAdmin;
import com.example.fitchallenge.DTO.user.RegisterRequestCustomer;
import com.example.fitchallenge.DTO.user.UpdateProfileRequest;
import com.example.fitchallenge.DTO.user.JwtResponse;
import com.example.fitchallenge.DTO.user.UserDTO;
import com.example.fitchallenge.Security.LoginAttemptService;
import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "APIs for user authentication and profile management")
public class AuthController {

    private final UserService userService;
    private final LoginAttemptService loginAttemptService;

    @PostMapping("/auth/register")
    @Operation(summary = "Register a new customer")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Registered successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid input"),
        @ApiResponse(responseCode = "409", description = "Email already exists")
    })
    public ResponseEntity<?> register(
            @Valid @RequestBody RegisterRequestCustomer request) {
        JwtResponse jwtResponse = userService.registerCustomer(request);
        return ResponseEntity.ok(jwtResponse);
    }

    @PostMapping("/auth/login")
    @Operation(summary = "User login")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Login successful"),
        @ApiResponse(responseCode = "401", description = "Invalid credentials"),
        @ApiResponse(responseCode = "429", description = "Too many failed attempts — try again later")
    })
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {

        // Brute-force protection: kiểm tra IP trước khi xử lý
        String ip = getClientIp(httpRequest);
        if (loginAttemptService.isBlocked(ip)) {
            log.warn("[BruteForce] Blocked login attempt from IP={}", ip);
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(new NotificationResponse(false,
                            "Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút."));
        }

        try {
            JwtResponse jwtResponse = userService.login(request);
            loginAttemptService.resetAttempts(ip); // Đăng nhập thành công → reset
            return ResponseEntity.ok(jwtResponse);
        } catch (Exception e) {
            loginAttemptService.recordFailure(ip); // Đăng nhập thất bại → ghi nhận
            throw e; // Để GlobalExceptionHandler xử lý 401
        }
    }

    /**
     * Lấy IP thực của client.
     * X-Forwarded-For chỉ được tin khi request đến từ reverse proxy nội bộ (127.x hoặc ::1).
     * Điều này ngăn attacker giả mạo header để bypass brute-force protection.
     */
    private String getClientIp(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        boolean fromTrustedProxy = "127.0.0.1".equals(remoteAddr)
                || "0:0:0:0:0:0:0:1".equals(remoteAddr)
                || "::1".equals(remoteAddr);
        if (fromTrustedProxy) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",")[0].trim();
            }
        }
        return remoteAddr;
    }

    // ── Forgot / Reset password ─────────────────────────────────────────────

    /** Request body for forgot-password */
    public record ForgotPasswordRequest(String email) {}
    /** Request body for reset-password */
    public record ResetPasswordRequest(String token, String newPassword) {}

    @PostMapping("/auth/forgot-password")
    @Operation(summary = "Request password reset email")
    public ResponseEntity<NotificationResponse> forgotPassword(
            @RequestBody ForgotPasswordRequest body) {
        if (body == null || body.email() == null || body.email().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(new NotificationResponse(false, "Email không được để trống"));
        }
        // Luôn trả success để không tiết lộ email có tồn tại hay không
        userService.forgotPassword(body.email().trim().toLowerCase());
        return ResponseEntity.ok(new NotificationResponse(true,
                "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu."));
    }

    @PostMapping("/auth/reset-password")
    @Operation(summary = "Reset password using token from email")
    public ResponseEntity<NotificationResponse> resetPassword(
            @RequestBody ResetPasswordRequest body) {
        try {
            if (body == null || body.token() == null || body.newPassword() == null) {
                return ResponseEntity.badRequest()
                        .body(new NotificationResponse(false, "Thiếu token hoặc mật khẩu mới"));
            }
            userService.resetPassword(body.token().trim(), body.newPassword());
            return ResponseEntity.ok(new NotificationResponse(true,
                    "Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new NotificationResponse(false, e.getMessage()));
        }
    }

    @PostMapping("/auth/logout")
    @Operation(summary = "User logout")
    public ResponseEntity<NotificationResponse> logout(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.badRequest()
                    .body(new NotificationResponse(false, "No token provided"));
        }
        String token = authHeader.substring(7);
        NotificationResponse response = userService.logout(token);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/auth/user")
    @Operation(summary = "Get current user profile")
    public ResponseEntity<UserDTO> getUserProfile(
            @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(userService.getUserByEmail(userDetails.getUsername()));
    }

    @GetMapping("/auth/me")
    public ResponseEntity<UserDTO> getCurrentUser(
            @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(401).build();
        UserDTO user = userService.getUserByEmail(userDetails.getUsername());
        log.debug("GET /auth/me — user={}", user.getEmail());
        return ResponseEntity.ok(user);
    }

    @PutMapping("/auth/profile")
    @Operation(summary = "Update current user's profile")
    public ResponseEntity<?> updateProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody UpdateProfileRequest request) {

        if (userDetails == null) {
            return ResponseEntity.status(401)
                    .body(new NotificationResponse(false, "Unauthorized"));
        }

        UserDTO user = userService.getUserByEmail(userDetails.getUsername());
        Long userId = user.getId();

        RegisterRequestAdmin updateRequest = new RegisterRequestAdmin();
        if (request.getUserName() != null && !request.getUserName().isBlank()) {
            updateRequest.setFullName(request.getUserName().trim());
        }
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            updateRequest.setEmail(request.getEmail().trim());
        }

        UserDTO updatedUser = (updateRequest.getFullName() != null || updateRequest.getEmail() != null)
                ? userService.updateUser(userId, updateRequest)
                : user;

        if (request.getLinkImage() != null && !request.getLinkImage().isBlank()) {
            updatedUser = userService.updateUserAvatar(userId, request.getLinkImage().trim());
        }

        log.info("Profile updated for userId={}", userId);
        return ResponseEntity.ok(new NotificationResponse(true, "Profile updated successfully", updatedUser));
    }
}
