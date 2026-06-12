package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.RewardRedemption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.ZonedDateTime;
import java.util.List;

@Repository
public interface RewardRedemptionRepository extends JpaRepository<RewardRedemption, Long> {

    // Dashboard: lọc redemptions theo period — tránh findAll() toàn bảng
    List<RewardRedemption> findByCreatedAtAfter(ZonedDateTime since);
}
