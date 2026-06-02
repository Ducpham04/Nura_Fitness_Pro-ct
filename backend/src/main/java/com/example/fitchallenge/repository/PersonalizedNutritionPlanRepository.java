package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.PersonalizedNutritionPlan;
import com.example.fitchallenge.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Repository: PersonalizedNutritionPlan
 * 👉 Chức năng: Quản lý meal plans do AI tạo riêng cho từng user
 * 💡 Lưu trực tiếp plan cá nhân hóa từ Hybrid Smart Meal Plan
 */
@Repository
public interface PersonalizedNutritionPlanRepository extends JpaRepository<PersonalizedNutritionPlan, Long> {

    /**
     * 🔍 Lấy tất cả plans của user (chưa xóa), sắp xếp theo ngày tạo mới nhất
     */
    @Query("SELECT pnp FROM PersonalizedNutritionPlan pnp WHERE pnp.user = :user AND (pnp.isDeleted = false OR pnp.isDeleted IS NULL) ORDER BY pnp.createdAt DESC")
    List<PersonalizedNutritionPlan> findAllByUser(@Param("user") User user);

    /**
     * 🔍 Lấy plan đang active của user
     */
    @Query("SELECT pnp FROM PersonalizedNutritionPlan pnp WHERE pnp.user = :user AND pnp.status = 'ACTIVE' AND (pnp.isDeleted = false OR pnp.isDeleted IS NULL) AND pnp.pnpId = (SELECT MAX(p2.pnpId) FROM PersonalizedNutritionPlan p2 WHERE p2.user = :user AND p2.status = 'ACTIVE' AND (p2.isDeleted = false OR p2.isDeleted IS NULL))")
    Optional<PersonalizedNutritionPlan> findActivePlanByUser(@Param("user") User user);

    /**
     * 🔍 Lấy plan theo ID và user (security check)
     */
    @Query("SELECT pnp FROM PersonalizedNutritionPlan pnp WHERE pnp.pnpId = :id AND pnp.user.id = :userId AND (pnp.isDeleted = false OR pnp.isDeleted IS NULL)")
    Optional<PersonalizedNutritionPlan> findByIdAndUser(@Param("id") Long id, @Param("userId") Long userId);

    /**
     * 🔍 Lấy plan theo AI Plan ID
     */
    @Query("SELECT pnp FROM PersonalizedNutritionPlan pnp WHERE pnp.aiPlanId = :aiPlanId AND (pnp.isDeleted = false OR pnp.isDeleted IS NULL)")
    Optional<PersonalizedNutritionPlan> findByAiPlanId(@Param("aiPlanId") String aiPlanId);

    /**
     * 🔍 Lấy plans trong khoảng thời gian
     */
    @Query("SELECT pnp FROM PersonalizedNutritionPlan pnp WHERE pnp.user = :user AND pnp.startDate <= :endDate AND pnp.endDate >= :startDate AND (pnp.isDeleted = false OR pnp.isDeleted IS NULL)")
    List<PersonalizedNutritionPlan> findByUserAndDateRange(@Param("user") User user, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    /**
     * 🔍 Lấy plans theo status
     */
    @Query("SELECT pnp FROM PersonalizedNutritionPlan pnp WHERE pnp.user = :user AND pnp.status = :status AND (pnp.isDeleted = false OR pnp.isDeleted IS NULL) ORDER BY pnp.createdAt DESC")
    List<PersonalizedNutritionPlan> findByUserAndStatus(@Param("user") User user, @Param("status") PersonalizedNutritionPlan.PlanStatus status);

    /**
     * 📊 Tính tổng chi phí thực tế của user trong khoảng thời gian
     */
    @Query("SELECT SUM(pnp.actualTotalCost) FROM PersonalizedNutritionPlan pnp WHERE pnp.user = :user AND pnp.status = 'COMPLETED' AND (pnp.isDeleted = false OR pnp.isDeleted IS NULL) AND pnp.endDate BETWEEN :startDate AND :endDate")
    Long sumActualCostByUserAndDateRange(@Param("user") User user, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    /**
     * 📊 Kiểm tra AI có đang tuân thủ budget không
     */
    @Query("SELECT COUNT(pnp) FROM PersonalizedNutritionPlan pnp WHERE pnp.user = :user AND pnp.status = 'COMPLETED' AND (pnp.isDeleted = false OR pnp.isDeleted IS NULL) AND (pnp.estimatedTotalCost > (pnp.targetBudgetPerDay * pnp.durationDays))")
    Long countOverBudgetPlans(@Param("user") User user);

    /**
     * 🗑️ Soft delete plan
     */
    @Modifying
    @Query("UPDATE PersonalizedNutritionPlan pnp SET pnp.isDeleted = true, pnp.deletedAt = CURRENT_TIMESTAMP, pnp.status = 'ARCHIVED' WHERE pnp.pnpId = :id")
    void softDeleteById(@Param("id") Long id);

    /**
     * 🔄 Restore soft deleted plan
     */
    @Modifying
    @Query("UPDATE PersonalizedNutritionPlan pnp SET pnp.isDeleted = false, pnp.deletedAt = null WHERE pnp.pnpId = :id")
    void restoreById(@Param("id") Long id);

    /**
     * ✅ Mark plan as completed
     */
    @Modifying
    @Query("UPDATE PersonalizedNutritionPlan pnp SET pnp.status = 'COMPLETED' WHERE pnp.pnpId = :id")
    void markAsCompleted(@Param("id") Long id);

    /**
     * 🔄 Cập nhật actual total cost
     */
    @Modifying
    @Query("UPDATE PersonalizedNutritionPlan pnp SET pnp.actualTotalCost = :actualCost WHERE pnp.pnpId = :id")
    void updateActualCost(@Param("id") Long id, @Param("actualCost") Integer actualCost);
}
