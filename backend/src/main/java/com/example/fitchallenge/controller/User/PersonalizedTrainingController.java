package com.example.fitchallenge.controller.User;

import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.repository.UserTrainingRepository;
import com.example.fitchallenge.service.PersonalizationService;
import com.example.fitchallenge.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class PersonalizedTrainingController {

    private final PersonalizationService personalizationService;
    private final UserService userService;
    private final UserTrainingRepository userTrainingRepository;

    /**
     * GET /api/user/training/{utId}/day/{dayNumber}
     * Lấy danh sách bài tập đã được cá nhân hóa cho một ngày cụ thể
     * (Giữ lại để backward compatibility)
     */
    @GetMapping("/training/{utId}/day/{dayNumber}")
    public ResponseEntity<NotificationResponse> getPersonalizedDayDetails(
            @PathVariable Long utId,
            @PathVariable Integer dayNumber) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || auth.getName() == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new NotificationResponse(false, "Unauthorized"));
            }
            Long currentUserId = userService.getUserByEmail(auth.getName()).getId();
            if (!userTrainingRepository.existsByUtIdAndUser_Id(utId, currentUserId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new NotificationResponse(false, "Bạn không có quyền truy cập training plan này"));
            }
            return ResponseEntity.ok(personalizationService.getPersonalizedDayDetails(utId, dayNumber));
        } catch (Exception e) {
            log.error("Unexpected error", e);
            return ResponseEntity.ok(new NotificationResponse(false, "Error: " + e.getMessage()));
        }
    }

    /**
     * GET /api/user/personalized/today?dayNumber=5
     * Lấy bài tập cá nhân hóa cho hôm nay
     * Video URL được lấy từ Challenge entity
     */
    @GetMapping("/personalized/today")
    public ResponseEntity<NotificationResponse> getTodayPersonalizedWorkout(
            @RequestParam(required = false) Integer dayNumber,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            if (userDetails == null) {
                return ResponseEntity.status(401).body(
                    new NotificationResponse(false, "Unauthorized")
                );
            }
            Long userId = userService.getUserByEmail(userDetails.getUsername()).getId();
            
            // Nếu không có dayNumber, mặc định là day 1
            if (dayNumber == null) {
                dayNumber = 1;
            }

            return ResponseEntity.ok(
                personalizationService.getTodayPersonalizedWorkout(userId, dayNumber)
            );
        } catch (Exception e) {
            log.error("Unexpected error", e);
            return ResponseEntity.ok(
                new NotificationResponse(false, "Error: " + e.getMessage())
            );
        }
    }

    /**
     * GET /api/user/personalized/schedule
     * Lấy toàn bộ lịch tập cá nhân hóa của user để FE hiển thị full schedule.
     */
    @GetMapping("/personalized/schedule")
    public ResponseEntity<NotificationResponse> getPersonalizedWorkoutSchedule(
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            if (userDetails == null) {
                return ResponseEntity.status(401).body(
                    new NotificationResponse(false, "Unauthorized")
                );
            }
            Long userId = userService.getUserByEmail(userDetails.getUsername()).getId();

            return ResponseEntity.ok(
                personalizationService.getAllPersonalizedPlanDetails(userId)
            );
        } catch (Exception e) {
            log.error("Unexpected error", e);
            return ResponseEntity.ok(
                new NotificationResponse(false, "Error: " + e.getMessage())
            );
        }
    }

    /**
     * GET /api/user/personalized/{ppdId}/alternatives?muscle=Chest
     * Lấy danh sách bài tập thay thế cho một bài trong kế hoạch.
     * muscle (optional): nhóm cơ người dùng mong muốn
     */
    @GetMapping("/personalized/{ppdId}/alternatives")
    public ResponseEntity<NotificationResponse> getAlternativeExercises(
            @PathVariable Long ppdId,
            @RequestParam(required = false) String muscle) {
        try {
            return ResponseEntity.ok(personalizationService.getAlternativeExercises(ppdId, muscle));
        } catch (Exception e) {
            log.error("Error fetching alternatives", e);
            return ResponseEntity.ok(new NotificationResponse(false, "Error: " + e.getMessage()));
        }
    }

    /**
     * PUT /api/user/personalized/{ppdId}/swap/{newExerciseId}
     * Đổi bài tập hiện tại sang bài mới trong kế hoạch cá nhân.
     */
    @PutMapping("/personalized/{ppdId}/swap/{newExerciseId}")
    public ResponseEntity<NotificationResponse> swapExercise(
            @PathVariable Long ppdId,
            @PathVariable Long newExerciseId) {
        try {
            return ResponseEntity.ok(personalizationService.swapExercise(ppdId, newExerciseId));
        } catch (Exception e) {
            log.error("Error swapping exercise", e);
            return ResponseEntity.ok(new NotificationResponse(false, "Error: " + e.getMessage()));
        }
    }

    /**
     * POST /api/user/training/{utId}/regenerate-personalized
     * Tạo lại PersonalizedPlanDetail cho một UserTraining đã tồn tại
     * Dùng khi PersonalizedPlanDetail chưa được tạo hoặc cần tạo lại
     */
    @PostMapping("/training/{utId}/regenerate-personalized")
    public ResponseEntity<NotificationResponse> regeneratePersonalizedPlanDetails(
            @PathVariable Long utId) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || auth.getName() == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new NotificationResponse(false, "Unauthorized"));
            }
            Long currentUserId = userService.getUserByEmail(auth.getName()).getId();
            if (!userTrainingRepository.existsByUtIdAndUser_Id(utId, currentUserId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new NotificationResponse(false, "Bạn không có quyền truy cập training plan này"));
            }
            NotificationResponse response = personalizationService.createPersonalizedPlanDetails(utId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Unexpected error", e);
            return ResponseEntity.ok(new NotificationResponse(false, "Error: " + e.getMessage()));
        }
    }
}
