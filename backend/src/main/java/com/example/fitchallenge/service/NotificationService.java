package com.example.fitchallenge.service;

import com.example.fitchallenge.Entity.Notification;
import com.example.fitchallenge.Entity.User;
import com.example.fitchallenge.repository.NotificationRepository;
import com.example.fitchallenge.repository.User.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;

import java.time.ZonedDateTime;
import java.util.List;

/**
 * Service: Notification
 * 👉 Chức năng: Quản lý thông báo người dùng
 * 💡 Tích hợp với WebSocket để push real-time notifications
 */
@Service
@Slf4j
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * 📋 Lấy tất cả thông báo của user (có phân trang)
     */
    public Page<Notification> getUserNotifications(Long userId, Pageable pageable) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return notificationRepository.findByUserOrderByCreatedAtDesc(user, pageable);
    }

    /**
     * 📋 Lấy tất cả thông báo của user (không phân trang)
     */
    public List<Notification> getUserNotifications(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return notificationRepository.findByUserOrderByCreatedAtDesc(user);
    }

    /**
     * 🔔 Lấy thông báo chưa đọc
     */
    public List<Notification> getUnreadNotifications(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return notificationRepository.findByUserAndIsReadFalseOrderByCreatedAtDesc(user);
    }

    /**
     * 🔢 Đếm số thông báo chưa đọc
     */
    public Long countUnreadNotifications(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return notificationRepository.countByUserAndIsReadFalse(user);
    }

    /**
     * ✅ Đánh dấu thông báo đã đọc
     */
    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Notification notification = notificationRepository.findByNotificationIdAndUser(notificationId, user)
            .orElseThrow(() -> new RuntimeException("Notification not found"));

        notificationRepository.markAsRead(notificationId, ZonedDateTime.now());
    }

    /**
     * ✅ Đánh dấu tất cả thông báo đã đọc
     */
    @Transactional
    public void markAllAsRead(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        notificationRepository.markAllAsRead(user, ZonedDateTime.now());
    }

    /**
     * ➕ Tạo thông báo mới
     */
    @Transactional
    public Notification createNotification(Long userId, String title, String content, String type, String linkUrl) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Notification notification = Notification.builder()
            .user(user)
            .title(title)
            .content(content)
            .type(type)
            .linkUrl(linkUrl)
            .isRead(false)
            .sendStatus(Notification.SendStatus.PENDING)
            .sentViaInApp(true)
            .createdAt(ZonedDateTime.now())
            .build();

        return notificationRepository.save(notification);
    }

    /**
     * 🍽️ Tạo thông báo "Meal Plan Ready" (sau khi AI tạo xong)
     */
    @Transactional
    public Notification notifyMealPlanReady(Long userId, String planName) {
        return createNotification(
            userId,
            "Thực đơn tuần mới đã sẵn sàng! 🍽️",
            "Thực đơn \"" + planName + "\" của bạn đã được AI tạo xong. Hãy xem ngay!",
            "meal_plan_ready",
            "/nutrition/personalized-plans"
        );
    }

    /**
     * 🏆 Tạo thông báo thành tích
     */
    @Transactional
    public Notification notifyAchievement(Long userId, String achievementTitle, String description) {
        return createNotification(
            userId,
            "🎉 Chúc mừng! " + achievementTitle,
            description,
            "achievement",
            "/profile/achievements"
        );
    }

    /**
     * ⚠️ Tạo thông báo nhắc nhở
     */
    @Transactional
    public Notification notifyReminder(Long userId, String title, String message) {
        return createNotification(
            userId,
            title,
            message,
            "reminder",
            null
        );
    }

    /**
     * 🗑️ Xóa thông báo
     */
    @Transactional
    public void deleteNotification(Long notificationId, Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Notification notification = notificationRepository.findByNotificationIdAndUser(notificationId, user)
            .orElseThrow(() -> new RuntimeException("Notification not found"));

        notificationRepository.delete(notification);
    }

    /**
     * 🗑️ Cleanup thông báo cũ đã đọc
     */
    @Transactional
    public void cleanupOldNotifications(Long userId, int daysToKeep) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        ZonedDateTime cutoffDate = ZonedDateTime.now().minusDays(daysToKeep);
        notificationRepository.deleteOldReadNotifications(user, cutoffDate);
    }

    /**
     * 🔍 Lấy 5 thông báo gần nhất
     */
    public List<Notification> getRecentNotifications(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return notificationRepository.findTop5ByUserOrderByCreatedAtDesc(user);
    }
}
