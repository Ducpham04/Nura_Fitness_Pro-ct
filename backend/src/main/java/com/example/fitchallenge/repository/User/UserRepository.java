package com.example.fitchallenge.repository.User;

import com.example.fitchallenge.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    Optional<User> findByReferralCode(String referralCode);

    /**
     * 🔒 Trừ điểm ở mức DB, chỉ khi đủ điểm (points >= cost).
     * Trả số dòng update được: 1 = trừ thành công, 0 = không đủ điểm.
     * Atomic tại DB nên chống double-spend khi đổi thưởng đồng thời.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE User u SET u.points = u.points - :cost WHERE u.id = :userId AND u.points >= :cost")
    int deductPointsIfEnough(@Param("userId") Long userId, @Param("cost") int cost);

    // Dashboard: đếm user theo status — tránh findAll() + stream filter
    long countByStatusIgnoreCase(String status);

    // Dashboard: lấy users mới / active trong khoảng thời gian (cho biểu đồ)
    @Query("SELECT u FROM User u WHERE u.createdAt > :since ORDER BY u.createdAt")
    List<User> findByCreatedAtAfter(@Param("since") ZonedDateTime since);

    @Query("SELECT u FROM User u WHERE u.lastLoginAt > :since ORDER BY u.lastLoginAt")
    List<User> findByLastLoginAtAfter(@Param("since") ZonedDateTime since);

    /** Gói trả phí đã hết hạn (cần hạ về FREE) — dùng cho scheduled job. */
    @Query("SELECT u FROM User u WHERE u.aiPackageExpiresAt IS NOT NULL AND u.aiPackageExpiresAt < :now")
    List<User> findExpiredPaidUsers(@Param("now") ZonedDateTime now);

    /** Gói sắp hết hạn trong khoảng [from, to) — dùng để gửi email nhắc gia hạn. */
    @Query("SELECT u FROM User u WHERE u.aiPackageExpiresAt IS NOT NULL AND u.aiPackageExpiresAt >= :from AND u.aiPackageExpiresAt < :to")
    List<User> findUsersExpiringBetween(@Param("from") ZonedDateTime from, @Param("to") ZonedDateTime to);
}

