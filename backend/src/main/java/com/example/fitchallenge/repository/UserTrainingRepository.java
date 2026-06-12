package com.example.fitchallenge.repository;

import com.example.fitchallenge.DTO.UserTrainingDTO.UserRequestDTO;
import com.example.fitchallenge.Entity.UserTraining;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public interface UserTrainingRepository extends JpaRepository<UserTraining, Long> {
    List<UserTraining> findUserTrainingDetailsByUserId(Long userId);

    void save(UserRequestDTO userRequestDTO);

    boolean existsByUser_IdAndTrainingPlan_TpId(Long userID, Long trainingID);
    
    /**
     * Lấy danh sách users đang theo training plan
     */
    List<UserTraining> findByTrainingPlan_TpId(Long trainingPlanId);

    Optional<UserTraining> findTopByUser_IdAndStatusOrderByUtIdDesc(Long userId, String status);

    @org.springframework.data.jpa.repository.Query("""
            SELECT ut FROM UserTraining ut
            WHERE ut.status = 'active'
              AND ut.programId IS NOT NULL
              AND ut.weekNumber < ut.totalWeeks
            """)
    List<UserTraining> findActiveProgramsWithWeeksRemaining();

    // Ownership check: utId có thuộc userId không?
    boolean existsByUtIdAndUser_Id(Long utId, Long userId);

    // Dashboard: lọc trainings theo period — tránh findAll() toàn bảng
    List<UserTraining> findByStartDateAfter(LocalDate since);

    // Dashboard: đếm theo status
    long countByStatusIgnoreCase(String status);
}
