package com.example.fitchallenge.controller;

import com.example.fitchallenge.Entity.UserInventory;
import com.example.fitchallenge.Entity.User;
import com.example.fitchallenge.service.UserInventoryService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST Controller: UserInventory
 * 👉 API endpoints quản lý tủ lạnh cá nhân / Smart Inventory
 * 💡 Tích hợp với AI Meal Planner
 */
@RestController
@RequestMapping("/api/inventory")

public class UserInventoryController {

    @Autowired
    private UserInventoryService inventoryService;

    @Autowired
    private com.example.fitchallenge.service.UserService userService;

    /**
     * 📋 GET /api/inventory/{userId} - Lấy tất cả items trong tủ lạnh
     */
    @GetMapping("/{userId}")
    public ResponseEntity<?> getUserInventory(
            @PathVariable Long userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            if (userDetails == null) {
                return ResponseEntity.status(401).body(createErrorResponse("Unauthorized"));
            }
            
            // Verify the authenticated user matches the requested userId
            Long authenticatedUserId = userService.getUserByEmail(userDetails.getUsername()).getId();
            if (!authenticatedUserId.equals(userId)) {
                return ResponseEntity.status(403).body(createErrorResponse("Forbidden: User ID mismatch"));
            }
            
            List<UserInventory> inventory = inventoryService.getUserInventory(userId);
            return ResponseEntity.ok(toResponseList(inventory));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 📋 GET /api/inventory/{userId}/status/{status} - Lấy items theo status
     */
    @GetMapping("/{userId}/status/{status}")
    public ResponseEntity<?> getItemsByStatus(
            @PathVariable Long userId,
            @PathVariable String status,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            if (userDetails == null) {
                return ResponseEntity.status(401).body(createErrorResponse("Unauthorized"));
            }
            
            Long authenticatedUserId = userService.getUserByEmail(userDetails.getUsername()).getId();
            if (!authenticatedUserId.equals(userId)) {
                return ResponseEntity.status(403).body(createErrorResponse("Forbidden: User ID mismatch"));
            }
            
            UserInventory.InventoryStatus inventoryStatus = UserInventory.InventoryStatus.valueOf(status.toUpperCase());
            List<UserInventory> items = inventoryService.getItemsByStatus(userId, inventoryStatus);
            return ResponseEntity.ok(toResponseList(items));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * ⚠️ GET /api/inventory/{userId}/expiring - Lấy items sắp hết hạn
     */
    @GetMapping("/{userId}/expiring")
    public ResponseEntity<?> getExpiringItems(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "3") int daysAhead,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            if (userDetails == null) {
                return ResponseEntity.status(401).body(createErrorResponse("Unauthorized"));
            }
            
            Long authenticatedUserId = userService.getUserByEmail(userDetails.getUsername()).getId();
            if (!authenticatedUserId.equals(userId)) {
                return ResponseEntity.status(403).body(createErrorResponse("Forbidden: User ID mismatch"));
            }
            
            List<UserInventory> items = inventoryService.getExpiringItems(userId, daysAhead);
            return ResponseEntity.ok(toResponseList(items));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 🔍 GET /api/inventory/{userId}/search - Tìm items theo tên
     */
    @GetMapping("/{userId}/search")
    public ResponseEntity<?> searchItems(
            @PathVariable Long userId,
            @RequestParam String keyword,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            if (userDetails == null) {
                return ResponseEntity.status(401).body(createErrorResponse("Unauthorized"));
            }
            
            Long authenticatedUserId = userService.getUserByEmail(userDetails.getUsername()).getId();
            if (!authenticatedUserId.equals(userId)) {
                return ResponseEntity.status(403).body(createErrorResponse("Forbidden: User ID mismatch"));
            }
            
            List<UserInventory> items = inventoryService.searchItems(userId, keyword);
            return ResponseEntity.ok(toResponseList(items));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * ➕ POST /api/inventory/{userId}/add - Thêm item mới
     */
    @PostMapping("/{userId}/add")
    public ResponseEntity<?> addItem(
            @PathVariable Long userId,
            @Valid @RequestBody AddItemRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            if (userDetails == null) {
                return ResponseEntity.status(401).body(createErrorResponse("Unauthorized"));
            }
            
            Long authenticatedUserId = userService.getUserByEmail(userDetails.getUsername()).getId();
            if (!authenticatedUserId.equals(userId)) {
                return ResponseEntity.status(403).body(createErrorResponse("Forbidden: User ID mismatch"));
            }
            
            UserInventory item = inventoryService.addItem(
                userId,
                request.foodName,
                request.quantityGrams,
                request.unit,
                request.expiryDate,
                request.foodId
            );
            return ResponseEntity.ok(toResponse(item));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 🔄 POST /api/inventory/{userId}/replace - Xóa inventory cũ và lưu snapshot mới
     */
    @PostMapping("/{userId}/replace")
    public ResponseEntity<?> replaceItems(
            @PathVariable Long userId,
            @Valid @RequestBody ReplaceItemsRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            if (userDetails == null) {
                return ResponseEntity.status(401).body(createErrorResponse("Unauthorized"));
            }

            Long authenticatedUserId = userService.getUserByEmail(userDetails.getUsername()).getId();
            if (!authenticatedUserId.equals(userId)) {
                return ResponseEntity.status(403).body(createErrorResponse("Forbidden: User ID mismatch"));
            }

            List<UserInventoryService.InventoryItemInput> inputs = request == null || request.items == null
                    ? List.of()
                    : request.items.stream()
                            .map(item -> new UserInventoryService.InventoryItemInput(
                                    item.foodName,
                                    item.quantityGrams,
                                    item.unit,
                                    item.expiryDate,
                                    item.foodId
                            ))
                            .toList();

            List<UserInventory> items = inventoryService.replaceItems(userId, inputs);
            return ResponseEntity.ok(toResponseList(items));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 🔄 PUT /api/inventory/{userId}/{inventoryId}/status - Cập nhật status
     */
    @PutMapping("/{userId}/{inventoryId}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long userId,
            @PathVariable Long inventoryId,
            @Valid @RequestBody UpdateStatusRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            if (userDetails == null) {
                return ResponseEntity.status(401).body(createErrorResponse("Unauthorized"));
            }
            
            Long authenticatedUserId = userService.getUserByEmail(userDetails.getUsername()).getId();
            if (!authenticatedUserId.equals(userId)) {
                return ResponseEntity.status(403).body(createErrorResponse("Forbidden: User ID mismatch"));
            }
            
            UserInventory.InventoryStatus status = UserInventory.InventoryStatus.valueOf(request.status.toUpperCase());
            UserInventory item = inventoryService.updateStatus(inventoryId, userId, status);
            return ResponseEntity.ok(toResponse(item));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 🍽️ PUT /api/inventory/{userId}/{inventoryId}/used - Mark item đã dùng trong plan
     */
    @PutMapping("/{userId}/{inventoryId}/used")
    public ResponseEntity<?> markUsedInPlan(
            @PathVariable Long userId,
            @PathVariable Long inventoryId,
            @Valid @RequestBody MarkUsedRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            if (userDetails == null) {
                return ResponseEntity.status(401).body(createErrorResponse("Unauthorized"));
            }
            
            Long authenticatedUserId = userService.getUserByEmail(userDetails.getUsername()).getId();
            if (!authenticatedUserId.equals(userId)) {
                return ResponseEntity.status(403).body(createErrorResponse("Forbidden: User ID mismatch"));
            }
            
            inventoryService.markUsedInPlan(inventoryId, userId, request.aiSuggestion);
            return ResponseEntity.ok(createSuccessResponse("Item marked as used in plan"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 🗑️ DELETE /api/inventory/{userId}/{inventoryId} - Xóa item (soft delete)
     */
    @DeleteMapping("/{userId}/{inventoryId}")
    public ResponseEntity<?> deleteItem(
            @PathVariable Long userId,
            @PathVariable Long inventoryId,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            if (userDetails == null) {
                return ResponseEntity.status(401).body(createErrorResponse("Unauthorized"));
            }
            
            Long authenticatedUserId = userService.getUserByEmail(userDetails.getUsername()).getId();
            if (!authenticatedUserId.equals(userId)) {
                return ResponseEntity.status(403).body(createErrorResponse("Forbidden: User ID mismatch"));
            }
            
            inventoryService.deleteItem(inventoryId, userId);
            return ResponseEntity.ok(createSuccessResponse("Item deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 🔄 POST /api/inventory/{inventoryId}/restore - Khôi phục item đã xóa
     */
    @PostMapping("/{inventoryId}/restore")
    public ResponseEntity<?> restoreItem(
            @PathVariable Long inventoryId,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            if (userDetails == null) {
                return ResponseEntity.status(401).body(createErrorResponse("Unauthorized"));
            }
            
            inventoryService.restoreItem(inventoryId);
            return ResponseEntity.ok(createSuccessResponse("Item restored successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 📊 GET /api/inventory/{userId}/stats - Thống kê tủ lạnh
     */
    @GetMapping("/{userId}/stats")
    public ResponseEntity<?> getInventoryStats(
            @PathVariable Long userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            if (userDetails == null) {
                return ResponseEntity.status(401).body(createErrorResponse("Unauthorized"));
            }
            
            Long authenticatedUserId = userService.getUserByEmail(userDetails.getUsername()).getId();
            if (!authenticatedUserId.equals(userId)) {
                return ResponseEntity.status(403).body(createErrorResponse("Forbidden: User ID mismatch"));
            }
            
            UserInventoryService.InventoryStats stats = inventoryService.getInventoryStats(userId);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * 🤖 GET /api/inventory/{userId}/available-for-ai - Lấy items cho AI Meal Planner
     */
    @GetMapping("/{userId}/available-for-ai")
    public ResponseEntity<?> getAvailableItemsForAi(
            @PathVariable Long userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            if (userDetails == null) {
                return ResponseEntity.status(401).body(createErrorResponse("Unauthorized"));
            }
            
            Long authenticatedUserId = userService.getUserByEmail(userDetails.getUsername()).getId();
            if (!authenticatedUserId.equals(userId)) {
                return ResponseEntity.status(403).body(createErrorResponse("Forbidden: User ID mismatch"));
            }
            
            List<UserInventory> items = inventoryService.getAvailableItemsForAi(userId);
            return ResponseEntity.ok(toResponseList(items));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    // 📦 Request/Response classes
    public static class AddItemRequest {
        public String foodName;
        public Double quantityGrams;
        public String unit;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        public LocalDate expiryDate;
        public Long foodId;
    }

    public static class ReplaceItemsRequest {
        public List<AddItemRequest> items;
    }

    public static class UpdateStatusRequest {
        public String status;
    }

    public static class MarkUsedRequest {
        public String aiSuggestion;
    }

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

    private List<Map<String, Object>> toResponseList(List<UserInventory> items) {
        return items.stream().map(this::toResponse).toList();
    }

    private Map<String, Object> toResponse(UserInventory item) {
        Map<String, Object> response = new HashMap<>();
        String displayName = item.getDisplayName();

        response.put("inventoryId", item.getInventoryId());
        response.put("id", item.getInventoryId());
        response.put("foodId", item.getFood() != null ? item.getFood().getFoodId() : null);
        response.put("foodName", item.getFoodName());
        response.put("displayName", displayName);
        response.put("name", displayName);
        response.put("quantityGrams", item.getQuantityGrams());
        response.put("quantity", item.getQuantityGrams());
        response.put("unit", item.getUnit());
        response.put("status", item.getStatus() != null ? item.getStatus().name() : null);
        response.put("expiryDate", item.getExpiryDate());
        response.put("usedInPlan", item.getUsedInPlan());
        response.put("aiSuggestionNote", item.getAiSuggestionNote());
        response.put("addedAt", item.getAddedAt());
        response.put("updatedAt", item.getUpdatedAt());

        if (item.getFood() != null) {
            response.put("category", item.getFood().getCategory());
            response.put("caloriesPer100g", item.getFood().getCaloriesPer100g());
            response.put("proteinPer100g", item.getFood().getProteinPer100g());
            response.put("carbsPer100g", item.getFood().getCarbsPer100g());
            response.put("fatPer100g", item.getFood().getFatPer100g());
            response.put("averageMarketPriceVnd", item.getFood().getAverageMarketPriceVnd());
        } else {
            response.put("category", "General");
            response.put("caloriesPer100g", 0);
        }

        return response;
    }
}
