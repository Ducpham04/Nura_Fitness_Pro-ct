package com.example.fitchallenge.controller;

import com.example.fitchallenge.DTO.UserTrainingDTO.UserRequestDTO;
import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.service.UserTrainingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/user/training")
@RequiredArgsConstructor
public class UserTrainingDetailController {
    private final UserTrainingService userTrainingService;
    @GetMapping("/{userId}")
    public NotificationResponse getUserTrainingDetails(@PathVariable Long userId) {
        log.debug("Fetching training details for user ID: {}", userId);
        return userTrainingService.getUserTrainingDetails(userId);
    }

    @PostMapping
    public NotificationResponse createUserTraining(@Valid @RequestBody UserRequestDTO res) {
        log.debug("Creating training for user ID: {}", res.getUserID());
        return userTrainingService.createUserTraining(res);
    }
}
