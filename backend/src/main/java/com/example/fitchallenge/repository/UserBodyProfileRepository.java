package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.UserBodyProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Optional;

@Repository
public interface UserBodyProfileRepository extends JpaRepository<UserBodyProfile, Long> {
    Optional<UserBodyProfile> findByUser_Id(Long userId);
    boolean existsByUser_Id(Long userId);

    // Dashboard: tính trung bình recommended calories — tránh findAll()
    @Query("SELECT AVG(p.recommendedCalories) FROM UserBodyProfile p WHERE p.recommendedCalories > 0")
    BigDecimal avgRecommendedCalories();
}




