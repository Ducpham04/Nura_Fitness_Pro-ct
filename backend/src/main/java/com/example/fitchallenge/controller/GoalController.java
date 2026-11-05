package com.example.fitchallenge.controller;

import com.example.fitchallenge.DTO.goalsDTO.goalsDTOpayload;
import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.service.GoalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/goals")
@RequiredArgsConstructor
@Tag(name = "Goals", description = "Public endpoints for fitness goals")
public class GoalController {

    private final GoalService goalService;

    @GetMapping
    @Operation(summary = "Get all fitness goals", description = "Retrieve list of available fitness goals for users")
    public ResponseEntity<NotificationResponse> getAllGoals() {
        List<goalsDTOpayload> goals = goalService.getGoals();
        // An empty catalogue is a valid state (fresh DB), not a client error —
        // the frontend falls back to its built-in goal list when this is empty.
        return ResponseEntity.ok(
                new NotificationResponse(true, "Goals retrieved successfully", goals)
        );
    }
}
