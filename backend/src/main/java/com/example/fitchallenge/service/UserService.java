package com.example.fitchallenge.service;

import com.example.fitchallenge.DTO.user.JwtResponse;
import com.example.fitchallenge.DTO.user.LoginRequest;
import com.example.fitchallenge.DTO.user.RegisterRequestAdmin;
import com.example.fitchallenge.DTO.user.RegisterRequestCustomer;
import com.example.fitchallenge.DTO.user.UserDTO;
import com.example.fitchallenge.DTO.user.userProfile.FullUserProfileDTO;
import com.example.fitchallenge.DTO.user.userProfile.UserProfileDTO;
import com.example.fitchallenge.config.NotificationResponse;
import org.springframework.security.core.userdetails.UserDetails;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserService {
    JwtResponse register(RegisterRequestAdmin registerRequestAdmin);
    JwtResponse registerCustomer(RegisterRequestCustomer registerRequestCustomer ) ;
    JwtResponse login(LoginRequest loginRequest);

    /** Đăng nhập / tự đăng ký bằng Google: verify ID token rồi phát JWT của hệ thống. */
    JwtResponse loginWithGoogle(String idToken);

    NotificationResponse logout(String token);
    UserDetails loadUserByEmail(String username);
    NotificationResponse getAllUsers();
    Page<UserDTO> getAllUsersPaginated(String status, String role, String search, Pageable pageable);
    UserDTO getUserById(Long id);
    com.example.fitchallenge.Entity.User getUserEntityById(Long id);
    UserDTO getUserByEmail(String email) ;
    UserProfileDTO getUserProfile(Long userId);
    FullUserProfileDTO getFullUserProfile(Long userId);
    UserDTO createUser(RegisterRequestAdmin request);
    UserDTO updateUser(Long id, RegisterRequestAdmin request);
    UserDTO updateUserAvatar(Long id, String avatarUrl);
    NotificationResponse deleteUser(Long id);

    // User tự quản lý tài khoản
    UserDTO updateMyProfile(Long userId, String fullName, String email);
    void changePassword(Long userId, String currentPassword, String newPassword);
    void deactivateMyAccount(Long userId);

    // ── Forgot / Reset password ───────────────────────────────────────────────
    /**
     * Tạo token và gửi email đặt lại mật khẩu.
     * Luôn trả về bình thường (không tiết lộ email có tồn tại hay không).
     */
    void forgotPassword(String email);

    /**
     * Đặt lại mật khẩu bằng token từ email.
     * @throws IllegalArgumentException nếu token không hợp lệ / hết hạn / đã dùng
     */
    void resetPassword(String token, String newPassword);
}
