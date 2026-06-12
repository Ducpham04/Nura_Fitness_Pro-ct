package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.Reward;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RewardRepository extends JpaRepository<Reward,Long> {

    // Dashboard: đếm reward theo status
    long countByStatusIgnoreCase(String status);
}
