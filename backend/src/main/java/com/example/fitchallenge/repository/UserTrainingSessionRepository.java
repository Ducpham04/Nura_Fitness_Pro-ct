package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.UserTrainingSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserTrainingSessionRepository extends JpaRepository<UserTrainingSession, Long> {
    Optional<UserTrainingSession> findByUtIdAndDayNumber(Long utId, Integer dayNumber);
    List<UserTrainingSession> findByUtIdOrderByDayNumberAsc(Long utId);
    void deleteByUtIdIn(Collection<Long> utIds);
    void deleteByUtIdAndDayNumberBetween(Long utId, Integer startDay, Integer endDay);
}
