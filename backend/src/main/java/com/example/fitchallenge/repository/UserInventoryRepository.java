package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.UserInventory;
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
 * Repository: UserInventory
 * 👉 Chức năng: Quản lý tủ lạnh cá nhân - thực phẩm user có sẵn
 * 💡 Dùng cho AI Meal Planner để tối ưu chi phí và suggest dùng ingredients có sẵn
 */
@Repository
public interface UserInventoryRepository extends JpaRepository<UserInventory, Long> {

    /**
     * 🔍 Lấy tất cả items trong tủ lạnh của user (chưa xóa)
     */
    @Query("SELECT ui FROM UserInventory ui LEFT JOIN FETCH ui.food WHERE ui.user = :user AND ui.isDeleted = false ORDER BY ui.expiryDate ASC")
    List<UserInventory> findAllByUser(@Param("user") User user);

    /**
     * 🔍 Lấy items theo status (AVAILABLE, EXPIRED, CONSUMED, RESERVED)
     */
    @Query("SELECT ui FROM UserInventory ui LEFT JOIN FETCH ui.food WHERE ui.user = :user AND ui.status = :status AND ui.isDeleted = false")
    List<UserInventory> findByUserAndStatus(@Param("user") User user, @Param("status") UserInventory.InventoryStatus status);

    /**
     * 🔍 Tìm item theo ID và user (security check)
     */
    @Query("SELECT ui FROM UserInventory ui LEFT JOIN FETCH ui.food WHERE ui.inventoryId = :id AND ui.user = :user AND ui.isDeleted = false")
    Optional<UserInventory> findByIdAndUser(@Param("id") Long id, @Param("user") User user);

    @Query("SELECT ui FROM UserInventory ui LEFT JOIN FETCH ui.food WHERE ui.inventoryId = :id")
    Optional<UserInventory> findByIdWithFood(@Param("id") Long id);

    /**
     * 🔍 Lấy items sắp hết hạn (trong vòng X ngày)
     */
    @Query("SELECT ui FROM UserInventory ui LEFT JOIN FETCH ui.food WHERE ui.user = :user AND ui.expiryDate <= :expiryThreshold AND ui.status = 'AVAILABLE' AND ui.isDeleted = false")
    List<UserInventory> findExpiringItems(@Param("user") User user, @Param("expiryThreshold") LocalDate expiryThreshold);

    /**
     * 🔍 Lấy items đã được AI suggest dùng trong plan
     */
    @Query("SELECT ui FROM UserInventory ui LEFT JOIN FETCH ui.food WHERE ui.user = :user AND ui.usedInPlan = true AND ui.isDeleted = false")
    List<UserInventory> findUsedInPlanItems(@Param("user") User user);

    /**
     * 📊 Count items theo status
     */
    @Query("SELECT COUNT(ui) FROM UserInventory ui WHERE ui.user = :user AND ui.status = :status AND ui.isDeleted = false")
    Long countByUserAndStatus(@Param("user") User user, @Param("status") UserInventory.InventoryStatus status);

    /**
     * 🗑️ Soft delete item
     */
    @Modifying
    @Query("UPDATE UserInventory ui SET ui.isDeleted = true, ui.deletedAt = CURRENT_TIMESTAMP WHERE ui.inventoryId = :id")
    void softDeleteById(@Param("id") Long id);

    /**
     * 🧹 Replace-mode cleanup: hide all current inventory rows before importing a new snapshot.
     */
    @Modifying
    @Query("UPDATE UserInventory ui SET ui.isDeleted = true, ui.deletedAt = CURRENT_TIMESTAMP WHERE ui.user = :user AND ui.isDeleted = false")
    int softDeleteActiveByUser(@Param("user") User user);

    /**
     * 🧹 Hide inventory rows that were fully consumed by a generated meal plan.
     */
    @Modifying
    @Query("UPDATE UserInventory ui SET ui.isDeleted = true, ui.deletedAt = CURRENT_TIMESTAMP WHERE ui.user = :user AND ui.usedInPlan = true AND ui.status = 'RESERVED' AND ui.isDeleted = false")
    int softDeleteUsedUpByUser(@Param("user") User user);

    /**
     * 🔄 Restore soft deleted item
     */
    @Modifying
    @Query("UPDATE UserInventory ui SET ui.isDeleted = false, ui.deletedAt = null WHERE ui.inventoryId = :id")
    void restoreById(@Param("id") Long id);

    /**
     * 🔍 Tìm items theo food_id (nếu có link với Food entity)
     */
    @Query("SELECT ui FROM UserInventory ui WHERE ui.user = :user AND ui.food.foodId = :foodId AND ui.isDeleted = false")
    List<UserInventory> findByUserAndFoodId(@Param("user") User user, @Param("foodId") Long foodId);

    /**
     * 🔍 Tìm items theo tên thực phẩm (like search)
     */
    @Query("SELECT ui FROM UserInventory ui LEFT JOIN FETCH ui.food WHERE ui.user = :user AND ui.isDeleted = false AND (ui.foodName LIKE %:keyword% OR ui.food.name LIKE %:keyword%)")
    List<UserInventory> searchByFoodName(@Param("user") User user, @Param("keyword") String keyword);

    /**
     * 🔍 Lấy tất cả items chưa bị xóa của user
     */
    @Query("SELECT ui FROM UserInventory ui LEFT JOIN FETCH ui.food WHERE ui.user = :user AND ui.isDeleted = false")
    List<UserInventory> findByUserAndIsDeletedFalse(@Param("user") User user);

    /**
     * 🔍 Lấy items theo status và chưa bị xóa
     */
    @Query("SELECT ui FROM UserInventory ui LEFT JOIN FETCH ui.food WHERE ui.user = :user AND ui.status = :status AND ui.isDeleted = false")
    List<UserInventory> findByUserAndStatusAndIsDeletedFalse(@Param("user") User user, @Param("status") UserInventory.InventoryStatus status);

    /**
     * 🔍 Lấy items có sẵn cho AI Meal Planner
     */
    @Query("SELECT ui FROM UserInventory ui LEFT JOIN FETCH ui.food WHERE ui.user = :user AND ui.status = 'AVAILABLE' AND ui.isDeleted = false ORDER BY ui.expiryDate ASC")
    List<UserInventory> findAvailableItemsForAI(@Param("user") User user);

    /**
     * 🔍 Tìm items theo tên (case-insensitive)
     */
    @Query("SELECT ui FROM UserInventory ui LEFT JOIN FETCH ui.food WHERE ui.user = :user AND ui.isDeleted = false AND (LOWER(ui.foodName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(ui.food.name) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    List<UserInventory> findByUserAndFoodNameContainingIgnoreCase(@Param("user") User user, @Param("keyword") String keyword);
}
