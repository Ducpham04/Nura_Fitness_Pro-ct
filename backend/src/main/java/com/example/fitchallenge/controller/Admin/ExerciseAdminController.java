package com.example.fitchallenge.controller.Admin;

import com.example.fitchallenge.Entity.Exercise;
import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.repository.ExerciseRepository;
import com.example.fitchallenge.service.ExerciseMetadataAuditService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/admin/exercises")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExerciseAdminController {

    private final ExerciseRepository exerciseRepository;
    private final ExerciseMetadataAuditService exerciseMetadataAuditService;

    // ── GET all ──────────────────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<NotificationResponse> getAll() {
        List<ExerciseDTO> dtos = exerciseRepository.findAll()
                .stream()
                .map(this::toDto)
                .toList();
        return ResponseEntity.ok(new NotificationResponse(true, "Exercises retrieved", dtos));
    }

    // ── GET metadata audit ────────────────────────────────────────────────
    @GetMapping("/audit")
    public ResponseEntity<NotificationResponse> auditMetadata() {
        return ResponseEntity.ok(new NotificationResponse(
                true,
                "Exercise metadata audit completed",
                exerciseMetadataAuditService.audit()
        ));
    }

    // ── GET by id ─────────────────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<NotificationResponse> getById(@PathVariable Long id) {
        return exerciseRepository.findById(id)
                .map(e -> ResponseEntity.ok(new NotificationResponse(true, "Exercise found", toDto(e))))
                .orElseGet(() -> ResponseEntity.status(404)
                        .body(new NotificationResponse(false, "Exercise not found")));
    }

    // ── POST create ───────────────────────────────────────────────────────
    @PostMapping
    @Transactional
    public ResponseEntity<NotificationResponse> create(@Valid @RequestBody ExerciseRequest req) {
        Exercise e = new Exercise();
        applyRequest(e, req);
        Exercise saved = exerciseRepository.save(e);
        return ResponseEntity.ok(new NotificationResponse(true, "Exercise created", toDto(saved)));
    }

    // ── PUT update ────────────────────────────────────────────────────────
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<NotificationResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ExerciseRequest req) {
        Exercise e = exerciseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Exercise not found"));
        applyRequest(e, req);
        Exercise saved = exerciseRepository.save(e);
        return ResponseEntity.ok(new NotificationResponse(true, "Exercise updated", toDto(saved)));
    }

    // ── DELETE ────────────────────────────────────────────────────────────
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<NotificationResponse> delete(@PathVariable Long id) {
        if (!exerciseRepository.existsById(id)) {
            return ResponseEntity.status(404)
                    .body(new NotificationResponse(false, "Exercise not found"));
        }
        exerciseRepository.deleteById(id);
        return ResponseEntity.ok(new NotificationResponse(true, "Exercise deleted"));
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    private void applyRequest(Exercise e, ExerciseRequest req) {
        if (req.getExerciseName()     != null) e.setExerciseName(req.getExerciseName());
        if (req.getExerciseNameVi()   != null) e.setExerciseNameVi(req.getExerciseNameVi());
        if (req.getDescription()      != null) e.setDescription(req.getDescription());
        if (req.getDifficultyLevel()  != null)
            e.setDifficultyLevel(Exercise.DifficultyLevel.valueOf(req.getDifficultyLevel()));
        if (req.getExerciseType()     != null) e.setExerciseType(req.getExerciseType());
        if (req.getPrimaryMuscle()    != null) e.setPrimaryMuscle(req.getPrimaryMuscle());
        if (req.getSecondaryMuscles() != null) e.setSecondaryMuscles(req.getSecondaryMuscles());
        if (req.getRequiredEquipment()!= null) e.setRequiredEquipment(req.getRequiredEquipment());
        if (req.getEquipmentAlternatives()!= null) e.setEquipmentAlternatives(req.getEquipmentAlternatives());
        if (req.getContraindicatedInjuries()!= null) e.setContraindicatedInjuries(req.getContraindicatedInjuries());
        if (req.getMovementPattern()  != null) e.setMovementPattern(req.getMovementPattern());
        if (req.getForceType()        != null) e.setForceType(req.getForceType());
        if (req.getExerciseCategory() != null) e.setExerciseCategory(req.getExerciseCategory());
        if (req.getVideoUrl()         != null) e.setVideoUrl(req.getVideoUrl());
        if (req.getImageUrl()         != null) e.setImageUrl(req.getImageUrl());
        if (req.getDefaultSets()      != null) e.setDefaultSets(req.getDefaultSets());
        if (req.getDefaultReps()      != null) e.setDefaultReps(req.getDefaultReps());
        if (req.getDefaultRestSeconds()!= null) e.setDefaultRestSeconds(req.getDefaultRestSeconds());
        if (req.getEstimatedMet()     != null) e.setEstimatedMet(req.getEstimatedMet());
        if (req.getMetValue()         != null) e.setMetValue(req.getMetValue());
        if (req.getTempo()            != null) e.setTempo(req.getTempo());
        if (req.getRpeMin()           != null) e.setRpeMin(req.getRpeMin().shortValue());
        if (req.getRpeMax()           != null) e.setRpeMax(req.getRpeMax().shortValue());
        if (req.getStatus()           != null) e.setStatus(req.getStatus());
        if (req.getSpinalLoading()    != null) e.setSpinalLoading(req.getSpinalLoading());
        if (req.getKneeDominant()     != null) e.setKneeDominant(req.getKneeDominant());
        if (req.getShoulderOverhead() != null) e.setShoulderOverhead(req.getShoulderOverhead());
        if (req.getHighImpact()       != null) e.setHighImpact(req.getHighImpact());
        if (req.getWristLoading()     != null) e.setWristLoading(req.getWristLoading());
        if (req.getSuitableForSenior()!= null) e.setSuitableForSenior(req.getSuitableForSenior());
        if (req.getSuitableForOverweight() != null) e.setSuitableForOverweight(req.getSuitableForOverweight());
        if (req.getIsBilateral()      != null) e.setIsBilateral(req.getIsBilateral());
    }

    private ExerciseDTO toDto(Exercise e) {
        ExerciseDTO dto = new ExerciseDTO();
        dto.setId(e.getId());
        dto.setExerciseName(e.getExerciseName());
        dto.setExerciseNameVi(e.getExerciseNameVi());
        dto.setDescription(e.getDescription());
        dto.setDifficultyLevel(e.getDifficultyLevel() != null ? e.getDifficultyLevel().name() : null);
        dto.setExerciseType(e.getExerciseType());
        dto.setPrimaryMuscle(e.getPrimaryMuscle());
        dto.setSecondaryMuscles(e.getSecondaryMuscles());
        dto.setRequiredEquipment(e.getRequiredEquipment());
        dto.setEquipmentAlternatives(e.getEquipmentAlternatives());
        dto.setContraindicatedInjuries(e.getContraindicatedInjuries());
        dto.setMovementPattern(e.getMovementPattern());
        dto.setForceType(e.getForceType());
        dto.setExerciseCategory(e.getExerciseCategory());
        dto.setVideoUrl(e.getVideoUrl());
        dto.setImageUrl(e.getImageUrl());
        dto.setDefaultSets(e.getDefaultSets());
        dto.setDefaultReps(e.getDefaultReps());
        dto.setDefaultRestSeconds(e.getDefaultRestSeconds());
        dto.setEstimatedMet(e.getEstimatedMet());
        dto.setMetValue(e.getMetValue());
        dto.setTempo(e.getTempo());
        dto.setRpeMin(e.getRpeMin());
        dto.setRpeMax(e.getRpeMax());
        dto.setStatus(e.getStatus());
        dto.setSpinalLoading(e.getSpinalLoading());
        dto.setKneeDominant(e.getKneeDominant());
        dto.setShoulderOverhead(e.getShoulderOverhead());
        dto.setHighImpact(e.getHighImpact());
        dto.setWristLoading(e.getWristLoading());
        dto.setSuitableForSenior(e.getSuitableForSenior());
        dto.setSuitableForOverweight(e.getSuitableForOverweight());
        dto.setIsBilateral(e.getIsBilateral());
        return dto;
    }

    // ── Inner DTOs ────────────────────────────────────────────────────────
    @Data
    public static class ExerciseDTO {
        private Long id;
        private String exerciseName;
        private String exerciseNameVi;
        private String description;
        private String difficultyLevel;
        private String exerciseType;
        private String primaryMuscle;
        private String secondaryMuscles;
        private String requiredEquipment;
        private String equipmentAlternatives;
        private String contraindicatedInjuries;
        private String movementPattern;
        private String forceType;
        private String exerciseCategory;
        private String videoUrl;
        private String imageUrl;
        private Integer defaultSets;
        private Integer defaultReps;
        private Integer defaultRestSeconds;
        private Integer estimatedMet;
        private BigDecimal metValue;
        private String tempo;
        private Short rpeMin;
        private Short rpeMax;
        private String status;
        private Boolean spinalLoading;
        private Boolean kneeDominant;
        private Boolean shoulderOverhead;
        private Boolean highImpact;
        private Boolean wristLoading;
        private Boolean suitableForSenior;
        private Boolean suitableForOverweight;
        private Boolean isBilateral;
    }

    @Data
    public static class ExerciseRequest {
        private String exerciseName;
        private String exerciseNameVi;
        private String description;
        private String difficultyLevel;
        private String exerciseType;
        private String primaryMuscle;
        private String secondaryMuscles;
        private String requiredEquipment;
        private String equipmentAlternatives;
        private String contraindicatedInjuries;
        private String movementPattern;
        private String forceType;
        private String exerciseCategory;
        private String videoUrl;
        private String imageUrl;
        private Integer defaultSets;
        private Integer defaultReps;
        private Integer defaultRestSeconds;
        private Integer estimatedMet;
        private BigDecimal metValue;
        private String tempo;
        private Integer rpeMin;
        private Integer rpeMax;
        private String status;
        private Boolean spinalLoading;
        private Boolean kneeDominant;
        private Boolean shoulderOverhead;
        private Boolean highImpact;
        private Boolean wristLoading;
        private Boolean suitableForSenior;
        private Boolean suitableForOverweight;
        private Boolean isBilateral;
    }
}
