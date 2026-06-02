package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.PersonalizedMealDetail;
import com.example.fitchallenge.Entity.PersonalizedNutritionPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository: PersonalizedMealDetail
 * 👉 Chức năng: Quản lý chi tiết từng bữa ăn trong AI-generated meal plan
 * 💡 Lưu meal items dưới dạng JSON để linh hoạt với AI content
 */
@Repository
public interface PersonalizedMealDetailRepository extends JpaRepository<PersonalizedMealDetail, Long> {

    /**
     * 🔍 Lấy tất cả meal details của một plan
     */
    @Query("SELECT pmd FROM PersonalizedMealDetail pmd WHERE pmd.personalizedPlan = :plan ORDER BY pmd.dayNumber, pmd.mealType")
    List<PersonalizedMealDetail> findAllByPlan(@Param("plan") PersonalizedNutritionPlan plan);

    /** For API / serialization — loads meal rows + foods in one shot */
    @Query("SELECT DISTINCT pmd FROM PersonalizedMealDetail pmd LEFT JOIN FETCH pmd.dish LEFT JOIN FETCH pmd.mealItems mi LEFT JOIN FETCH mi.food WHERE pmd.personalizedPlan = :plan ORDER BY pmd.dayNumber, pmd.mealType, mi.pmiId")
    List<PersonalizedMealDetail> findAllByPlanWithItems(@Param("plan") PersonalizedNutritionPlan plan);

    /** Reload a single detail with its dish and all meal items eagerly fetched (used after swap). */
    @Query("SELECT DISTINCT pmd FROM PersonalizedMealDetail pmd LEFT JOIN FETCH pmd.dish LEFT JOIN FETCH pmd.mealItems mi LEFT JOIN FETCH mi.food WHERE pmd.pmdId = :id")
    Optional<PersonalizedMealDetail> findByIdWithItems(@Param("id") Long id);

    /**
     * 🔍 Lấy meal details của một ngày cụ thể
     */
    @Query("SELECT pmd FROM PersonalizedMealDetail pmd WHERE pmd.personalizedPlan = :plan AND pmd.dayNumber = :dayNumber ORDER BY pmd.mealType")
    List<PersonalizedMealDetail> findByPlanAndDay(@Param("plan") PersonalizedNutritionPlan plan, @Param("dayNumber") Integer dayNumber);

    @Query("SELECT DISTINCT pmd FROM PersonalizedMealDetail pmd LEFT JOIN FETCH pmd.dish LEFT JOIN FETCH pmd.mealItems mi LEFT JOIN FETCH mi.food WHERE pmd.personalizedPlan = :plan AND pmd.dayNumber = :dayNumber ORDER BY pmd.mealType, mi.pmiId")
    List<PersonalizedMealDetail> findByPlanAndDayWithItems(@Param("plan") PersonalizedNutritionPlan plan, @Param("dayNumber") Integer dayNumber);

    /**
     * 🔍 Lấy một bữa ăn cụ thể (ví dụ: Day 1, Breakfast)
     */
    @Query("SELECT pmd FROM PersonalizedMealDetail pmd WHERE pmd.personalizedPlan = :plan AND pmd.dayNumber = :dayNumber AND pmd.mealType = :mealType")
    Optional<PersonalizedMealDetail> findByPlanAndDayAndMealType(@Param("plan") PersonalizedNutritionPlan plan, @Param("dayNumber") Integer dayNumber, @Param("mealType") PersonalizedMealDetail.MealType mealType);

    /**
     * 🔍 Lấy tất cả meals theo loại (tất cả breakfast trong plan)
     */
    @Query("SELECT pmd FROM PersonalizedMealDetail pmd WHERE pmd.personalizedPlan = :plan AND pmd.mealType = :mealType ORDER BY pmd.dayNumber")
    List<PersonalizedMealDetail> findByPlanAndMealType(@Param("plan") PersonalizedNutritionPlan plan, @Param("mealType") PersonalizedMealDetail.MealType mealType);

    /**
     * 🔍 Tìm meals chưa được ăn (wasEaten = false hoặc null)
     */
    @Query("SELECT pmd FROM PersonalizedMealDetail pmd WHERE pmd.personalizedPlan = :plan AND (pmd.wasEaten = false OR pmd.wasEaten IS NULL)")
    List<PersonalizedMealDetail> findUneatenMeals(@Param("plan") PersonalizedNutritionPlan plan);

    /**
     * 🔍 Tìm meals có rating thấp (để AI điều chỉnh sau)
     */
    @Query("SELECT pmd FROM PersonalizedMealDetail pmd WHERE pmd.personalizedPlan.user.id = :userId AND pmd.userRating <= 2")
    List<PersonalizedMealDetail> findLowRatedMeals(@Param("userId") Long userId);

    /**
     * 🔍 Tìm meals được user đánh giá cao (rating 4-5)
     */
    @Query("SELECT pmd FROM PersonalizedMealDetail pmd WHERE pmd.personalizedPlan.user.id = :userId AND pmd.userRating >= 4")
    List<PersonalizedMealDetail> findHighRatedMeals(@Param("userId") Long userId);

    /**
     * 📊 Thống kê tổng nutrition của một ngày
     */
    @Query("SELECT SUM(pmd.totalCalories), SUM(pmd.totalProtein), SUM(pmd.totalCarbs), SUM(pmd.totalFat), SUM(pmd.estimatedCost) FROM PersonalizedMealDetail pmd WHERE pmd.personalizedPlan = :plan AND pmd.dayNumber = :dayNumber")
    List<Object[]> calculateDailyTotals(@Param("plan") PersonalizedNutritionPlan plan, @Param("dayNumber") Integer dayNumber);

    /**
     * 📊 Count meals theo loại
     */
    @Query("SELECT pmd.mealType, COUNT(pmd) FROM PersonalizedMealDetail pmd WHERE pmd.personalizedPlan = :plan GROUP BY pmd.mealType")
    List<Object[]> countByMealType(@Param("plan") PersonalizedNutritionPlan plan);

    /**
     * 🗑️ Xóa tất cả meals của một plan
     */
    @Modifying
    @Query("DELETE FROM PersonalizedMealDetail pmd WHERE pmd.personalizedPlan = :plan")
    void deleteAllByPlan(@Param("plan") PersonalizedNutritionPlan plan);

    /**
     * 🔄 Cập nhật trạng thái "đã ăn"
     */
    @Modifying
    @Query("UPDATE PersonalizedMealDetail pmd SET pmd.wasEaten = :eaten, pmd.userRating = :rating, pmd.userFeedback = :feedback WHERE pmd.pmdId = :id")
    void updateUserFeedback(@Param("id") Long id, @Param("eaten") Boolean eaten, @Param("rating") Integer rating, @Param("feedback") String feedback);

    /**
     * 🔍 Tìm meals có thời gian chuẩn bị nhanh (<= X phút)
     */
    @Query("SELECT pmd FROM PersonalizedMealDetail pmd WHERE pmd.personalizedPlan.user.id = :userId AND pmd.prepTimeMinutes <= :maxPrepTime")
    List<PersonalizedMealDetail> findQuickMeals(@Param("userId") Long userId, @Param("maxPrepTime") Integer maxPrepTime);
}
