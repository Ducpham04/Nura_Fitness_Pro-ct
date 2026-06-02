package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.AiModelEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.ZonedDateTime;
import org.springframework.stereotype.Repository;

@Repository
public interface AiModelEventRepository extends JpaRepository<AiModelEvent, Long> {

    /**
     * Tổng rep của user trong khoảng thời gian (ví dụ cả ngày local chuyển thành ZonedDateTime start/end).
     */
    @Query("SELECT COALESCE(SUM(e.reps), 0) FROM AiModelEvent e WHERE e.user.id = :userId AND e.createdAt >= :start AND e.createdAt < :end AND e.reps IS NOT NULL")
    Integer sumRepsByUserAndCreatedAtBetween(
            @Param("userId") Long userId,
            @Param("start") ZonedDateTime start,
            @Param("end") ZonedDateTime end
    );
}
