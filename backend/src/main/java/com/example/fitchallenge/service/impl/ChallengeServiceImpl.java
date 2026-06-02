package com.example.fitchallenge.service.impl;

import com.example.fitchallenge.DTO.ChallengeDTO.ChallengeDTOPayload;
import com.example.fitchallenge.DTO.ChallengeDTO.ChallengeResponseDTO;
import com.example.fitchallenge.DTO.ChallengeDTO.ParticipantDTO;
import com.example.fitchallenge.Entity.Challenges;
import com.example.fitchallenge.Entity.Exercise;
import com.example.fitchallenge.Entity.UserChallenge;
import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.repository.ChallengeRepository;
import com.example.fitchallenge.repository.ExerciseRepository;
import com.example.fitchallenge.repository.GoalRepository;
import com.example.fitchallenge.repository.UserChallengeRepository;
import com.example.fitchallenge.repository.User.UserRepository;
import com.example.fitchallenge.service.ChallengeService;
import com.example.fitchallenge.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.stream.Collectors;

@Transactional(readOnly = true)
@Service
@RequiredArgsConstructor
public class ChallengeServiceImpl implements ChallengeService {

    private final ChallengeRepository challengeRepository;
    private final ExerciseRepository exerciseRepository;
    private final GoalRepository goalRepository;
    private final UserChallengeRepository userChallengeRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public NotificationResponse createChallenge(ChallengeDTOPayload dto, MultipartFile video) {
        try {
            if (dto.getTitle() == null || dto.getTitle().trim().isEmpty()) {
                return new NotificationResponse(false, "Challenge title cannot be empty");
            }

            if (challengeRepository.existsByTitle(dto.getTitle())) {
                return new NotificationResponse(false, "Challenge title already exists");
            }




            Challenges challenge = new Challenges();

            challenge.setTitle(dto.getTitle().trim());
            challenge.setDescription(dto.getDescription());
            challenge.setDurationDays(dto.getDurationDays() != null ? dto.getDurationDays() : 7);
            challenge.setRewardPoints(dto.getRewardPoints() != null ? dto.getRewardPoints() : 0);
            challenge.setReward(dto.getReward());
            challenge.setAiRulesJson(dto.getAiRulesJson());
            challenge.setStatus(dto.getStatus() != null
                    ? Challenges.Status.valueOf(dto.getStatus())
                    : Challenges.Status.ACTIVE);

            if (dto.getGoalId() != null) {
                goalRepository.findById(dto.getGoalId()).ifPresent(challenge::setGoal);
            }
            if (dto.getExerciseIds() != null && !dto.getExerciseIds().isEmpty()) {
                challenge.setExercises(new java.util.LinkedHashSet<>(exerciseRepository.findAllById(dto.getExerciseIds())));
            }

            challengeRepository.save(challenge);
            return new NotificationResponse(true, "Challenge created successfully", challenge);

        } catch (Exception e) {
            return new NotificationResponse(false, "Error creating challenge: " + e.getMessage());
        }
    }

    @Override
    public NotificationResponse getAllChallenges() {
        List<Challenges> list = challengeRepository.findAll();
        if (list.isEmpty()) {
            return new NotificationResponse(true, "No challenges found", List.of());
        }
        List<ChallengeResponseDTO> dtos = list.stream()
                .map(this::mapToChallengeResponseDTO)
                .collect(Collectors.toList());
        return new NotificationResponse(true, "Challenges retrieved successfully", dtos);
    }

    @Override
    public NotificationResponse getChallengeById(Long id) {
        return challengeRepository.findById(id)
                .map(ch -> new NotificationResponse(true, "Challenge found", mapToChallengeResponseDTO(ch)))
                .orElseGet(() -> new NotificationResponse(false, "Challenge not found"));
    }

    @Override
    @Transactional
    public NotificationResponse updateChallenge(Long id, ChallengeDTOPayload dto,  MultipartFile video) {
        try {
            Challenges challenge = challengeRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Challenge not found"));

            if (dto.getTitle() != null) challenge.setTitle(dto.getTitle());
            if (dto.getDescription() != null) challenge.setDescription(dto.getDescription());
            if (dto.getStatus() != null)
                challenge.setStatus(Challenges.Status.valueOf(dto.getStatus()));
            if (dto.getDurationDays() != null) challenge.setDurationDays(dto.getDurationDays());
            if (dto.getRewardPoints() != null) challenge.setRewardPoints(dto.getRewardPoints());
            if (dto.getReward() != null) challenge.setReward(dto.getReward());
            if (dto.getAiRulesJson() != null) challenge.setAiRulesJson(dto.getAiRulesJson());
            if (dto.getGoalId() != null) {
                goalRepository.findById(dto.getGoalId()).ifPresent(challenge::setGoal);
            }
            if (dto.getExerciseIds() != null) {
                challenge.setExercises(new java.util.LinkedHashSet<>(exerciseRepository.findAllById(dto.getExerciseIds())));
            }

            challengeRepository.save(challenge);
            return new NotificationResponse(true, "Challenge updated successfully", challenge);

        } catch (Exception e) {
            return new NotificationResponse(false, "Error updating challenge: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public NotificationResponse deleteChallenge(Long id) {
        try {
            if (!challengeRepository.existsById(id)) {
                return new NotificationResponse(false, "Challenge not found");
            }
            challengeRepository.deleteById(id);
            return new NotificationResponse(true, "Challenge deleted successfully");
        } catch (Exception e) {
            return new NotificationResponse(false, "Error deleting challenge: " + e.getMessage());
        }
    }
    
    @Override
    public Page<ChallengeResponseDTO> getAllChallengesForUser(String status, String difficulty, Pageable pageable) {
        List<Challenges> allChallenges = challengeRepository.findAll();
        
        // Filter by status
        if (status != null && !status.isEmpty()) {
            allChallenges = allChallenges.stream()
                    .filter(c -> c.getStatus() != null && 
                            c.getStatus().name().equalsIgnoreCase(status))
                    .collect(Collectors.toList());
        }
        
        // Map to DTOs
        List<ChallengeResponseDTO> dtos = allChallenges.stream()
                .map(this::mapToChallengeResponseDTO)
                .collect(Collectors.toList());
        
        // Apply pagination manually (or use Specification for better performance)
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), dtos.size());
        List<ChallengeResponseDTO> pagedDtos = dtos.subList(start, end);
        
        return new PageImpl<>(pagedDtos, pageable, dtos.size());
    }
    
