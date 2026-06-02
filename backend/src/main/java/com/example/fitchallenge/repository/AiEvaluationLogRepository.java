package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.AiEvaluationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AiEvaluationLogRepository extends JpaRepository<AiEvaluationLog, Long> {
}
