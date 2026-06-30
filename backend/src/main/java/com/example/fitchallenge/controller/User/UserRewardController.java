package com.example.fitchallenge.controller.User;

import com.example.fitchallenge.Security.AuthenticatedUserIdResolver;
import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.repository.User.UserRepository;
import com.example.fitchallenge.service.RewardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Endpoint cho USER duyệt & xem điểm để đổi thưởng.
 * (Quản lý reward catalog vẫn ở Admin: /api/admin/rewards)
 */
@RestController
@RequestMapping("/api/rewards")
@RequiredArgsConstructor
public class UserRewardController {

    private final RewardService rewardService;
    private final UserRepository userRepository;
    private final AuthenticatedUserIdResolver authUser;

    /** Danh sách phần thưởng để user duyệt & đổi (kèm tồn kho/điểm cần). */
    @GetMapping
    public NotificationResponse list() {
        return rewardService.getAllRewards();
    }

    /** Số dư điểm hiện tại của user — để cửa hàng đổi thưởng hiển thị. */
    @GetMapping("/balance/{userId}")
    public NotificationResponse balance(@PathVariable Long userId) {
        userId = authUser.resolve(userId); // số dư điểm của chính mình
        int points = userRepository.findById(userId)
                .map(u -> u.getPoints() != null ? u.getPoints() : 0)
                .orElse(0);
        return new NotificationResponse(true, "Success", Map.of("points", points));
    }
}
