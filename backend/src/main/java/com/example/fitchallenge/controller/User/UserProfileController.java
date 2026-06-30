package com.example.fitchallenge.controller.User;

import com.example.fitchallenge.DTO.user.userProfile.FullUserProfileDTO;
import com.example.fitchallenge.DTO.user.userProfile.UserProfileDTO;
import com.example.fitchallenge.Security.AuthenticatedUserIdResolver;
import com.example.fitchallenge.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST endpoints phục vụ API User Profile (Profile preview + full profile).
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserService userService;
    private final AuthenticatedUserIdResolver authUser;

    /**
     * Trả về thông tin profile cơ bản của user theo DTO {@link UserProfileDTO}.
     */
    @GetMapping("/{userId}/profile")
    public ResponseEntity<UserProfileDTO> getUserProfile(@PathVariable Long userId) {
        // Bỏ qua userId trên URL — luôn dùng user đang đăng nhập (chống lộ profile người khác)
        userId = authUser.resolve(userId);
        log.debug("Getting profile for userId: {}", userId);
        return ResponseEntity.ok(userService.getUserProfile(userId));
    }

    /**
     * Trả về full profile (bao gồm stats, activity, goals, weekly stats, achievements).
     */
    @GetMapping("/{userId}/profile/full")
    public ResponseEntity<FullUserProfileDTO> getFullUserProfile(@PathVariable Long userId) {
        userId = authUser.resolve(userId);
        return ResponseEntity.ok(userService.getFullUserProfile(userId));
    }
}




