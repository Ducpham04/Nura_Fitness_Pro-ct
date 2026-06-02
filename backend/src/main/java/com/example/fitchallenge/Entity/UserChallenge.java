package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.Accessors;
import java.time.ZonedDateTime;

/**
 * Entity ánh xạ bảng user_challenges trong database.
 * Lưu thông tin người dùng tham gia thử thách, kết quả, video và dữ liệu AI.
 */
@Entity
@Table(
    name = "user_challenges",
    indexes = {
        @Index(name = "idx_uc_user_submitted", columnList = "user_id,submitted_at"),
        @Index(name = "idx_uc_challenge", columnList = "challenge_id"),
        @Index(name = "idx_uc_status", columnList = "status")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserChallenge {

    /** 🔹 Mã bản ghi tham gia thử thách (Khóa chính - tự tăng) */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "uc_id")
    private Long ucId;

    /** 🔹 Người dùng tham gia (khóa ngoại → users.user_id) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** 🔹 Thử thách mà người dùng tham gia (khóa ngoại → challenges.challenge_id) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "challenge_id", nullable = false)
    private Challenges challenge;

    /**
     * 🔹 Trạng thái tham gia thử thách:
     * - PENDING: đang chờ xử lý
     * - SUCCESS: hoàn thành
     * - FAILED: thất bại
     * - DISPUTED: đang tranh chấp
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private UserChallengeStatus status = UserChallengeStatus.PENDING;

    public enum UserChallengeStatus {
        PENDING, SUCCESS, FAILED, DISPUTED
    }

    /** 🔹 Đường dẫn đến video người dùng gửi lên (có thể là URL tới server hoặc CDN) */
    @Column(name = "video_url", columnDefinition = "TEXT")
    private String videoUrl;

    /**
     * 🔹 Payload chứa keypoints (dữ liệu xương khớp) từ mô hình AI
     * Dạng JSON, ví dụ:
     * {"pose": [0.1, 0.2, 0.3], "accuracy": 0.95}
     */
    @Column(name = "keypoints_payload", columnDefinition = "TEXT")
    private String keypointsPayload;

    /** 🔹 Điểm số hoặc số lần lặp lại trong thử thách */
    @Column(name = "score")
    private Integer score;

    /** 🔹 Độ tin cậy của mô hình AI, có thể từ 0.0000 → 1.0000 */
    @Column(name = "confidence")
    private Double confidence;

    /** 🔹 Thời điểm người dùng gửi bài (mặc định: thời điểm hiện tại) */
    @Column(name = "submitted_at")
    private ZonedDateTime submittedAt = ZonedDateTime.now();

    /** 🔹 Thời điểm hoàn thành thử thách (có thể null nếu chưa hoàn thành) */
    @Column(name = "completed_at")
    private ZonedDateTime completedAt;

    /** 🔹 Soft delete flag */
    @Column(name = "is_deleted")
    private Boolean isDeleted = false;

    /** 🔹 Thời điểm xóa (soft delete) */
    @Column(name = "deleted_at")
    private ZonedDateTime deletedAt;

    /**
     * 🔄 Phương thức khôi phục sau soft delete
     */
    public void restore() {
        this.isDeleted = false;
        this.deletedAt = null;
    }
    




}
