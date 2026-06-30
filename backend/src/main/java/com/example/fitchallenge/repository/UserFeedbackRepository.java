package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.UserFeedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserFeedbackRepository extends JpaRepository<UserFeedback, Long> {
    List<UserFeedback> findAllByOrderByCreatedAtDesc();
    List<UserFeedback> findByUserIdOrderByCreatedAtDesc(Long userId);
}
