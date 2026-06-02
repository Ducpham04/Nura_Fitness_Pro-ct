package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.PlanVersionHistory;
import com.example.fitchallenge.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository: PlanVersionHistory
 * 👉 Chức năng: Quản lý lịch sử version của plans để compare và revert
 * 💡 Đồng bộ với AI Service plan_versioning.py
 */
@Repository
public interface PlanVersionHistoryRepository extends JpaRepository<PlanVersionHistory, Long> {

    /**
     * 🔍 Lấy tất cả versions của một plan (chưa xóa)
     */
    @Query("SELECT pvh FROM PlanVersionHistory pvh WHERE pvh.user = :user AND pvh.planType = :planType AND pvh.planId = :planId AND pvh.isDeleted = false ORDER BY pvh.versionNumber DESC")
    List<PlanVersionHistory> findAllVersionsByPlan(@Param("user") User user, @Param("planType") PlanVersionHistory.PlanType planType, @Param("planId") Long planId);

    /**
     * 🔍 Lấy latest version của một plan
     */
    @Query("SELECT pvh FROM PlanVersionHistory pvh WHERE pvh.user = :user AND pvh.planType = :planType AND pvh.planId = :planId AND pvh.isDeleted = false AND pvh.isCurrent = true")
    Optional<PlanVersionHistory> findCurrentVersion(@Param("user") User user, @Param("planType") PlanVersionHistory.PlanType planType, @Param("planId") Long planId);

    /**
     * 🔍 Lấy version theo version number
     */
    @Query("SELECT pvh FROM PlanVersionHistory pvh WHERE pvh.user = :user AND pvh.planType = :planType AND pvh.planId = :planId AND pvh.versionNumber = :versionNumber AND pvh.isDeleted = false")
    Optional<PlanVersionHistory> findByVersionNumber(@Param("user") User user, @Param("planType") PlanVersionHistory.PlanType planType, @Param("planId") Long planId, @Param("versionNumber") Integer versionNumber);

    /**
     * 🔍 Lấy version theo AI Version ID
     */
    @Query("SELECT pvh FROM PlanVersionHistory pvh WHERE pvh.aiVersionId = :aiVersionId AND pvh.isDeleted = false")
    Optional<PlanVersionHistory> findByAiVersionId(@Param("aiVersionId") String aiVersionId);

    /**
     * 🔍 Lấy tất cả versions của user
     */
    @Query("SELECT pvh FROM PlanVersionHistory pvh WHERE pvh.user = :user AND pvh.isDeleted = false ORDER BY pvh.createdAt DESC")
    List<PlanVersionHistory> findAllByUser(@Param("user") User user);

    /**
     * 🔍 Lấy tất cả versions theo loại plan
     */
    @Query("SELECT pvh FROM PlanVersionHistory pvh WHERE pvh.user = :user AND pvh.planType = :planType AND pvh.isDeleted = false ORDER BY pvh.createdAt DESC")
    List<PlanVersionHistory> findByUserAndPlanType(@Param("user") User user, @Param("planType") PlanVersionHistory.PlanType planType);

    /**
     * 🔍 Lấy versions có parent (tức là revision)
     */
    @Query("SELECT pvh FROM PlanVersionHistory pvh WHERE pvh.parentVersion IS NOT NULL AND pvh.user = :user AND pvh.isDeleted = false")
    List<PlanVersionHistory> findRevisions(@Param("user") User user);

    /**
     * 📊 Lấy next version number
     */
    @Query("SELECT COALESCE(MAX(pvh.versionNumber), 0) + 1 FROM PlanVersionHistory pvh WHERE pvh.user = :user AND pvh.planType = :planType AND pvh.planId = :planId")
    Integer getNextVersionNumber(@Param("user") User user, @Param("planType") PlanVersionHistory.PlanType planType, @Param("planId") Long planId);

    /**
     * 🔄 Unmark current version (khi tạo version mới)
     */
    @Modifying
    @Query("UPDATE PlanVersionHistory pvh SET pvh.isCurrent = false WHERE pvh.user = :user AND pvh.planType = :planType AND pvh.planId = :planId")
    void unmarkCurrentVersions(@Param("user") User user, @Param("planType") PlanVersionHistory.PlanType planType, @Param("planId") Long planId);

    /**
     * 🔄 Mark version là current
     */
    @Modifying
    @Query("UPDATE PlanVersionHistory pvh SET pvh.isCurrent = true, pvh.status = 'ACTIVE' WHERE pvh.pvhId = :id")
    void markAsCurrent(@Param("id") Long id);

    /**
     * 🔄 Revert to version (mark các version sau là reverted)
     */
    @Modifying
    @Query("UPDATE PlanVersionHistory pvh SET pvh.status = 'REVERTED' WHERE pvh.user = :user AND pvh.planType = :planType AND pvh.planId = :planId AND pvh.versionNumber > :revertedVersionNumber")
    void markRevertedVersions(@Param("user") User user, @Param("planType") PlanVersionHistory.PlanType planType, @Param("planId") Long planId, @Param("revertedVersionNumber") Integer revertedVersionNumber);

    /**
     * 🗑️ Soft delete version
     */
    @Modifying
    @Query("UPDATE PlanVersionHistory pvh SET pvh.isDeleted = true, pvh.deletedAt = CURRENT_TIMESTAMP WHERE pvh.pvhId = :id")
    void softDeleteById(@Param("id") Long id);

    /**
     * 🗑️ Soft delete tất cả versions của một plan
     */
    @Modifying
    @Query("UPDATE PlanVersionHistory pvh SET pvh.isDeleted = true, pvh.deletedAt = CURRENT_TIMESTAMP WHERE pvh.user = :user AND pvh.planType = :planType AND pvh.planId = :planId")
    void softDeleteAllByPlan(@Param("user") User user, @Param("planType") PlanVersionHistory.PlanType planType, @Param("planId") Long planId);

    /**
     * 🔍 Tìm version có chi phí thấp nhất (để suggest tiết kiệm)
     */
    @Query("SELECT pvh FROM PlanVersionHistory pvh WHERE pvh.user = :user AND pvh.planType = :planType AND pvh.isDeleted = false AND pvh.estimatedCost IS NOT NULL ORDER BY pvh.estimatedCost ASC")
    List<PlanVersionHistory> findCheapestVersions(@Param("user") User user, @Param("planType") PlanVersionHistory.PlanType planType);

    /**
     * 🔍 Tìm version có nutrition phù hợp nhất
     */
    @Query("SELECT pvh FROM PlanVersionHistory pvh WHERE pvh.user = :user AND pvh.planType = 'NUTRITION' AND pvh.isDeleted = false AND pvh.targetProtein >= :minProtein ORDER BY pvh.createdAt DESC")
    List<PlanVersionHistory> findHighProteinVersions(@Param("user") User user, @Param("minProtein") Double minProtein);
}
