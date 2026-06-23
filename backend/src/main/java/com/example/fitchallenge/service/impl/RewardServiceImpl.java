package com.example.fitchallenge.service.impl;

import com.example.fitchallenge.DTO.RewardDTO.*;
import com.example.fitchallenge.Entity.Reward;
import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.repository.RewardRepository;
import com.example.fitchallenge.service.FileStorageService;
import com.example.fitchallenge.service.RewardService;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.stream.Collectors;
@Slf4j
@Transactional(readOnly = true)
@Service
@RequiredArgsConstructor
public class RewardServiceImpl implements RewardService {

    private final RewardRepository rewardRepository;
    private final FileStorageService fileService;

    @Override
    @Transactional
    public NotificationResponse createReward(AdminRewardDTO request, MultipartFile file) {
        log.debug("Creating reward with data: {}", request.getName());
        Reward reward = Reward.builder()
                .name(request.getName())
                .description(request.getDescription())
                .costPoints(request.getPoints())
                .expireAt(request.getExpireAt() != null ? request.getExpireAt().toInstant().atZone(java.time.ZoneId.systemDefault()) : null)
                .claimed(request.getClaimed())
                .stock(request.getTotal())
                .externalPartner(request.getExternalPartner())
                .rewardType(request.getRewardType() != null ? request.getRewardType().toUpperCase() : "PHYSICAL")
                .creditValue(request.getCreditValue() != null ? request.getCreditValue() : 0)
                .build();

        if (file != null && !file.isEmpty()) {
            String fileUrl = fileService.uploadFile(file);
            reward.setLinkImage(fileUrl); // sửa typo
        }

        rewardRepository.save(reward);
        return new NotificationResponse(true, "Reward created successfully", reward);
    }

    @Override
    @Transactional
    public NotificationResponse updateReward(Long id, AdminRewardDTO request, MultipartFile file) {
        Reward reward = rewardRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Reward not found"));

        reward.setName(request.getName());
        reward.setDescription(request.getDescription());
        reward.setCostPoints(request.getPoints());
        reward.setStock(request.getTotal());
        reward.setExpireAt(request.getExpireAt() != null ? request.getExpireAt().toInstant().atZone(java.time.ZoneId.systemDefault()) : null);
        reward.setClaimed(request.getClaimed());
        reward.setExternalPartner(request.getExternalPartner());
        if (request.getRewardType() != null) {
            reward.setRewardType(request.getRewardType().toUpperCase());
        }
        if (request.getCreditValue() != null) {
            reward.setCreditValue(request.getCreditValue());
        }

        // Upload file mới nếu có
        if (file != null && !file.isEmpty()) {
            String fileUrl = fileService.uploadFile(file);
            reward.setLinkImage(fileUrl);
        } else if (request.getLinkImage() != null) {
            // giữ link hiện tại nếu DTO gửi
            reward.setLinkImage(request.getLinkImage());
        }

        rewardRepository.save(reward);
        return new NotificationResponse(true, "Reward updated", reward);
    }

    @Override
    @Transactional
    public NotificationResponse deleteReward(Long id) {
        rewardRepository.deleteById(id);
        return new NotificationResponse(true, "Reward deleted");
    }

    @Override
    public NotificationResponse getRewardById(Long id) {
        Reward reward = rewardRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Reward not found"));
        return new NotificationResponse(true, "Success", reward);
    }

    @Override
    public NotificationResponse getAllRewards() {
        List<AdminRewardDTO> rewards = rewardRepository.findAll().stream()
                .map(reward -> AdminRewardDTO.builder()
                        .id(reward.getRewardId())
                        .name(reward.getName())
                        .description(reward.getDescription())
                        .linkImage(reward.getLinkImage())
                        .points(reward.getCostPoints())
                        .total(reward.getStock())
                        .claimed(reward.getClaimed())
                        .status(reward.getStock() != null && reward.getStock() > 0 ? "Available" : "Out of Stock")
                        .externalPartner(reward.getExternalPartner())
                        .expireAt(reward.getExpireAt() != null ? java.util.Date.from(reward.getExpireAt().toInstant()) : null)
                        .rewardType(reward.getRewardType() != null ? reward.getRewardType() : "PHYSICAL")
                        .creditValue(reward.getCreditValue() != null ? reward.getCreditValue() : 0)
                        .build())
                .collect(Collectors.toList());
        return new NotificationResponse(true, "Success", rewards);
    }
}
