package com.example.fitchallenge.Entity;



import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.ZonedDateTime;

/**
 * Entity: RewardRedemption
 * 👉 Chức năng: Lưu thông tin người dùng đổi quà trong hệ thống.
 * Mỗi bản ghi thể hiện một giao dịch đổi quà giữa người dùng và phần thưởng cụ thể.
 */
@Setter
@Getter
@Entity
@Table(name = "reward_redemptions")
public class RewardRedemption {

    /**
     * 🔑 Mã giao dịch đổi quà (Primary Key, tự tăng).
     * Dùng để định danh duy nhất mỗi giao dịch.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rr_id")
    private Long id;

    /**
     * 👤 Người dùng thực hiện đổi quà.
     * Liên kết với bảng users thông qua khóa ngoại user_id.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * 🎁 Phần thưởng được đổi.
     * Liên kết với bảng rewards thông qua khóa ngoại reward_id.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reward_id", nullable = false)
    private Reward reward;

    /**
     * 📦 Trạng thái giao dịch đổi quà.
     * - PENDING: Đang xử lý
     * - FULFILLED: Hoàn tất
     * - CANCELLED: Đã hủy
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private RedemptionStatus status = RedemptionStatus.PENDING;

    public enum RedemptionStatus {
        PENDING, FULFILLED, CANCELLED
    }

    /**
     * 🕒 Ngày yêu cầu đổi quà.
     * Mặc định là thời điểm hiện tại (now()).
     */
    @Column(name = "created_at")
    private ZonedDateTime createdAt = ZonedDateTime.now();

    /**
     * ✅ Ngày hoàn tất giao dịch (nếu có).
     * Có thể để trống nếu chưa xử lý hoặc bị hủy.
     */
    @Column(name = "fulfilled_at")
    private ZonedDateTime fulfilledAt;

    // ===== Getters và Setters =====
    
    // Manual getters/setters for Lombok compatibility
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public User getUser() {
        return user;
    }
    
    public void setUser(User user) {
        this.user = user;
    }
    
    public Reward getReward() {
        return reward;
    }
    
    public void setReward(Reward reward) {
        this.reward = reward;
    }
    
    public RedemptionStatus getStatus() {
        return status;
    }
    
    public void setStatus(RedemptionStatus status) {
        this.status = status;
    }
    
    public ZonedDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(ZonedDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public ZonedDateTime getFulfilledAt() {
        return fulfilledAt;
    }
    
    public void setFulfilledAt(ZonedDateTime fulfilledAt) {
        this.fulfilledAt = fulfilledAt;
    }
}
