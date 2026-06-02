package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.ZonedDateTime;

/**
 * Entity: Transaction
 * 👉 Chức năng: Lưu lịch sử giao dịch của người dùng (điểm thưởng, tiền, hoàn tiền, đổi thưởng...).
 * Mỗi bản ghi thể hiện một sự kiện tài chính hoặc tích điểm trong hệ thống.
 */
@Entity
@Getter
@Setter
@Table(name = "transactions")
public class Transaction {

    /**
     * 🔑 Mã giao dịch (Primary Key, tự tăng).
     * Dùng để định danh duy nhất mỗi giao dịch.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "tx_id")
    private Long id;

    /**
     * 👤 Người dùng thực hiện giao dịch.
     * Liên kết với bảng users (FOREIGN KEY → users.user_id).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * 🏷️ Loại giao dịch.
     * Ví dụ: "refund", "reward_redeem", "deposit", "withdraw".
     */
    @Column(name = "type", length = 50, nullable = false)
    private String type;

    /**
     * 💰 Số tiền của giao dịch (nếu có).
     * Có thể null trong trường hợp giao dịch chỉ liên quan đến điểm.
     * Sử dụng BigDecimal để đảm bảo độ chính xác tài chính.
     */
    @Column(name = "amount", precision = 12, scale = 2)
    private BigDecimal amount;

    /**
     * ⭐ Điểm giao dịch (nếu có).
     * Ví dụ: +100 điểm khi hoàn thành thử thách, -50 khi đổi thưởng.
     */
    @Column(name = "points")
    private Integer points;

    /**
     * 🔗 Mã giao dịch ngoài (nếu liên kết với hệ thống thanh toán hoặc dịch vụ đối tác).
     * Ví dụ: mã thanh toán PayPal, Stripe, hoặc mã hoàn tiền.
     */
    @Column(name = "reference", length = 255)
    private String reference;
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private TransactionStatus status = TransactionStatus.COMPLETED;

    public enum TransactionStatus {
        PENDING, COMPLETED, FAILED, CANCELLED
    }

    // ❌ THIẾU: Mô tả giao dịch
    @Column(name = "description")
    private String description;
    /**
     * 🕒 Thời điểm tạo giao dịch.
     * Mặc định là thời điểm hiện tại.
     */
    @Column(name = "created_at")
    private ZonedDateTime createdAt = ZonedDateTime.now();

    // Manual Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public Integer getPoints() { return points; }
    public void setPoints(Integer points) { this.points = points; }
    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }
    public TransactionStatus getStatus() { return status; }
    public void setStatus(TransactionStatus status) { this.status = status; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public ZonedDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(ZonedDateTime createdAt) { this.createdAt = createdAt; }
}
