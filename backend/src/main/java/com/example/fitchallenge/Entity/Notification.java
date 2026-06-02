package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.ZonedDateTime;

/**
 * Entity: Notification
 * 👉 Chức năng: Quản lý thông báo gửi đến người dùng
 * (thành tích, nhắc nhở, cập nhật, v.v.)
 */
@Entity
@Table(
    name = "notifications",
    indexes = {
        @Index(name = "idx_notif_user_read", columnList = "user_id,is_read"),
        @Index(name = "idx_notif_user_created", columnList = "user_id,created_at"),
        @Index(name = "idx_notif_type", columnList = "type")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    /**
     * 🔑 Mã thông báo (Primary Key, tự tăng)
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "notification_id")
    private Long notificationId;

    /**
     * 👤 Người dùng nhận thông báo (khóa ngoại → users.user_id)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * 📢 Tiêu đề thông báo
     */
    @Column(name = "title", nullable = false, length = 200)
    private String title;

    /**
     * 📝 Nội dung thông báo
     */
    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;

    /**
     * 🏷️ Loại thông báo
     * - achievement: Thành tích
     * - reminder: Nhắc nhở
     * - update: Cập nhật
     * - reward: Phần thưởng
     * - challenge: Thử thách
     * - system: Hệ thống
     */
    @Column(name = "type", length = 50, nullable = false)
    private String type;

    /**
     * 🔗 Link liên kết (nếu có)
     * Ví dụ: link đến challenge, reward, profile, etc.
     */
    @Column(name = "link_url", columnDefinition = "TEXT")
    private String linkUrl;

    /**
     * 🖼️ Icon hoặc hình ảnh thông báo
     */
    @Column(name = "icon_url", columnDefinition = "TEXT")
    private String iconUrl;

    /**
     * ✅ Trạng thái đọc
     * - unread: Chưa đọc
     * - read: Đã đọc
     */
    @Column(name = "is_read", nullable = false)
    private Boolean isRead = false;

    /**
     * 📅 Thời điểm đọc (nếu đã đọc)
     */
    @Column(name = "read_at")
    private ZonedDateTime readAt;

    /**
     * 📤 Trạng thái gửi
     * - PENDING: Đang chờ gửi
     * - SENT: Đã gửi
     * - FAILED: Gửi thất bại
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "send_status", length = 20, nullable = false)
    private SendStatus sendStatus = SendStatus.PENDING;

    public enum SendStatus {
        PENDING, SENT, FAILED
    }

    /**
     * 📧 Đã gửi qua email
     */
    @Column(name = "sent_via_email")
    private Boolean sentViaEmail = false;

    /**
     * 📱 Đã gửi qua push notification
     */
    @Column(name = "sent_via_push")
    private Boolean sentViaPush = false;

    /**
     * 🔔 Đã gửi qua in-app notification
     */
    @Column(name = "sent_via_in_app")
    private Boolean sentViaInApp = true;

    /**
     * 🕒 Thời điểm gửi
     */
    @Column(name = "sent_at")
    private ZonedDateTime sentAt;

    /**
     * 🕒 Thời điểm tạo thông báo
     */
    @Column(name = "created_at", nullable = false)
    private ZonedDateTime createdAt = ZonedDateTime.now();

    /**
     * 🕒 Thời điểm cập nhật
     */
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;

    @PreUpdate
    protected void onUpdate() {
        updatedAt = ZonedDateTime.now();
    }
    
    // Manual getters/setters for Lombok compatibility
    public Long getNotificationId() {
        return notificationId;
    }
    
    public void setNotificationId(Long notificationId) {
        this.notificationId = notificationId;
    }
    
    public User getUser() {
        return user;
    }
    
    public void setUser(User user) {
        this.user = user;
    }
    
    public String getTitle() {
        return title;
    }
    
    public void setTitle(String title) {
        this.title = title;
    }
    
    public String getContent() {
        return content;
    }
    
    public void setContent(String content) {
        this.content = content;
    }
    
    public String getType() {
        return type;
    }
    
    public void setType(String type) {
        this.type = type;
    }
    
    public String getLinkUrl() {
        return linkUrl;
    }
    
    public void setLinkUrl(String linkUrl) {
        this.linkUrl = linkUrl;
    }
    
    public String getIconUrl() {
        return iconUrl;
    }
    
    public void setIconUrl(String iconUrl) {
        this.iconUrl = iconUrl;
    }
    
    public Boolean getIsRead() {
        return isRead;
    }
    
    public void setIsRead(Boolean isRead) {
        this.isRead = isRead;
    }
    
    public ZonedDateTime getReadAt() {
        return readAt;
    }
    
    public void setReadAt(ZonedDateTime readAt) {
        this.readAt = readAt;
    }
    
    public SendStatus getSendStatus() {
        return sendStatus;
    }
    
    public void setSendStatus(SendStatus sendStatus) {
        this.sendStatus = sendStatus;
    }
    
    public Boolean getSentViaEmail() {
        return sentViaEmail;
    }
    
    public void setSentViaEmail(Boolean sentViaEmail) {
        this.sentViaEmail = sentViaEmail;
    }
    
    public Boolean getSentViaPush() {
        return sentViaPush;
    }
    
    public void setSentViaPush(Boolean sentViaPush) {
        this.sentViaPush = sentViaPush;
    }
    
    public Boolean getSentViaInApp() {
        return sentViaInApp;
    }
    
    public void setSentViaInApp(Boolean sentViaInApp) {
        this.sentViaInApp = sentViaInApp;
    }
    
    public ZonedDateTime getSentAt() {
        return sentAt;
    }
    
    public void setSentAt(ZonedDateTime sentAt) {
        this.sentAt = sentAt;
    }
    
    public ZonedDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(ZonedDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public ZonedDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(ZonedDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    // Manual builder for Lombok compatibility
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private User user;
        private String title;
        private String content;
        private String type;
        private String linkUrl;
        private String iconUrl;
        private Boolean isRead;
        private ZonedDateTime readAt;
        private SendStatus sendStatus;
        private Boolean sentViaEmail;
        private Boolean sentViaPush;
        private Boolean sentViaInApp;
        private ZonedDateTime sentAt;
        private ZonedDateTime createdAt;
        private ZonedDateTime updatedAt;

        public Builder user(User user) {
            this.user = user;
            return this;
        }

        public Builder title(String title) {
            this.title = title;
            return this;
        }

        public Builder content(String content) {
            this.content = content;
            return this;
        }

        public Builder type(String type) {
            this.type = type;
            return this;
        }

        public Builder linkUrl(String linkUrl) {
            this.linkUrl = linkUrl;
            return this;
        }

        public Builder iconUrl(String iconUrl) {
            this.iconUrl = iconUrl;
            return this;
        }

        public Builder isRead(Boolean isRead) {
            this.isRead = isRead;
            return this;
        }

        public Builder readAt(ZonedDateTime readAt) {
            this.readAt = readAt;
            return this;
        }

        public Builder sendStatus(SendStatus sendStatus) {
            this.sendStatus = sendStatus;
            return this;
        }

        public Builder sentViaEmail(Boolean sentViaEmail) {
            this.sentViaEmail = sentViaEmail;
            return this;
        }

        public Builder sentViaPush(Boolean sentViaPush) {
            this.sentViaPush = sentViaPush;
            return this;
        }

        public Builder sentViaInApp(Boolean sentViaInApp) {
            this.sentViaInApp = sentViaInApp;
            return this;
        }

        public Builder sentAt(ZonedDateTime sentAt) {
            this.sentAt = sentAt;
            return this;
        }

        public Builder createdAt(ZonedDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public Builder updatedAt(ZonedDateTime updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }

        public Notification build() {
            Notification notification = new Notification();
            notification.user = this.user;
            notification.title = this.title;
            notification.content = this.content;
            notification.type = this.type;
            notification.linkUrl = this.linkUrl;
            notification.iconUrl = this.iconUrl;
            notification.isRead = this.isRead != null ? this.isRead : false;
            notification.readAt = this.readAt;
            notification.sendStatus = this.sendStatus != null ? this.sendStatus : SendStatus.PENDING;
            notification.sentViaEmail = this.sentViaEmail != null ? this.sentViaEmail : false;
            notification.sentViaPush = this.sentViaPush != null ? this.sentViaPush : false;
            notification.sentViaInApp = this.sentViaInApp != null ? this.sentViaInApp : true;
            notification.sentAt = this.sentAt;
            notification.createdAt = this.createdAt != null ? this.createdAt : ZonedDateTime.now();
            notification.updatedAt = this.updatedAt;
            return notification;
        }
    }
}







