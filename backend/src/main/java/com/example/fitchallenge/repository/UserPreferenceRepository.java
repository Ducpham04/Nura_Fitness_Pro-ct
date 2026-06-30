package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.UserPreference;
import com.example.fitchallenge.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository: UserPreference
 * 👉 Chức năng: Lưu preferences và feedback của user cho AI cải thiện plan sau
 * 💡 Đồng bộ với AI Service preference_store.py
 */
@Repository
public interface UserPreferenceRepository extends JpaRepository<UserPreference, Long> {

    /** Gỡ link food (food_id nullable) khi admin xoá food. */
    @Modifying
    @Query("UPDATE UserPreference up SET up.food = null WHERE up.food.foodId = :foodId")
    void unlinkFood(@Param("foodId") Long foodId);

    /**
     * 🔍 Lấy tất cả preferences của user còn active
     */
    @Query("SELECT up FROM UserPreference up WHERE up.user = :user AND up.isActive = true AND (up.expiresAt IS NULL OR up.expiresAt > CURRENT_TIMESTAMP) ORDER BY up.priority DESC, up.occurrenceCount DESC")
    List<UserPreference> findAllActiveByUser(@Param("user") User user);

    /**
     * 🔍 Lấy preferences theo loại
     */
    @Query("SELECT up FROM UserPreference up WHERE up.user = :user AND up.preferenceType = :type AND up.isActive = true ORDER BY up.occurrenceCount DESC")
    List<UserPreference> findByUserAndType(@Param("user") User user, @Param("type") UserPreference.PreferenceType type);

    /**
     * 🔍 Tìm preference cụ thể (ví dụ: DISLIKED_FOOD - "Cá")
     */
    @Query("SELECT up FROM UserPreference up WHERE up.user = :user AND up.preferenceType = :type AND up.itemName = :itemName AND up.isActive = true")
    Optional<UserPreference> findSpecificPreference(@Param("user") User user, @Param("type") UserPreference.PreferenceType type, @Param("itemName") String itemName);

    /**
     * 🔍 Lấy danh sách thực phẩm không thích (để AI tránh)
     */
    @Query("SELECT up.itemName FROM UserPreference up WHERE up.user = :user AND up.preferenceType = 'DISLIKED_FOOD' AND up.isActive = true ORDER BY up.occurrenceCount DESC")
    List<String> findDislikedFoods(@Param("user") User user);

    /**
     * 🔍 Lấy danh sách bài tập hay bị skip (để AI điều chỉnh)
     */
    @Query("SELECT up FROM UserPreference up WHERE up.user = :user AND up.preferenceType = 'SKIPPED_EXERCISE' AND up.isActive = true ORDER BY up.occurrenceCount DESC")
    List<UserPreference> findSkippedExercises(@Param("user") User user);

    /**
     * 🔍 Lấy cooking equipment của user
     */
    @Query("SELECT up FROM UserPreference up WHERE up.user = :user AND up.preferenceType = 'COOKING_EQUIPMENT' AND up.isActive = true")
    Optional<UserPreference> findCookingEquipment(@Param("user") User user);

    /**
     * 🔍 Lấy meal prep time preference
     */
    @Query("SELECT up FROM UserPreference up WHERE up.user = :user AND up.preferenceType = 'MEAL_PREP_TIME' AND up.isActive = true")
    Optional<UserPreference> findMealPrepTime(@Param("user") User user);

    /**
     * 📊 Đếm số lần xuất hiện của một preference (tần suất)
     */
    @Query("SELECT SUM(up.occurrenceCount) FROM UserPreference up WHERE up.user = :user AND up.preferenceType = :type AND up.isActive = true")
    Long sumOccurrencesByType(@Param("user") User user, @Param("type") UserPreference.PreferenceType type);

    /**
     * 📊 Top N thực phẩm được thích (LIKED_FOOD)
     */
    @Query("SELECT up FROM UserPreference up WHERE up.user = :user AND up.preferenceType = 'LIKED_FOOD' AND up.isActive = true ORDER BY up.occurrenceCount DESC")
    List<UserPreference> findTopLikedFoods(@Param("user") User user);

    /**
     * 🔄 Tăng occurrence count
     */
    @Modifying
    @Query("UPDATE UserPreference up SET up.occurrenceCount = up.occurrenceCount + 1, up.updatedAt = CURRENT_TIMESTAMP WHERE up.upId = :id")
    void incrementOccurrence(@Param("id") Long id);

    /**
     * 🔄 Deactivate preference (thay vì xóa - giữ lịch sử)
     */
    @Modifying
    @Query("UPDATE UserPreference up SET up.isActive = false, up.updatedAt = CURRENT_TIMESTAMP WHERE up.upId = :id")
    void deactivate(@Param("id") Long id);

    /**
     * 🗑️ Xóa preferences hết hạn
     */
    @Modifying
    @Query("DELETE FROM UserPreference up WHERE up.expiresAt < :now AND up.isActive = true")
    void deleteExpiredPreferences(@Param("now") ZonedDateTime now);

    /**
     * 🔍 Kiểm tra đã tồn tại preference này chưa
     */
    @Query("SELECT CASE WHEN COUNT(up) > 0 THEN true ELSE false END FROM UserPreference up WHERE up.user = :user AND up.preferenceType = :type AND up.itemName = :itemName AND up.isActive = true")
    boolean exists(@Param("user") User user, @Param("type") UserPreference.PreferenceType type, @Param("itemName") String itemName);

    /**
     * 🔍 Tìm preferences theo priority cao (>= X)
     */
    @Query("SELECT up FROM UserPreference up WHERE up.user = :user AND up.priority >= :minPriority AND up.isActive = true ORDER BY up.priority DESC")
    List<UserPreference> findHighPriorityPreferences(@Param("user") User user, @Param("minPriority") Integer minPriority);

    /**
     * 📊 Tổng hợp preferences cho AI prompt
     * Trả về dạng: type -> list of items
     */
    @Query("SELECT up.preferenceType, up.itemName, up.preferenceValue, up.occurrenceCount FROM UserPreference up WHERE up.user = :user AND up.isActive = true ORDER BY up.preferenceType, up.occurrenceCount DESC")
    List<Object[]> findAllForAiPrompt(@Param("user") User user);
}
