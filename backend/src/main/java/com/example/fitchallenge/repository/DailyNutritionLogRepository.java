package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.DailyNutritionLog;
import com.example.fitchallenge.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface DailyNutritionLogRepository extends JpaRepository<DailyNutritionLog, Long> {
    List<DailyNutritionLog> findByUserAndTrackingDate(User user, LocalDate trackingDate);
    List<DailyNutritionLog> findByUser_IdAndTrackingDateBetween(Long userId, LocalDate startDate, LocalDate endDate);
}
