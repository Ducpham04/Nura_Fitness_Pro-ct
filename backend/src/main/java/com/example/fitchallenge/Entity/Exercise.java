package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "exercises")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Exercise {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "exercise_id")
    private Long id;

    @Column(name = "exercise_name", length = 200)
    private String exerciseName;

    /** Tên tiếng Việt của bài tập. */
    @Column(name = "exercise_name_vi", length = 200)
    private String exerciseNameVi;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "difficulty_level", length = 30)
    private DifficultyLevel difficultyLevel;

    public enum DifficultyLevel {
        EASY, MEDIUM, HARD
    }

    @Column(name = "video_url", columnDefinition = "TEXT")
    private String videoUrl;

    @Column(name = "exercise_type", length = 80)
    private String exerciseType;

    @Column(name = "movement_pattern", length = 80)
    private String movementPattern;

    @Column(name = "primary_muscle", length = 100)
    private String primaryMuscle;

    @Column(name = "secondary_muscles", columnDefinition = "TEXT")
    private String secondaryMuscles;

    @Column(name = "required_equipment", length = 80)
    private String requiredEquipment = "BODYWEIGHT";

    @Column(name = "equipment_alternatives", columnDefinition = "TEXT")
    private String equipmentAlternatives;

    @Column(name = "contraindicated_injuries", columnDefinition = "TEXT")
    private String contraindicatedInjuries;

    @Column(name = "spinal_loading")
    private Boolean spinalLoading = false;

    @Column(name = "knee_dominant")
    private Boolean kneeDominant = false;

    @Column(name = "shoulder_overhead")
    private Boolean shoulderOverhead = false;

    @Column(name = "high_impact")
    private Boolean highImpact = false;

    @Column(name = "wrist_loading")
    private Boolean wristLoading = false;

    @Column(name = "default_sets")
    private Integer defaultSets = 3;

    @Column(name = "default_reps")
    private Integer defaultReps = 10;

    @Column(name = "default_rest_seconds")
    private Integer defaultRestSeconds = 60;

    @Column(name = "estimated_met")
    private Integer estimatedMet;

    /**
     * MET (Metabolic Equivalent of Task) from Compendium 2024.
     * Used by GoalMapper.calcCaloriesPerSession() for accurate calorie calculation.
     * Formula: calories = met_value * weight_kg * duration_minutes / 60
     */
    /**
     * MET (Metabolic Equivalent of Task) from Compendium 2024.
     * Used by GoalMapper.calcCaloriesPerSession() for accurate calorie calculation.
     * Formula: calories = met_value * weight_kg * duration_minutes / 60
     */
    @Column(name = "met_value", precision = 4, scale = 1)
    private java.math.BigDecimal metValue;

    /**
     * Movement force direction for push/pull balance enforcement.
     * Values: PUSH | PULL | LEGS | CORE | CARDIO | MOBILITY
     */
    @Column(name = "force_type", length = 20)
    private String forceType;

    /**
     * Exercise complexity category.
     * Values: COMPOUND | ISOLATION | MOBILITY
     * Used for compound-first ordering in GAIN_MUSCLE plans.
     */
    @Column(name = "exercise_category", length = 30)
    private String exerciseCategory;

    // ─── Phase 2 Fields ────────────────────────────────────────────────────

    /**
     * Harder progression variant (e.g. Push Up → Diamond Push Up).
     * AI can suggest this when user completes sessions consistently at RPE < rpe_min.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "progression_exercise_id")
    private Exercise progressionExercise;

    /**
     * Easier regression variant (e.g. Push Up → Knee Push Up).
     * AI can suggest this when user reports RPE > rpe_max.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "regression_exercise_id")
    private Exercise regressionExercise;

    /** Minimum Rate of Perceived Exertion (1-10 scale) for this exercise. */
    @Column(name = "rpe_min")
    private Short rpeMin;

    /** Maximum Rate of Perceived Exertion (1-10 scale) for this exercise. */
    @Column(name = "rpe_max")
    private Short rpeMax;

    /**
     * Tempo in "eccentric-pause-concentric" format, e.g. "3-0-1".
     * Used by AI to estimate time-under-tension and adjust volume.
     */
    @Column(name = "tempo", length = 15)
    private String tempo;

    /** Safe for users aged 55+ (no high-impact, no heavy spinal loading). */
    @Column(name = "suitable_for_senior")
    private Boolean suitableForSenior = false;

    /** Safe for users with BMI > 30 (no jumping, low joint stress). */
    @Column(name = "suitable_for_overweight")
    private Boolean suitableForOverweight = false;

    /** True = both limbs move together (bilateral). False = unilateral (e.g. lunge). */
    @Column(name = "is_bilateral")
    private Boolean isBilateral = true;

    // ─── Phase 3 Fields ────────────────────────────────────────────────────
    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "status", length = 20)
    private String status = "ACTIVE";

    // ── Getters/Setters cho các field mới (chưa có trong Lombok) ──────────
    public String getExerciseNameVi() { return exerciseNameVi; }
    public void setExerciseNameVi(String v) { this.exerciseNameVi = v; }
    public String getForceType() { return forceType; }
    public void setForceType(String v) { this.forceType = v; }
    public String getExerciseCategory() { return exerciseCategory; }
    public void setExerciseCategory(String v) { this.exerciseCategory = v; }
}

