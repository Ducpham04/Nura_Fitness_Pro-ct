package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.BudgetTracking;
import com.example.fitchallenge.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Repository: BudgetTracking
 * 👉 Chức năng: Theo dõi ngân sách thực tế vs ngân sách AI ước tính
 * 💡 Đối soát chi phí để đánh giá độ chính xác của AI
 */
@Repository
public interface BudgetTrackingRepository extends JpaRepository<BudgetTracking, Long> {

    /**
     * 🔍 Lấy budget tracking của một ngày cụ thể
     */
    @Query("SELECT bt FROM BudgetTracking bt WHERE bt.user = :user AND bt.trackingDate = :date")
    Optional<BudgetTracking> findByUserAndDate(@Param("user") User user, @Param("date") LocalDate date);

    /**
     * 🔍 Lấy budget tracking trong khoảng thời gian
     */
    @Query("SELECT bt FROM BudgetTracking bt WHERE bt.user = :user AND bt.trackingDate BETWEEN :startDate AND :endDate ORDER BY bt.trackingDate")
    List<BudgetTracking> findByUserAndDateRange(@Param("user") User user, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    /**
     * 🔍 Lấy budget tracking của một tuần
     */
    @Query("SELECT bt FROM BudgetTracking bt WHERE bt.user = :user AND bt.weekStartDate = :weekStartDate ORDER BY bt.trackingDate")
    List<BudgetTracking> findByUserAndWeek(@Param("user") User user, @Param("weekStartDate") LocalDate weekStartDate);

    /**
     * 📊 Tính tổng chi tiêu thực tế của user trong khoảng thời gian
     */
    @Query("SELECT SUM(bt.actualSpent) FROM BudgetTracking bt WHERE bt.user = :user AND bt.trackingDate BETWEEN :startDate AND :endDate")
    Long sumActualSpentByUserAndDateRange(@Param("user") User user, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    /**
     * 📊 Tính tổng variance trong khoảng thời gian
     */
    @Query("SELECT SUM(bt.variance) FROM BudgetTracking bt WHERE bt.user = :user AND bt.trackingDate BETWEEN :startDate AND :endDate")
    Long sumVarianceByUserAndDateRange(@Param("user") User user, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    /**
     * 📊 Kiểm tra AI có tuân thủ budget không (trong khoảng thời gian)
     */
    @Query("SELECT COUNT(bt) FROM BudgetTracking bt WHERE bt.user = :user AND bt.trackingDate BETWEEN :startDate AND :endDate AND bt.aiStayedWithinBudget = true")
    Long countAiComplianceDays(@Param("user") User user, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    /**
     * 📊 Tổng số ngày tracking trong khoảng thời gian
     */
    @Query("SELECT COUNT(bt) FROM BudgetTracking bt WHERE bt.user = :user AND bt.trackingDate BETWEEN :startDate AND :endDate")
    Long countTrackingDays(@Param("user") User user, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    /**
     * 📊 Tính tỷ lệ AI compliance (%)
     */
    default Double calculateAiComplianceRate(User user, LocalDate startDate, LocalDate endDate) {
        Long totalDays = countTrackingDays(user, startDate, endDate);
        if (totalDays == 0) return 0.0;
        Long compliantDays = countAiComplianceDays(user, startDate, endDate);
        return (compliantDays * 100.0) / totalDays;
    }

    /**
     * 🔍 Lấy những ngày vượt budget (variance > 0)
     */
    @Query("SELECT bt FROM BudgetTracking bt WHERE bt.user = :user AND bt.variance > 0 AND bt.trackingDate BETWEEN :startDate AND :endDate ORDER BY bt.variance DESC")
    List<BudgetTracking> findOverBudgetDays(@Param("user") User user, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    /**
     * 🔍 Lấy những ngày tiết kiệm budget (variance < 0)
     */
    @Query("SELECT bt FROM BudgetTracking bt WHERE bt.user = :user AND bt.variance < 0 AND bt.trackingDate BETWEEN :startDate AND :endDate ORDER BY bt.variance ASC")
    List<BudgetTracking> findUnderBudgetDays(@Param("user") User user, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    /**
     * 📊 Trung bình chi tiêu hàng ngày
     */
    @Query("SELECT AVG(bt.actualSpent) FROM BudgetTracking bt WHERE bt.user = :user AND bt.trackingDate BETWEEN :startDate AND :endDate")
    Double calculateAverageDailySpent(@Param("user") User user, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    /**
     * 🔍 Kiểm tra đã có tracking cho ngày này chưa
     */
    @Query("SELECT CASE WHEN COUNT(bt) > 0 THEN true ELSE false END FROM BudgetTracking bt WHERE bt.user = :user AND bt.trackingDate = :date")
    boolean existsByUserAndDate(@Param("user") User user, @Param("date") LocalDate date);
}
