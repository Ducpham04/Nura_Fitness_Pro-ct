package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.ZonedDateTime;

/**
 * Entity: UserInventory (Smart Inventory / Tủ lạnh cá nhân)
 * 👉 Chức năng: Lưu trữ thực phẩm user có sẵn để AI Meal Planner tối ưu chi phí
 * 💡 Tích hợp với AI Service để suggest sử dụng ingredients có sẵn
 */
@Entity
@Table(
    name = "user_inventory",
    indexes = {
        @Index(name = "idx_ui_user_status", columnList = "user_id,status"),
        @Index(name = "idx_ui_expiry", columnList = "expiry_date"),
        @Index(name = "idx_ui_food", columnList = "food_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserInventory {

    /**
     * 🔑 Mã bản ghi (Primary Key, tự tăng)
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "inventory_id")
    private Long inventoryId;

    /**
     * 👤 Người dùng sở hữu (khóa ngoại → users.user_id)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * 🍎 Thực phẩm trong database (optional - có thể null nếu food custom)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "food_id")
    private Food food;

    /**
     * 📝 Tên thực phẩm (cho custom entries không có trong Food DB)
     */
    @Column(name = "food_name", length = 255)
    private String foodName;

    /**
     * ⚖️ Số lượng (gram)
     */
    @Column(name = "quantity_grams")
    private Double quantityGrams;

    /**
     * 📏 Đơn vị đo (g, kg, piece, bowl, etc.)
     */
    @Column(name = "unit", length = 50)
    private String unit;

    /**
     * 📊 Trạng thái tồn kho
     * - AVAILABLE: Còn dùng được
     * - EXPIRED: Hết hạn sử dụng
     * - CONSUMED: Đã dùng hết
     * - RESERVED: Đã đặt cho plan sắp tới
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private InventoryStatus status = InventoryStatus.AVAILABLE;

    public enum InventoryStatus {
        AVAILABLE, EXPIRED, CONSUMED, RESERVED
    }

    /**
     * 📅 Ngày hết hạn
     */
    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    /**
     * 🎯 Đã được AI suggest sử dụng trong plan chưa?
     */
    @Column(name = "used_in_plan")
    private Boolean usedInPlan = false;

    /**
     * 💡 Ghi chú AI suggestion
     */
    @Column(name = "ai_suggestion_note", columnDefinition = "TEXT")
    private String aiSuggestionNote;

    /**
     * 🕒 Thời điểm thêm vào tủ lạnh
     */
    @Column(name = "added_at")
    private ZonedDateTime addedAt = ZonedDateTime.now();

    /**
     * 🕒 Thời điểm cập nhật
     */
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;

    /**
     * 🗑️ Soft delete flag
     */
    @Column(name = "is_deleted")
    private Boolean isDeleted = false;

    /**
     * 🗑️ Thời điểm xóa (soft delete)
     */
    @Column(name = "deleted_at")
    private ZonedDateTime deletedAt;

    @PreUpdate
    protected void onUpdate() {
        updatedAt = ZonedDateTime.now();
    }

    /**
     * 🔄 Phương thức khôi phục sau soft delete
     */
    public void restore() {
        this.isDeleted = false;
        this.deletedAt = null;
    }

    /**
     * 🍽️ Lấy tên thực phẩm (ưu tiên food.name nếu có link, không thì dùng foodName)
     */
    public String getDisplayName() {
        if (food != null && food.getName() != null) {
            return food.getName();
        }
        return foodName;
    }
    
    }
