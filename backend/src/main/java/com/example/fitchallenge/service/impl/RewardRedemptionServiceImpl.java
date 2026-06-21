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
import com.example.fitchallenge.service.AiUsageService;
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
    private final AiUsageService aiUsageService;

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

        int cost = reward.getCostPoints() != null ? reward.getCostPoints() : 0;
        int userPoints = user.getPoints() != null ? user.getPoints() : 0;

        // ── Validate sơ bộ để trả lỗi thân thiện (không thay cho khóa atomic) ──
        if ((reward.getStock() != null ? reward.getStock() : 0) <= 0) {
            return new NotificationResponse(false, "Phần thưởng đã hết hàng");
        }
        if (userPoints < cost) {
            return new NotificationResponse(false,
                    "Không đủ điểm. Cần " + cost + " điểm, bạn có " + userPoints);
        }

        // ── Trừ tồn kho + điểm bằng conditional UPDATE (atomic tại DB) ────────
        // Chống double-spend/oversell khi nhiều request đổi thưởng chạy song song:
        // mỗi update chỉ thành công khi điều kiện (stock>=1 / points>=cost) còn đúng.
        if (rewardRepository.decrementStockIfAvailable(reward.getRewardId()) == 0) {
            return new NotificationResponse(false, "Phần thưởng đã hết hàng");
        }
        if (userRepository.deductPointsIfEnough(user.getId(), cost) == 0) {
            // Trừ điểm thất bại (đã bị trừ bởi request khác) → hoàn lại tồn kho vừa giảm
            rewardRepository.incrementStock(reward.getRewardId());
            return new NotificationResponse(false,
                    "Không đủ điểm. Cần " + cost + " điểm, bạn có " + userPoints);
        }

        // ── Xử lý theo loại phần thưởng ─────────────────────────────────────
        String rewardType = reward.getRewardType() != null ? reward.getRewardType() : "PHYSICAL";

        if ("CREDIT".equalsIgnoreCase(rewardType)) {
            // Cộng credit AI ngay lập tức, không cần tạo redemption chờ
            int creditValue = reward.getCreditValue() != null ? reward.getCreditValue() : 0;
            if (creditValue > 0) {
                aiUsageService.adminAdjustCredit(user.getId(), null, null, creditValue);
            }
            RewardRedemption redemption = new RewardRedemption();
            redemption.setUser(user);
            redemption.setReward(reward);
            redemption.setStatus(RewardRedemption.RedemptionStatus.FULFILLED);
            redemption.setCreatedAt(ZonedDateTime.now());
            redemption.setFulfilledAt(ZonedDateTime.now());
            rewardRedemptionRepository.save(redemption);

            RewardRedemptionResponse response = toResponse(redemption);
            return new NotificationResponse(true,
                    "Đổi thành công! Đã trừ " + cost + " điểm và cộng " + creditValue + " credit AI.", response);
        }

        // PHYSICAL — tạo redemption chờ admin giao
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
