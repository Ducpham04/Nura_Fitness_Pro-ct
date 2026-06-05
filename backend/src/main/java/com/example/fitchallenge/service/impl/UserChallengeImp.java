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
import com.example.fitchallenge.service.AIGatewayService;
import com.example.fitchallenge.service.FileStorageService;
import com.example.fitchallenge.service.UserChallengeService;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.ZonedDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserChallengeImp implements UserChallengeService {

    private final UserChallengeRepository userChallengeRepository;
    private final UserRepository userRepository;
    private final ChallengeRepository challengeRepository;
    private final AiModelEventRepository aiModelEventRepository;
    private final AIGatewayService aiGatewayService;
    private final FileStorageService fileStorageService;
    private final ObjectMapper objectMapper = new ObjectMapper();

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

        UserChallenge saved = userChallengeRepository.save(userChallenge);

        // Trả DTO gọn (không trả raw entity → tránh lazy serialization crash → 500)
        java.util.Map<String, Object> data = new java.util.LinkedHashMap<>();
        data.put("ucId", saved.getUcId());
        data.put("challengeId", saved.getChallenge() != null ? saved.getChallenge().getId() : null);
        data.put("status", saved.getStatus() != null ? saved.getStatus().name() : "SUCCESS");
        data.put("completedAt", saved.getCompletedAt());
        return new NotificationResponse(true, "Đã đánh dấu challenge hoàn thành", data);
    }

    @Override
    @Transactional
    public NotificationResponse submitChallengeAttempt(Long ucId, Long userId, MultipartFile image) {
        if (image == null || image.isEmpty()) {
            return new NotificationResponse(false, "Vui lòng tải lên ảnh bài thi.");
        }

        Optional<UserChallenge> optional = userChallengeRepository.findById(ucId);
        if (optional.isEmpty()) {
            return new NotificationResponse(false, "Không tìm thấy thử thách đã tham gia.");
        }
        UserChallenge uc = optional.get();
        if (uc.getUser() == null || !uc.getUser().getId().equals(userId)) {
            return new NotificationResponse(false, "Bạn không có quyền nộp bài cho thử thách này.");
        }
        Challenges challenge = uc.getChallenge();

        // exercise_type: lấy từ bài tập đầu tiên của challenge, fallback tiêu đề
        String exerciseType = challenge.getExercises() == null ? null : challenge.getExercises().stream()
                .map(Exercise::getExerciseType)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
        if (exerciseType == null || exerciseType.isBlank()) {
            exerciseType = challenge.getTitle() != null ? challenge.getTitle() : "general";
        }

        // Lưu ảnh trước (đọc stream 1 lần), sau đó gọi AI chấm điểm
        String imageUrl;
        try {
            imageUrl = fileStorageService.uploadFile(image);
        } catch (Exception e) {
            return new NotificationResponse(false, "Không lưu được ảnh bài thi: " + e.getMessage());
        }

        // Gọi AI (Groq Vision) chấm điểm form
        NotificationResponse ai = aiGatewayService.analyzePose(image, exerciseType, userId);
        if (!ai.isSuccess() || !(ai.getData() instanceof Map)) {
            return new NotificationResponse(false,
                    ai.getMessage() != null ? ai.getMessage() : "AI chấm điểm thất bại. Vui lòng thử lại.");
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> result = (Map<String, Object>) ai.getData();

        int overallScore = clamp(toInt(result.get("overall_score")), 0, 100); // 0-100
        double confidence = toDouble(result.get("confidence"));                // 0-1

        // Ngưỡng đậu: lấy min_quality_score (0-1) trong aiRulesJson, mặc định 0.7
        double minQuality = readThreshold(challenge.getAiRulesJson(), "min_quality_score", 0.7);
        double minConfidence = readThreshold(challenge.getAiRulesJson(), "min_confidence", 0.25);
        int passScore = (int) Math.round(minQuality * 100);
        boolean passed = overallScore >= passScore && confidence >= minConfidence;

        // Lưu kết quả vào UserChallenge
        uc.setVideoUrl(imageUrl);
        uc.setScore(overallScore);
        uc.setConfidence(confidence);
        uc.setKeypointsPayload(safeJson(result));
        uc.setSubmittedAt(ZonedDateTime.now());
        uc.setStatus(passed ? UserChallenge.UserChallengeStatus.SUCCESS : UserChallenge.UserChallengeStatus.FAILED);
        if (passed) {
            uc.setCompletedAt(ZonedDateTime.now());
        }
        userChallengeRepository.save(uc);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("ucId", uc.getUcId());
        data.put("challengeId", challenge.getId());
        data.put("status", uc.getStatus().name());
        data.put("score", overallScore);
        data.put("confidence", confidence);
        data.put("passScore", passScore);
        data.put("passed", passed);
        data.put("imageUrl", imageUrl);
        data.put("rewardPoints", passed ? challenge.getRewardPoints() : 0);
        data.put("analysis", result); // corrections, key_findings, risk_level, notes
        return new NotificationResponse(true,
                passed ? "Chúc mừng! Bạn đã vượt qua thử thách 🏆"
                       : "Chưa đạt ngưỡng. Xem góp ý và thử lại nhé!",
                data);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────
    private double readThreshold(String aiRulesJson, String key, double fallback) {
        if (aiRulesJson == null || aiRulesJson.isBlank()) return fallback;
        try {
            Map<?, ?> rules = objectMapper.readValue(aiRulesJson, Map.class);
            Object v = rules.get(key);
            if (v instanceof Number n) return n.doubleValue();
            if (v instanceof String s && !s.isBlank()) return Double.parseDouble(s.trim());
        } catch (Exception ignored) {
        }
        return fallback;
    }

    private String safeJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return null;
        }
    }

    private int toInt(Object v) {
        if (v instanceof Number n) return n.intValue();
        if (v instanceof String s && !s.isBlank()) {
            try { return (int) Math.round(Double.parseDouble(s.trim())); } catch (NumberFormatException ignored) {}
        }
        return 0;
    }

    private double toDouble(Object v) {
        if (v instanceof Number n) return n.doubleValue();
        if (v instanceof String s && !s.isBlank()) {
            try { return Double.parseDouble(s.trim()); } catch (NumberFormatException ignored) {}
        }
        return 0.0;
    }

    private int clamp(int v, int lo, int hi) {
        return Math.max(lo, Math.min(hi, v));
    }
}
