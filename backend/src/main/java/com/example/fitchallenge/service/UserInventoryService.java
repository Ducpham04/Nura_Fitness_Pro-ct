package com.example.fitchallenge.service;

import com.example.fitchallenge.Entity.UserInventory;
import java.time.LocalDate;
import java.util.List;

/**
 * Service Interface: UserInventory
 * 👉 Chức năng: Quản lý tủ lạnh cá nhân
 * 💡 Tích hợp với AI Service để optimize meal plans
 */
public interface UserInventoryService {
    
    /**
     * 📋 Lấy tất cả items trong tủ lạnh
     */
    List<UserInventory> getUserInventory(Long userId);
    
    /**
     * 📋 Lấy items theo status
     */
    List<UserInventory> getItemsByStatus(Long userId, UserInventory.InventoryStatus status);
    
    /**
     * ⚠️ Lấy items sắp hết hạn
     */
    List<UserInventory> getExpiringItems(Long userId, int daysAhead);
    
    /**
     * 🔍 Tìm items theo tên
     */
    List<UserInventory> searchItems(Long userId, String keyword);
    
    /**
     * ➕ Thêm item mới
     */
    UserInventory addItem(Long userId, String foodName, Double quantityGrams, String unit, LocalDate expiryDate, Long foodId);

    /**
     * 🔄 Thay toàn bộ tủ lạnh bằng danh sách item mới
     */
    List<UserInventory> replaceItems(Long userId, List<InventoryItemInput> items);
    
    /**
     * 🔄 Cập nhật status
     */
    UserInventory updateStatus(Long inventoryId, Long userId, UserInventory.InventoryStatus status);
    
    /**
     * 🍽️ Mark item đã dùng trong plan
     */
    void markUsedInPlan(Long inventoryId, Long userId, String aiSuggestion);
    
    /**
     * 🗑️ Xóa item (soft delete)
     */
    void deleteItem(Long inventoryId, Long userId);
    
    /**
     * 🔄 Khôi phục item đã xóa
     */
    void restoreItem(Long inventoryId);
    
    /**
     * 📊 Thống kê tủ lạnh
     */
    InventoryStats getInventoryStats(Long userId);
    
    /**
     * 🤖 Lấy items cho AI Meal Planner
     */
    List<UserInventory> getAvailableItemsForAi(Long userId);
    
    /**
     * Stats class
     */
    class InventoryStats {
        public final int totalItems;
        public final int availableItems;
        public final int usedItems;
        public final int expiredItems;
        public final int expiringSoon;
        
        public InventoryStats(int totalItems, int availableItems, int usedItems, int expiredItems, int expiringSoon) {
            this.totalItems = totalItems;
            this.availableItems = availableItems;
            this.usedItems = usedItems;
            this.expiredItems = expiredItems;
            this.expiringSoon = expiringSoon;
        }
    }

    class InventoryItemInput {
        public final String foodName;
        public final Double quantityGrams;
        public final String unit;
        public final LocalDate expiryDate;
        public final Long foodId;

        public InventoryItemInput(String foodName, Double quantityGrams, String unit, LocalDate expiryDate, Long foodId) {
            this.foodName = foodName;
            this.quantityGrams = quantityGrams;
            this.unit = unit;
            this.expiryDate = expiryDate;
            this.foodId = foodId;
        }
    }
}
