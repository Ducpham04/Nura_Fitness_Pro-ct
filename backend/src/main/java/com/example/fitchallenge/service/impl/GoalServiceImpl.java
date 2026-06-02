package com.example.fitchallenge.service.impl;

import com.example.fitchallenge.DTO.goalsDTO.goalsDTOpayload;
import com.example.fitchallenge.Entity.Goals;
import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.repository.GoalRepository;
import com.example.fitchallenge.service.FileStorageService;
import com.example.fitchallenge.service.GoalService;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import org.slf4j.Logger;
import org.springframework.web.multipart.MultipartFile;


import java.util.stream.Collectors;

@Transactional(readOnly = true)
@Service
@RequiredArgsConstructor
public class GoalServiceImpl implements GoalService {

    private static final Logger logger = (Logger) LoggerFactory.getLogger(GoalServiceImpl.class);

    private final GoalRepository goalRepository;

    private final FileStorageService fileChallengeService;



    @Override
    public List<goalsDTOpayload> getGoals() {


        logger.info("Fetching all goals successfully");
        return goalRepository.findAll().stream()
                .map(goal -> {
                    goalsDTOpayload dto = new goalsDTOpayload();
                    dto.setId(goal.getId());
                    dto.setImageLink(goal.getImageLink());
                    dto.setName(goal.getName());
                    dto.setDescription(goal.getDescription());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public NotificationResponse createGoal(goalsDTOpayload dto, MultipartFile image) {
        if (dto == null) return new NotificationResponse(false, "Goal data cannot be null");
        if (dto.getName() == null || dto.getName().trim().isEmpty())
            return new NotificationResponse(false, "Goal name cannot be empty");
//
        if (goalRepository.existsByName(dto.getName()))
            return new NotificationResponse(false, "Tên mục tiêu đã tồn tại");
        String imagePath = (image != null && !image.isEmpty())
                ? fileChallengeService.uploadFile(image)
                : (dto.getImageLink() != null && !dto.getImageLink().isBlank() ? dto.getImageLink().trim() : null);
        Goals goals = new Goals();
        goals.setImageLink(imagePath);
        goals.setName(dto.getName().trim());
        goals.setDescription(dto.getDescription() != null ? dto.getDescription().trim() : "");


        goalRepository.save(goals);
        logger.info("Created new goal: {}", goals.getName());
        return new NotificationResponse(true, "Goal created successfully", goals);
    }

    @Override
    @Transactional
    public NotificationResponse delete(Long id) {
        if (id == null) return new NotificationResponse(false, "Goal ID cannot be null");
        if (!goalRepository.existsById(id)) return new NotificationResponse(false, "Goal not found");

        goalRepository.deleteById(id);
        logger.info("Deleted goal with ID {}", id);
        return new NotificationResponse(true, "Goal deleted successfully");
    }

    @Override
    @Transactional
    public NotificationResponse update(Long id, goalsDTOpayload dto, MultipartFile image) {

        if (id == null)
            return new NotificationResponse(false, "Goal ID cannot be null");

        Goals existingGoal = goalRepository.findById(id).orElse(null);
        if (existingGoal == null)
            return new NotificationResponse(false, "Goal not found");


        // Check duplicate name
        if (dto.getName() != null && !existingGoal.getName().equalsIgnoreCase(dto.getName())
                && goalRepository.existsByName(dto.getName())) {
            return new NotificationResponse(false, "Tên mục tiêu đã tồn tại");
        }

        // ✔ 1. HANDLE IMAGE UPDATE LOGIC
        if (image != null && !image.isEmpty()) {
            // Upload file ảnh mới → ưu tiên cao nhất
            String imagePath = fileChallengeService.uploadFile(image);
            existingGoal.setImageLink(imagePath);
        } else if (dto.getImageLink() != null && !dto.getImageLink().isBlank()) {
            // Không upload file → dùng URL do admin nhập trực tiếp
            existingGoal.setImageLink(dto.getImageLink().trim());
        }
        // Nếu cả hai đều null/rỗng → giữ nguyên ảnh cũ

        // ✔ 2. UPDATE TEXT FIELDS SAFELY
        if (dto.getDescription() != null)
            existingGoal.setDescription(dto.getDescription().trim());
        if( dto.getName() != null){
            existingGoal.setName(dto.getName().trim());
        }


        // Save
        goalRepository.save(existingGoal);

        logger.info("Updated goal with ID {}", id);
        return new NotificationResponse(true, "Goal updated successfully", existingGoal);
    }

}
