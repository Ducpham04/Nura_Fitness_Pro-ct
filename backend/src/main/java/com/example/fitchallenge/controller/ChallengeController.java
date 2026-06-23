package com.example.fitchallenge.controller;

import com.example.fitchallenge.DTO.ChallengeDTO.ChallengeResponseDTO;
import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.service.ChallengeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller cho Challenge APIs dành cho user (non-admin)
 */
@RestController
@RequestMapping("/api/challenges")
@RequiredArgsConstructor
@Tag(name = "Challenges", description = "APIs for fitness challenges management")
public class ChallengeController {

    private final ChallengeService challengeService;

    /**
     * Get all challenges với pagination và filters
     * 
     * @param status Filter by status (Active, Upcoming, Completed)
     * @param difficulty Filter by difficulty (Easy, Medium, Hard)
     * @param page Page number (default: 0)
     * @param limit Items per page (default: 10)
     * @return Page of ChallengeResponseDTO
     */
    @GetMapping
    @Operation(summary = "Get all challenges", description = "Retrieve paginated list of challenges with optional filters")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Challenges retrieved successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid parameters")
    })
    public ResponseEntity<Page<ChallengeResponseDTO>> getAllChallenges(
            @Parameter(description = "Filter by challenge status") @RequestParam(required = false) String status,
            @Parameter(description = "Filter by difficulty level") @RequestParam(required = false) String difficulty,
            @Parameter(description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Number of items per page") @RequestParam(defaultValue = "10") int limit) {
        
        Pageable pageable = PageRequest.of(page, limit);
        Page<ChallengeResponseDTO> challenges = challengeService.getAllChallengesForUser(status, difficulty, pageable);
        
        return ResponseEntity.ok(challenges);
    }

    /**
     * Get challenge by ID với participants list
     * 
     * @param id Challenge ID
     * @return ChallengeResponseDTO với participants list
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get challenge by ID", description = "Retrieve detailed information about a specific challenge")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Challenge retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Challenge not found")
    })
    public ResponseEntity<ChallengeResponseDTO> getChallengeById(@Parameter(description = "Challenge ID") @PathVariable Long id) {
        ChallengeResponseDTO challenge = challengeService.getChallengeByIdForUser(id);
        return ResponseEntity.ok(challenge);
    }

    /**
     * Join a challenge
     * 
     * @param id Challenge ID
     * @param request Body với userId
     * @return NotificationResponse
     */
    @PostMapping("/{id}/join")
    public ResponseEntity<NotificationResponse> joinChallenge(
            @PathVariable Long id,
            @Valid @RequestBody JoinChallengeRequest request) {

        NotificationResponse response = challengeService.joinChallenge(id, request.getUserId());
        if (!response.isSuccess()) {
            return ResponseEntity.status(400).body(response);
        }
        return ResponseEntity.ok(response);
    }
    
    // Inner class for join request
    @lombok.Data
    @lombok.AllArgsConstructor
    @lombok.NoArgsConstructor
    public static class JoinChallengeRequest {
        private Long userId;
        
        // Manual getter for Lombok compatibility
        public Long getUserId() {
            return userId;
        }
        
        public void setUserId(Long userId) {
            this.userId = userId;
        }
    }
}