    @Override
    public ChallengeResponseDTO getChallengeByIdForUser(Long id) {
        Challenges challenge = challengeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Challenge not found"));
        
        ChallengeResponseDTO dto = mapToChallengeResponseDTO(challenge);
        
        // Get participants list
        List<UserChallenge> userChallenges = userChallengeRepository.findByChallenge_Id(id);
        List<ParticipantDTO> participants = userChallenges.stream()
                .map(uc -> {
                    Integer progress = calculateProgress(uc);
                    Boolean completed = "success".equals(uc.getStatus());
                    
                    return ParticipantDTO.builder()
                            .userId(uc.getUser().getId())
                            .userName(uc.getUser().getUserName())
                            .joinedAt(uc.getSubmittedAt() != null ? 
                                    uc.getSubmittedAt().toOffsetDateTime() : null)
                            .progress(progress)
                            .completed(completed)
                            .build();
                })
                .collect(Collectors.toList());
        
        dto.setParticipantsList(participants);
        return dto;
    }
    
    @Override
    @Transactional
    public NotificationResponse joinChallenge(Long challengeId, Long userId) {
        try {
            // Check if challenge exists
            Challenges challenge = challengeRepository.findById(challengeId)
                    .orElseThrow(() -> new RuntimeException("Challenge not found"));
            
            // Check if user exists
            if (!userRepository.existsById(userId)) {
                return new NotificationResponse(false, "User not found");
            }
            
            // Check if user already joined
            boolean alreadyJoined = userChallengeRepository.findByChallenge_Id(challengeId)
                    .stream()
                    .anyMatch(uc -> uc.getUser().getId().equals(userId));
            
            if (alreadyJoined) {
                return new NotificationResponse(false, "User already joined this challenge");
            }
            
            // Create UserChallenge
            com.example.fitchallenge.Entity.User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            UserChallenge userChallenge = UserChallenge.builder()
                    .user(user)
                    .challenge(challenge)
                    .status(UserChallenge.UserChallengeStatus.PENDING)
                    .build();
            
            UserChallenge saved = userChallengeRepository.save(userChallenge);

            // Trả DTO gọn (không trả raw entity → tránh lazy serialization crash)
            java.util.Map<String, Object> data = new java.util.LinkedHashMap<>();
            data.put("ucId", saved.getUcId());
            data.put("userId", userId);
            data.put("challengeId", challengeId);
            data.put("status", saved.getStatus() != null ? saved.getStatus().name() : "PENDING");
            return new NotificationResponse(true, "Successfully joined challenge", data);
        } catch (Exception e) {
            return new NotificationResponse(false, "Error joining challenge: " + e.getMessage());
        }
    }
    
    private ChallengeResponseDTO mapToChallengeResponseDTO(Challenges challenge) {
        // Get participants count
        long participantsCount = userChallengeRepository.countByChallenge_Id(challenge.getId());
        
        // Map status enum to string
        String status = challenge.getStatus() != null ? 
                challenge.getStatus().name() : null;
        List<Long> exerciseIds = challenge.getExercises() == null
                ? List.of()
                : challenge.getExercises().stream().map(Exercise::getId).toList();
        
        return ChallengeResponseDTO.builder()
                .id(challenge.getId())
                .title(challenge.getTitle())
                .description(challenge.getDescription())
                .participants((int) participantsCount)
                .reward(challenge.getReward())
                .durationDays(challenge.getDurationDays())
                .rewardPoints(challenge.getRewardPoints())
                .aiRulesJson(challenge.getAiRulesJson())
                .status(status)
                .exerciseIds(exerciseIds)
                .createdAt(challenge.getCreatedAt())
                .updatedAt(challenge.getUpdatedAt())
                .build();
    }
    
    private Integer calculateProgress(UserChallenge uc) {
        // Calculate progress based on status and completion
        if ("success".equals(uc.getStatus())) {
            return 100;
        } else if ("pending".equals(uc.getStatus())) {
            return 0;
        } else {
            return 50; // Default for other statuses
        }
    }
}
