package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.Reward;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RewardRepository extends JpaRepository<Reward,Long> {

    // Dashboard: đếm reward theo status
    long countByStatusIgnoreCase(String status);

    /**
     * 🔒 Giảm tồn kho 1 đơn vị ở mức DB, chỉ khi còn hàng (stock >= 1).
     * Trả số dòng update được: 1 = giảm thành công, 0 = đã hết hàng.
     * Atomic ngay tại DB nên chống race-condition (oversell) khi đổi thưởng đồng thời.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Reward r SET r.stock = r.stock - 1 WHERE r.rewardId = :rewardId AND r.stock >= 1")
    int decrementStockIfAvailable(@Param("rewardId") Long rewardId);

    /**
     * ↩️ Hoàn lại 1 tồn kho — dùng để rollback khi trừ điểm thất bại.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Reward r SET r.stock = r.stock + 1 WHERE r.rewardId = :rewardId")
    int incrementStock(@Param("rewardId") Long rewardId);
}
