package com.example.fitchallenge.service;

import com.example.fitchallenge.DTO.InventoryDTO.InventoryRequest;
import com.example.fitchallenge.config.NotificationResponse;
import org.springframework.data.domain.Pageable;

public interface InventoryService {
    NotificationResponse getInventoryItems(Long userId, String category, String status, Pageable pageable);
    NotificationResponse addInventoryItem(Long userId, InventoryRequest request);
    NotificationResponse updateInventoryItem(Long userId, Long id, InventoryRequest request);
    NotificationResponse deleteInventoryItem(Long userId, Long id);
    NotificationResponse getExpiringItems(Long userId, int days);
    NotificationResponse getLowStockItems(Long userId, double minQuantity);
    NotificationResponse scanBarcode(Long userId, String barcode, double quantity);
    NotificationResponse generateShoppingList(Long userId, int daysAhead);
}
