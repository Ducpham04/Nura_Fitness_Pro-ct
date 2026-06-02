package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.Notification;
import com.example.fitchallenge.Entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository: Notification
 * 👉 Chức năng: Truy vấn thông báo người dùng
 * 💡 Hỗ trợ phân trang, lọc theo trạng thái đọc, và đánh dấu đã đọc hàng loạt
 */
@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /**
     * 📋 Lấy tất cả thông báo của user (có phân trang)
     */
    Page<Notification> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);

    /**
     * 📋 Lấy thông báo của user (không phân trang)
     */
    List<Notification> findByUserOrderByCreatedAtDesc(User user);

    /**
     * 📋 Lấy thông báo chưa đọc của user
     */
    List<Notification> findByUserAndIsReadFalseOrderByCreatedAtDesc(User user);

    /**
     * 📋 Lấy thông báo đã đọc của user
     */
    List<Notification> findByUserAndIsReadTrueOrderByCreatedAtDesc(User user);

    /**
     * 🔢 Đếm số thông báo chưa đọc của user
     */
    Long countByUserAndIsReadFalse(User user);

    /**
     * 🔍 Tìm thông báo theo ID và user (đảm bảo user chỉ xem thông báo của mình)
     */
    Optional<Notification> findByNotificationIdAndUser(Long notificationId, User user);

    /**
     * 🏷️ Lấy thông báo theo type
     */
    List<Notification> findByUserAndTypeOrderByCreatedAtDesc(User user, String type);

    /**
     * ✅ Đánh dấu tất cả thông báo của user là đã đọc
     */
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = :readAt WHERE n.user = :user AND n.isRead = false")
    void markAllAsRead(@Param("user") User user, @Param("readAt") ZonedDateTime readAt);

    /**
     * ✅ Đánh dấu thông báo cụ thể là đã đọc
     */
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = :readAt WHERE n.notificationId = :id")
    void markAsRead(@Param("id") Long notificationId, @Param("readAt") ZonedDateTime readAt);

    /**
     * 📅 Lấy thông báo trong khoảng thời gian
     */
    @Query("SELECT n FROM Notification n WHERE n.user = :user AND n.createdAt BETWEEN :startDate AND :endDate ORDER BY n.createdAt DESC")
    List<Notification> findByUserAndDateRange(@Param("user") User user, @Param("startDate") ZonedDateTime startDate, @Param("endDate") ZonedDateTime endDate);

    /**
     * 🗑️ Xóa thông báo đã đọc cũ (cleanup)
     */
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.user = :user AND n.isRead = true AND n.createdAt < :cutoffDate")
    void deleteOldReadNotifications(@Param("user") User user, @Param("cutoffDate") ZonedDateTime cutoffDate);

    /**
     * 📤 Lấy thông báo đang chờ gửi (cho background job)
     */
    List<Notification> findBySendStatus(Notification.SendStatus sendStatus);

    /**
     * 🔔 Lấy thông báo gần đây nhất của user
     */
    List<Notification> findTop5ByUserOrderByCreatedAtDesc(User user);
}
