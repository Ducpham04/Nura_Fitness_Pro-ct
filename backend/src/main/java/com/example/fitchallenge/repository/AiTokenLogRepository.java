package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.AiTokenLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.ZonedDateTime;
import java.util.List;

public interface AiTokenLogRepository extends JpaRepository<AiTokenLog, Long> {

    /** Tổng token toàn hệ thống từ mốc thời gian. */
    @Query("SELECT COALESCE(SUM(t.totalTokens), 0) FROM AiTokenLog t WHERE t.createdAt >= :from")
    long sumTotalSince(@Param("from") ZonedDateTime from);

    /** Tổng token toàn hệ thống (all-time). */
    @Query("SELECT COALESCE(SUM(t.totalTokens), 0) FROM AiTokenLog t")
    long sumTotalAllTime();

    /** Token theo từng user từ mốc thời gian: [userId, sumTotalTokens]. */
    @Query("SELECT t.userId, COALESCE(SUM(t.totalTokens), 0) FROM AiTokenLog t " +
           "WHERE t.userId IS NOT NULL AND t.createdAt >= :from GROUP BY t.userId")
    List<Object[]> sumByUserSince(@Param("from") ZonedDateTime from);

    /** Token theo từng user (all-time): [userId, sumTotalTokens]. */
    @Query("SELECT t.userId, COALESCE(SUM(t.totalTokens), 0) FROM AiTokenLog t " +
           "WHERE t.userId IS NOT NULL GROUP BY t.userId")
    List<Object[]> sumByUserAllTime();

    /** Token phân theo callType từ mốc thời gian: [callType, sumTotal, count]. */
    @Query("SELECT t.callType, COALESCE(SUM(t.totalTokens), 0), COUNT(t) FROM AiTokenLog t " +
           "WHERE t.createdAt >= :from GROUP BY t.callType")
    List<Object[]> sumByCallTypeSince(@Param("from") ZonedDateTime from);

    /** Token phân theo callType (all-time): [callType, sumTotal, count]. */
    @Query("SELECT t.callType, COALESCE(SUM(t.totalTokens), 0), COUNT(t) FROM AiTokenLog t GROUP BY t.callType")
    List<Object[]> sumByCallTypeAllTime();

    /** Lần gọi AI gần nhất của từng user: [userId, maxCreatedAt]. */
    @Query("SELECT t.userId, MAX(t.createdAt) FROM AiTokenLog t WHERE t.userId IS NOT NULL GROUP BY t.userId")
    List<Object[]> lastCallByUser();

    /** Tổng lượt gọi của từng user trong tháng: [userId, count]. */
    @Query("SELECT t.userId, COUNT(t) FROM AiTokenLog t " +
           "WHERE t.userId IS NOT NULL AND t.createdAt >= :from GROUP BY t.userId")
    List<Object[]> countByUserSince(@Param("from") ZonedDateTime from);
}
