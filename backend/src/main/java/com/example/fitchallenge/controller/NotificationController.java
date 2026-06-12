package com.example.fitchallenge.controller;

import com.example.fitchallenge.Entity.Notification;
import com.example.fitchallenge.Entity.User;
import com.example.fitchallenge.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST Controller: Notification
 * 👉 API endpoints quản lý thông báo người dùng
 * 💡 Tích hợp với WebSocket để push real-time notifications
 * 💡 Frontend gọi API này để lấy thông báo sau khi AI tạo xong plan
 */
@RestController
@RequestMapping("/api/notifications")

public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private com.example.fitchallenge.service.UserService userService;

    @Autowired
    private com.example.fitchallenge.Security.AuthenticatedUserIdResolver authUser;

    /**
     * 📋 GET /api/notifications/{userId} - Lấy tất cả thông báo của user
     * Hỗ trợ phân trang: ?page=0&size=20
     */
    @GetMapping("/{userId}")
    public ResponseEntity<?> getUserNotifications(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        userId = authUser.resolve(userId);
        try {
            // Verify user exists
            userService.getUserEntityById(userId);
            
            Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
            Page<Notification> notifications = notificationService.getUserNotifications(userId, pageable);
            return ResponseEntity.ok(notifications);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 🔔 GET /api/notifications/{userId}/unread - Lấy thông báo chưa đọc
     */
    @GetMapping("/{userId}/unread")
    public ResponseEntity<?> getUnreadNotifications(@PathVariable Long userId) {
        userId = authUser.resolve(userId);
        try {
            List<Notification> notifications = notificationService.getUnreadNotifications(userId);
            return ResponseEntity.ok(notifications);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 🔢 GET /api/notifications/{userId}/count-unread - Đếm thông báo chưa đọc
     * Dùng để hiển thị badge số trên icon notification
     */
    @GetMapping("/{userId}/count-unread")
    public ResponseEntity<?> countUnreadNotifications(@PathVariable Long userId) {
        userId = authUser.resolve(userId);
        try {
            Long count = notificationService.countUnreadNotifications(userId);
            Map<String, Object> response = new HashMap<>();
            response.put("unreadCount", count);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * ✅ PUT /api/notifications/{notificationId}/read - Đánh dấu đã đọc
     */
    @PutMapping("/{notificationId}/read")
    public ResponseEntity<?> markAsRead(
            @PathVariable Long notificationId,
            @RequestParam Long userId) {
        userId = authUser.resolve(userId);
        try {
            notificationService.markAsRead(notificationId, userId);
            return ResponseEntity.ok(createSuccessResponse("Notification marked as read"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * ✅ PUT /api/notifications/{userId}/read-all - Đánh dấu tất cả đã đọc
     */
    @PutMapping("/{userId}/read-all")
    public ResponseEntity<?> markAllAsRead(@PathVariable Long userId) {
        userId = authUser.resolve(userId);
        try {
            notificationService.markAllAsRead(userId);
            return ResponseEntity.ok(createSuccessResponse("All notifications marked as read"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 🔔 GET /api/notifications/{userId}/recent - Lấy 5 thông báo gần nhất
     * Dùng cho dropdown notification ở header
     */
    @GetMapping("/{userId}/recent")
    public ResponseEntity<?> getRecentNotifications(@PathVariable Long userId) {
        userId = authUser.resolve(userId);
        try {
            List<Notification> notifications = notificationService.getRecentNotifications(userId);
            return ResponseEntity.ok(notifications);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 🗑️ DELETE /api/notifications/{notificationId} - Xóa thông báo
     */
    @DeleteMapping("/{notificationId}")
    public ResponseEntity<?> deleteNotification(
            @PathVariable Long notificationId,
            @RequestParam Long userId) {
        userId = authUser.resolve(userId);
        try {
            notificationService.deleteNotification(notificationId, userId);
            return ResponseEntity.ok(createSuccessResponse("Notification deleted"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 🧹 POST /api/notifications/{userId}/cleanup - Dọn dẹp thông báo cũ
     */
    @PostMapping("/{userId}/cleanup")
    public ResponseEntity<?> cleanupOldNotifications(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "30") int daysToKeep) {
        userId = authUser.resolve(userId);
        try {
            notificationService.cleanupOldNotifications(userId, daysToKeep);
            return ResponseEntity.ok(createSuccessResponse("Old notifications cleaned up"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    // 📦 Helper methods
    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("error", message);
        return response;
    }

    private Map<String, Object> createSuccessResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", message);
        return response;
    }
}
