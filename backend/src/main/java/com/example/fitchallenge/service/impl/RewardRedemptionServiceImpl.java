package com.example.fitchallenge.service.impl;

import com.example.fitchallenge.DTO.RewardRedemptionDTO.RewardRedemptionRequest;
import com.example.fitchallenge.DTO.RewardRedemptionDTO.RewardRedemptionResponse;
import com.example.fitchallenge.Entity.Reward;
import com.example.fitchallenge.Entity.RewardRedemption;
import com.example.fitchallenge.Entity.User;
import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.repository.RewardRedemptionRepository;
import com.example.fitchallenge.repository.RewardRepository;
import com.example.fitchallenge.repository.User.UserRepository;
import com.example.fitchallenge.service.RewardRedemptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Transactional(readOnly = true)
@Service
@RequiredArgsConstructor
public class RewardRedemptionServiceImpl implements RewardRedemptionService {

    private final RewardRedemptionRepository rewardRedemptionRepository;
    private final UserRepository userRepository;
    private final RewardRepository rewardRepository;

    // Chuyển entity -> DTO
    private RewardRedemptionResponse toResponse(RewardRedemption redemption) {
        RewardRedemptionResponse dto = new RewardRedemptionResponse();
        dto.setId(redemption.getId());
        dto.setUserName(redemption.getUser().getUserName());
        dto.setRewardName(redemption.getReward().getName());
        dto.setStatus(redemption.getStatus().name());
        dto.setCreatedAt(redemption.getCreatedAt());
        dto.setFulfilledAt(redemption.getFulfilledAt());
        return dto;
    }

    @Override
    @Transactional
    public NotificationResponse redeemReward(RewardRedemptionRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        Reward reward = rewardRepository.findById(request.getRewardId())
                .orElseThrow(() -> new RuntimeException("Reward not found"));

        // ── Validate tồn kho ──────────────────────────────────────────────
        int stock = reward.getStock() != null ? reward.getStock() : 0;
        if (stock <= 0) {
            return new NotificationResponse(false, "Phần thưởng đã hết hàng");
        }

        // ── Validate đủ điểm ──────────────────────────────────────────────
        int cost = reward.getCostPoints() != null ? reward.getCostPoints() : 0;
        int userPoints = user.getPoints() != null ? user.getPoints() : 0;
        if (userPoints < cost) {
            return new NotificationResponse(false,
                    "Không đủ điểm. Cần " + cost + " điểm, bạn có " + userPoints);
        }

        // ── Trừ điểm + giảm tồn kho (nguyên tử nhờ @Transactional) ─────────
        user.setPoints(userPoints - cost);
        userRepository.save(user);
        reward.setStock(stock - 1);
        rewardRepository.save(reward);

        RewardRedemption redemption = new RewardRedemption();
        redemption.setUser(user);
        redemption.setReward(reward);
        redemption.setStatus(RewardRedemption.RedemptionStatus.PENDING);
        redemption.setCreatedAt(ZonedDateTime.now());
        rewardRedemptionRepository.save(redemption);

        RewardRedemptionResponse response = toResponse(redemption);
        return new NotificationResponse(true,
                "Đổi thưởng thành công! Đã trừ " + cost + " điểm. Đang chờ giao.", response);
    }

    @Override
    public NotificationResponse getAllRedemptions() {
        List<RewardRedemptionResponse> responseList = rewardRedemptionRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return new NotificationResponse(true, "All redemptions retrieved", responseList);
    }

    @Override
    @Transactional
    public NotificationResponse updateStatus(Long redemptionId, String status) {
        RewardRedemption redemption = rewardRedemptionRepository.findById(redemptionId)
                .orElseThrow(() -> new RuntimeException("Redemption not found"));

        RewardRedemption.RedemptionStatus oldStatus = redemption.getStatus();
        RewardRedemption.RedemptionStatus newStatus =
                RewardRedemption.RedemptionStatus.valueOf(status.toUpperCase());

        // ── Huỷ một redemption chưa huỷ → HOÀN điểm + tồn kho ──────────────
        if (newStatus == RewardRedemption.RedemptionStatus.CANCELLED
                && oldStatus != RewardRedemption.RedemptionStatus.CANCELLED) {
            User user = redemption.getUser();
            Reward reward = redemption.getReward();
            if (user != null && reward != null) {
                int cost = reward.getCostPoints() != null ? reward.getCostPoints() : 0;
                user.setPoints((user.getPoints() != null ? user.getPoints() : 0) + cost);
                userRepository.save(user);
                reward.setStock((reward.getStock() != null ? reward.getStock() : 0) + 1);
                rewardRepository.save(reward);
            }
        }

        redemption.setStatus(newStatus);
        if (newStatus == RewardRedemption.RedemptionStatus.FULFILLED) {
            redemption.setFulfilledAt(ZonedDateTime.now());
        }
        rewardRedemptionRepository.save(redemption);

        RewardRedemptionResponse response = toResponse(redemption);
        return new NotificationResponse(true, "Status updated", response);
    }
}
