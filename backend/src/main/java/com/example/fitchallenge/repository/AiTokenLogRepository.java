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
}
