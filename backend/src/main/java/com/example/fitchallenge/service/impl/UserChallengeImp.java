package com.example.fitchallenge.service.impl;

import com.example.fitchallenge.DTO.UserChallengeDTO.UserChallengeDTO;
import com.example.fitchallenge.Entity.AiModelEvent;
import com.example.fitchallenge.Entity.Challenges;
import com.example.fitchallenge.Entity.Exercise;
import com.example.fitchallenge.Entity.User;
import com.example.fitchallenge.Entity.UserChallenge;
import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.repository.AiModelEventRepository;
import com.example.fitchallenge.repository.ChallengeRepository;
import com.example.fitchallenge.repository.UserChallengeRepository;
import com.example.fitchallenge.repository.User.UserRepository;
import com.example.fitchallenge.service.UserChallengeService;


import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserChallengeImp implements UserChallengeService {

    private final UserChallengeRepository userChallengeRepository;
    private final UserRepository userRepository;
    private final ChallengeRepository challengeRepository;
    private final AiModelEventRepository aiModelEventRepository;

    @Override
    @Transactional(readOnly = true)
    public NotificationResponse getAll() {
        List<UserChallengeDTO> list = userChallengeRepository.findAllWithUserAndChallenge()
                .stream()
                .map(uc -> UserChallengeDTO.builder()
                        .ucId(uc.getUcId())
                        .userId(uc.getUser().getId())
                        .challengeId(uc.getChallenge().getId())
                        .status(uc.getStatus().name())
                        .videoUrl(uc.getVideoUrl())
                        .keypointsPayload(uc.getKeypointsPayload())
                        .score(uc.getScore())
                        .confidence(uc.getConfidence())
                        .submittedAt(uc.getSubmittedAt())
                        .completedAt(uc.getCompletedAt())
                        .build())
                .collect(Collectors.toList());

        return new NotificationResponse(true, "Danh sách tất cả user challenge", list);
    }


    @Override
    @Transactional(readOnly = true)
    public NotificationResponse getById(Long id) {
        Optional<UserChallenge> found = userChallengeRepository.findById(id);
        return found.map(uc -> new NotificationResponse(true, "Tìm thấy bản ghi", toDto(uc)))
                .orElseGet(() -> new NotificationResponse(false, "Không tìm thấy user challenge có id = " + id));
    }

    /** Map entity → DTO (trong transaction) để tránh lazy serialization crash */
    private UserChallengeDTO toDto(UserChallenge uc) {
        return UserChallengeDTO.builder()
                .ucId(uc.getUcId())
                .userId(uc.getUser() != null ? uc.getUser().getId() : null)
                .challengeId(uc.getChallenge() != null ? uc.getChallenge().getId() : null)
                .status(uc.getStatus() != null ? uc.getStatus().name() : null)
                .videoUrl(uc.getVideoUrl())
                .keypointsPayload(uc.getKeypointsPayload())
                .score(uc.getScore())
                .confidence(uc.getConfidence())
                .submittedAt(uc.getSubmittedAt())
                .completedAt(uc.getCompletedAt())
                .build();
    }

    @Override
    public NotificationResponse create(UserChallengeDTO dto) {
        try {
            User user = userRepository.findById(dto.getUserId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy user có id " + dto.getUserId()));

            Challenges challenge = challengeRepository.findById(dto.getChallengeId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy challenge có id " + dto.getChallengeId()));

            UserChallenge newRecord = UserChallenge.builder()
                    .user(user)
                    .challenge(challenge)
                    .status(dto.getStatus() != null ? UserChallenge.UserChallengeStatus.valueOf(dto.getStatus()) : UserChallenge.UserChallengeStatus.PENDING)
                    .videoUrl(dto.getVideoUrl())
                    .keypointsPayload(dto.getKeypointsPayload())
                    .score(dto.getScore() != null ? dto.getScore().intValue() : null)
                    .confidence(dto.getConfidence())
                    .build();

            userChallengeRepository.save(newRecord);
            recordAiModelEventIfPresent(newRecord, dto);
            return new NotificationResponse(true, "Tạo user challenge thành công", toDto(newRecord));

        } catch (Exception e) {
            return new NotificationResponse(false, "Lỗi khi tạo user challenge: " + e.getMessage());
        }
    }

    @Override
    public NotificationResponse update(Long id, UserChallengeDTO dto) {
        Optional<UserChallenge> optional = userChallengeRepository.findById(id);

        if (optional.isEmpty()) {
            return new NotificationResponse(false, "Không tìm thấy bản ghi để cập nhật");
        }

        try {
            UserChallenge existing = optional.get();

            if (dto.getStatus() != null) existing.setStatus(UserChallenge.UserChallengeStatus.valueOf(dto.getStatus()));
            if (dto.getVideoUrl() != null) existing.setVideoUrl(dto.getVideoUrl());
            if (dto.getKeypointsPayload() != null) existing.setKeypointsPayload(dto.getKeypointsPayload());
            if (dto.getScore() != null) existing.setScore(dto.getScore());
            if (dto.getConfidence() != null) existing.setConfidence(dto.getConfidence());
            if (dto.getCompletedAt() != null) existing.setCompletedAt(dto.getCompletedAt());

            userChallengeRepository.save(existing);
            recordAiModelEventIfPresent(existing, dto);
            return new NotificationResponse(true, "Cập nhật thành công", toDto(existing));

        } catch (Exception e) {
            return new NotificationResponse(false, "Lỗi khi cập nhật: " + e.getMessage());
        }
    }

    /**
     * Ghi một dòng ai_model_events khi có rep đếm được (và optional JSON đầy đủ).
     * Cột reps/passed/... cho phép query tổng rep theo user/ngày mà không parse result_json.
     */
    private void recordAiModelEventIfPresent(UserChallenge uc, UserChallengeDTO dto) {
        if (dto.getReps() == null) {
            return;
        }
        Challenges ch = uc.getChallenge();
        Exercise exercise = primaryExercise(ch);
        AiModelEvent ev = new AiModelEvent();
        ev.setUserChallenge(uc);
        ev.setUser(uc.getUser());
        ev.setChallenge(ch);
        ev.setExercise(exercise);
        ev.setReps(dto.getReps());
        ev.setQualityScore(dto.getScore() != null ? dto.getScore().doubleValue() : null);
        ev.setConfidence(dto.getConfidence() != null ? dto.getConfidence() : uc.getConfidence());
        ev.setPassed(evaluatePass(exercise, dto.getReps()));
        ev.setExerciseType(exercise != null ? exercise.getExerciseType() : null);
        ev.setModelName(dto.getModelName());
        ev.setModelVersion(dto.getModelVersion());
        String blob = dto.getResultJson() != null ? dto.getResultJson() : dto.getKeypointsPayload();
        if (blob == null && uc.getKeypointsPayload() != null) {
            blob = uc.getKeypointsPayload();
        }
        ev.setResultJson(blob);
        aiModelEventRepository.save(ev);
    }

    private static Exercise primaryExercise(Challenges challenge) {
        if (challenge == null || challenge.getExercises() == null || challenge.getExercises().isEmpty()) {
            return null;
        }
        return challenge.getExercises().iterator().next();
    }

    private static Boolean evaluatePass(Exercise exercise, int reps) {
        if (exercise == null) {
            return null;
        }
        Integer min = exercise.getDefaultReps();
        if (min == null) {
            return null;
        }
        return reps >= min;
    }

    @Override
    public NotificationResponse delete(Long id) {
        if (!userChallengeRepository.existsById(id)) {
            return new NotificationResponse(false, "Không tìm thấy user challenge để xóa");
        }
        userChallengeRepository.deleteById(id);
        return new NotificationResponse(true, "Xóa user challenge thành công");
    }

    @Override
    @Transactional
    public NotificationResponse completeChallenge(Long id, Long userId) {
        Optional<UserChallenge> optional = userChallengeRepository.findById(id);
        
        if (optional.isEmpty()) {
            return new NotificationResponse(false, "Không tìm thấy challenge để đánh dấu hoàn thành");
        }
        
        UserChallenge userChallenge = optional.get();
        
        // Kiểm tra user có quyền đánh dấu challenge này không
        if (!userChallenge.getUser().getId().equals(userId)) {
            return new NotificationResponse(false, "Bạn không có quyền đánh dấu challenge này");
        }
        
        // Đánh dấu hoàn thành
        userChallenge.setStatus(UserChallenge.UserChallengeStatus.SUCCESS);
        userChallenge.setCompletedAt(ZonedDateTime.now());
        
        userChallengeRepository.save(userChallenge);
        
        return new NotificationResponse(true, "Đã đánh dấu challenge hoàn thành", userChallenge);
    }
}
