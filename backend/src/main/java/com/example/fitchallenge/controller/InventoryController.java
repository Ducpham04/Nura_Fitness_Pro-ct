package com.example.fitchallenge.controller;

import com.example.fitchallenge.DTO.InventoryDTO.InventoryItemDTO;
import com.example.fitchallenge.DTO.InventoryDTO.InventoryRequest;
import com.example.fitchallenge.Security.AuthenticatedUserIdResolver;
import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.service.InventoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
@Tag(name = "Smart Inventory", description = "Personal refrigerator and food inventory management")
public class InventoryController {

    private final InventoryService inventoryService;
    private final AuthenticatedUserIdResolver authUser;

    /**
     * Get all inventory items for user
     */
    @GetMapping("/")
    @Operation(summary = "Get inventory items", description = "Retrieve all items in user's personal inventory")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Inventory items retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "404", description = "Inventory not found")
    })
    public ResponseEntity<NotificationResponse> getInventoryItems(
            @Parameter(description = "User ID") @RequestHeader("userId") Long userId,
            @Parameter(description = "Filter by category") @RequestParam(required = false) String category,
            @Parameter(description = "Filter by status") @RequestParam(required = false) String status,
            @Parameter(description = "Page number") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size) {
        userId = authUser.resolve(userId);
        try {
            Pageable pageable = PageRequest.of(page, size);
            NotificationResponse response = inventoryService.getInventoryItems(userId, category, status, pageable);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                new NotificationResponse(false, "Failed to get inventory items: " + e.getMessage())
            );
        }
    }

    /**
     * Add new item to inventory
     */
    @PostMapping("/add")
    @Operation(summary = "Add inventory item", description = "Add new food item to user's inventory")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Item added successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid input data"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<NotificationResponse> addInventoryItem(
            @Parameter(description = "Inventory item data") @Valid @RequestBody InventoryRequest request,
            @Parameter(description = "User ID") @RequestHeader("userId") Long userId) {
        userId = authUser.resolve(userId);
        try {
            NotificationResponse response = inventoryService.addInventoryItem(userId, request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                new NotificationResponse(false, "Failed to add inventory item: " + e.getMessage())
            );
        }
    }

    /**
     * Update inventory item
     */
    @PutMapping("/{id}")
    @Operation(summary = "Update inventory item", description = "Update existing inventory item")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Item updated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid input data"),
        @ApiResponse(responseCode = "404", description = "Item not found"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<NotificationResponse> updateInventoryItem(
            @Parameter(description = "Item ID") @PathVariable Long id,
            @Parameter(description = "Updated item data") @Valid @RequestBody InventoryRequest request,
            @Parameter(description = "User ID") @RequestHeader("userId") Long userId) {
        userId = authUser.resolve(userId);
        try {
            NotificationResponse response = inventoryService.updateInventoryItem(userId, id, request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                new NotificationResponse(false, "Failed to update inventory item: " + e.getMessage())
            );
        }
    }

    /**
     * Delete inventory item
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete inventory item", description = "Remove item from user's inventory")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Item deleted successfully"),
        @ApiResponse(responseCode = "404", description = "Item not found"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<NotificationResponse> deleteInventoryItem(
            @Parameter(description = "Item ID") @PathVariable Long id,
            @Parameter(description = "User ID") @RequestHeader("userId") Long userId) {
        userId = authUser.resolve(userId);
        try {
            NotificationResponse response = inventoryService.deleteInventoryItem(userId, id);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                new NotificationResponse(false, "Failed to delete inventory item: " + e.getMessage())
            );
        }
    }

    /**
     * Get items expiring soon
     */
    @GetMapping("/expiring-soon")
    @Operation(summary = "Get expiring items", description = "Get items that will expire within specified days")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Expiring items retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<NotificationResponse> getExpiringItems(
            @Parameter(description = "User ID") @RequestHeader("userId") Long userId,
            @Parameter(description = "Days until expiry") @RequestParam(defaultValue = "7") int days) {
        userId = authUser.resolve(userId);
        try {
            NotificationResponse response = inventoryService.getExpiringItems(userId, days);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                new NotificationResponse(false, "Failed to get expiring items: " + e.getMessage())
            );
        }
    }

    /**
     * Get low stock items
     */
    @GetMapping("/low-stock")
    @Operation(summary = "Get low stock items", description = "Get items with low quantity")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Low stock items retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<NotificationResponse> getLowStockItems(
            @Parameter(description = "User ID") @RequestHeader("userId") Long userId,
            @Parameter(description = "Minimum quantity threshold") @RequestParam(defaultValue = "1") double minQuantity) {
        userId = authUser.resolve(userId);
        try {
            NotificationResponse response = inventoryService.getLowStockItems(userId, minQuantity);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                new NotificationResponse(false, "Failed to get low stock items: " + e.getMessage())
            );
        }
    }

    /**
     * Scan barcode to add item
     */
    @PostMapping("/scan-barcode")
    @Operation(summary = "Scan barcode", description = "Scan barcode to automatically add item to inventory")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Barcode scanned successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid barcode"),
        @ApiResponse(responseCode = "404", description = "Product not found"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<NotificationResponse> scanBarcode(
            @Parameter(description = "Barcode number") @RequestParam String barcode,
            @Parameter(description = "Quantity") @RequestParam(defaultValue = "1") double quantity,
            @Parameter(description = "User ID") @RequestHeader("userId") Long userId) {
        userId = authUser.resolve(userId);
        try {
            NotificationResponse response = inventoryService.scanBarcode(userId, barcode, quantity);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                new NotificationResponse(false, "Failed to scan barcode: " + e.getMessage())
            );
        }
    }

    /**
     * Generate shopping list from inventory
     */
    @GetMapping("/shopping-list")
    @Operation(summary = "Generate shopping list", description = "Generate shopping list based on inventory gaps and meal plans")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Shopping list generated successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<NotificationResponse> generateShoppingList(
            @Parameter(description = "User ID") @RequestHeader("userId") Long userId,
            @Parameter(description = "Days ahead") @RequestParam(defaultValue = "7") int daysAhead) {
        userId = authUser.resolve(userId);
        try {
            NotificationResponse response = inventoryService.generateShoppingList(userId, daysAhead);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                new NotificationResponse(false, "Failed to generate shopping list: " + e.getMessage())
            );
        }
    }
}
