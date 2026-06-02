package com.example.fitchallenge.controller.Admin;

import com.example.fitchallenge.Entity.UserChallenge;
import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.repository.UserChallengeRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChallengeSubmissionController {

    private final UserChallengeRepository userChallengeRepository;

    @GetMapping("/challenges/submissions")
    public ResponseEntity<NotificationResponse> getAllSubmissions(
            @RequestParam(required = false) Long challengeId,
            @RequestParam(required = false) String status) {

        List<UserChallenge> list;
        if (challengeId != null) {
            list = status != null
                    ? userChallengeRepository.findByChallenge_IdAndStatus(challengeId, status)
                    : userChallengeRepository.findByChallenge_Id(challengeId);
        } else {
            list = userChallengeRepository.findAllWithUserAndChallenge();
        }
        return ResponseEntity.ok(new NotificationResponse(true, "Submissions retrieved", toDto(list)));
    }

    @GetMapping("/challenges/{id}/submissions")
    public ResponseEntity<NotificationResponse> getChallengeSubmissions(
            @PathVariable Long id,
            @RequestParam(required = false) String status) {

        List<UserChallenge> list = status != null
                ? userChallengeRepository.findByChallenge_IdAndStatus(id, status)
                : userChallengeRepository.findByChallenge_Id(id);
        return ResponseEntity.ok(new NotificationResponse(true, "Challenge submissions retrieved", toDto(list)));
    }

    // ── DTO mapping (inside transaction — lazy fields accessible) ──────────
    private List<SubmissionDTO> toDto(List<UserChallenge> list) {
        return list.stream().map(uc -> {
            SubmissionDTO dto = new SubmissionDTO();
            dto.setUcId(uc.getUcId());
            dto.setStatus(uc.getStatus() != null ? uc.getStatus().name() : null);
            dto.setScore(uc.getScore());
            dto.setConfidence(uc.getConfidence());
            dto.setVideoUrl(uc.getVideoUrl());
            dto.setSubmittedAt(uc.getSubmittedAt() != null ? uc.getSubmittedAt().toString() : null);
            dto.setCompletedAt(uc.getCompletedAt() != null ? uc.getCompletedAt().toString() : null);
            if (uc.getUser() != null) {
                dto.setUserId(uc.getUser().getId());
                dto.setUserEmail(uc.getUser().getEmail());
                dto.setUserFullName(uc.getUser().getFullName());
            }
            if (uc.getChallenge() != null) {
                dto.setChallengeId(uc.getChallenge().getId());
                dto.setChallengeTitle(uc.getChallenge().getTitle());
            }
            return dto;
        }).toList();
    }

    @Data
    public static class SubmissionDTO {
        private Long ucId;
        private Long userId;
        private String userEmail;
        private String userFullName;
        private Long challengeId;
        private String challengeTitle;
        private String status;
        private Integer score;
        private Double confidence;
        private String videoUrl;
        private String submittedAt;
        private String completedAt;
    }
}
