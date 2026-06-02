package com.example.fitchallenge.controller;

import com.example.fitchallenge.DTO.user.LoginRequest;
import com.example.fitchallenge.DTO.user.RegisterRequestAdmin;
import com.example.fitchallenge.DTO.user.RegisterRequestCustomer;
import com.example.fitchallenge.DTO.user.UpdateProfileRequest;
import com.example.fitchallenge.DTO.user.JwtResponse;
import com.example.fitchallenge.DTO.user.UserDTO;
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
        @ApiResponse(responseCode = "401", description = "Invalid credentials")
    })
    public ResponseEntity<JwtResponse> login(
            @Valid @RequestBody LoginRequest request) {
        JwtResponse jwtResponse = userService.login(request);
        return ResponseEntity.ok(jwtResponse);
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
