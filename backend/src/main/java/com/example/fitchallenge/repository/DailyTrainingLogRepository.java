package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.DailyTrainingLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Repository;

@Repository
public interface DailyTrainingLogRepository extends JpaRepository<DailyTrainingLog, Long> {
    
    /**
     * Lấy tất cả daily training logs của một user
     */
    List<DailyTrainingLog> findByUser_Id(Long userId);
    
    /**
     * Lấy daily training logs của một user trong một training plan
     */
    List<DailyTrainingLog> findByUser_IdAndTrainingPlan_TpId(Long userId, Long trainingPlanId);
    
    /**
     * Lấy daily training logs của một user trong một training plan theo day number
     */
    List<DailyTrainingLog> findByUser_IdAndTrainingPlan_TpIdAndDayNumber(Long userId, Long trainingPlanId, Integer dayNumber);

    List<DailyTrainingLog> findByUser_IdAndTrainingPlan_TpIdAndDayNumberBetween(
        Long userId,
        Long trainingPlanId,
        Integer startDay,
        Integer endDay
    );

    void deleteByUser_IdAndTrainingPlan_TpIdAndDayNumberBetween(
        Long userId,
        Long trainingPlanId,
        Integer startDay,
        Integer endDay
    );
    
    /**
     * Lấy daily training log của một user cho một exercise cụ thể
     * Trả về List để xử lý trường hợp có duplicate records
     */
    List<DailyTrainingLog> findByUser_IdAndTrainingPlan_TpIdAndDayNumberAndExercise_Id(
        Long userId, 
        Long trainingPlanId, 
        Integer dayNumber, 
        Long exerciseId
    );
    
    /**
     * Lấy daily training logs theo status
     */
    List<DailyTrainingLog> findByUser_IdAndTrainingPlan_TpIdAndStatus(
        Long userId, 
        Long trainingPlanId, 
        String status
    );
    
    /**
     * Lấy daily training logs theo training date
     */
    List<DailyTrainingLog> findByUser_IdAndTrainingDate(Long userId, LocalDate trainingDate);
    
    /**
     * Đếm số daily training logs đã completed của một user trong một training plan
     */
    long countByUser_IdAndTrainingPlan_TpIdAndStatus(Long userId, Long trainingPlanId, String status);
}
