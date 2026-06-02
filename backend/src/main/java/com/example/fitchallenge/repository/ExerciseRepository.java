package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.Exercise;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExerciseRepository extends JpaRepository<Exercise, Long> {

    @Query("""
        SELECT e FROM Exercise e
        WHERE (e.status IS NULL OR UPPER(e.status) = 'ACTIVE')
          AND (
              :equipment IS NULL
              OR LOWER(COALESCE(e.requiredEquipment, 'BODYWEIGHT')) IN :equipment
          )
          AND (:excludeSpinal = false OR COALESCE(e.spinalLoading, false) = false)
          AND (:excludeKnee = false OR COALESCE(e.kneeDominant, false) = false)
          AND (:excludeShoulder = false OR COALESCE(e.shoulderOverhead, false) = false)
          AND (:excludeImpact = false OR COALESCE(e.highImpact, false) = false)
          AND (:excludeWrist = false OR COALESCE(e.wristLoading, false) = false)
        ORDER BY e.id ASC
    """)
    List<Exercise> findSafeExercises(
            @Param("equipment") List<String> equipment,
            @Param("excludeSpinal") boolean excludeSpinal,
            @Param("excludeKnee") boolean excludeKnee,
            @Param("excludeShoulder") boolean excludeShoulder,
            @Param("excludeImpact") boolean excludeImpact,
            @Param("excludeWrist") boolean excludeWrist
    );

    List<Exercise> findByExerciseTypeIgnoreCase(String exerciseType);

    /**
     * Tìm bài tập cùng nhóm cơ chính, loại trừ bài hiện tại.
     * Dùng cho tính năng "đổi bài tập thay thế".
     */
    @Query("""
        SELECT e FROM Exercise e
        WHERE LOWER(e.primaryMuscle) LIKE LOWER(CONCAT('%', :muscle, '%'))
          AND e.id != :excludeId
          AND (e.status IS NULL OR UPPER(e.status) = 'ACTIVE')
        ORDER BY e.id ASC
    """)
    List<Exercise> findAlternativesByMuscle(
            @Param("muscle") String muscle,
            @Param("excludeId") Long excludeId
    );

    /**
     * Tìm bài tập theo nhóm cơ, không loại trừ ID nào.
     * Dùng khi người dùng chọn nhóm cơ mong muốn.
     */
    @Query("""
        SELECT e FROM Exercise e
        WHERE LOWER(e.primaryMuscle) LIKE LOWER(CONCAT('%', :muscle, '%'))
          AND (e.status IS NULL OR UPPER(e.status) = 'ACTIVE')
        ORDER BY e.id ASC
    """)
    List<Exercise> findByMuscle(@Param("muscle") String muscle);
}
