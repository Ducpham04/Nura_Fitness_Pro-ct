package com.example.fitchallenge.service.impl;

import com.example.fitchallenge.Entity.Food;
import com.example.fitchallenge.Entity.User;
import com.example.fitchallenge.Entity.UserInventory;
import com.example.fitchallenge.repository.FoodRepository;
import com.example.fitchallenge.repository.UserInventoryRepository;
import com.example.fitchallenge.repository.User.UserRepository;
import com.example.fitchallenge.service.UserInventoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Service Implementation: UserInventory
 * 👉 Chức năng: Quản lý tủ lạnh cá nhân
 * 💡 Tích hợp với AI Service để optimize meal plans
 */
@Service
public class UserInventoryServiceImpl implements UserInventoryService {

    @Autowired
    private UserInventoryRepository userInventoryRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FoodRepository foodRepository;

    @Override
    @Transactional
    public List<UserInventory> getUserInventory(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        return consolidateDuplicateItems(userInventoryRepository.findAllByUser(user));
    }

    @Override
    public List<UserInventory> getItemsByStatus(Long userId, UserInventory.InventoryStatus status) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        return userInventoryRepository.findByUserAndStatusAndIsDeletedFalse(user, status);
    }

    @Override
    public List<UserInventory> getExpiringItems(Long userId, int daysAhead) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        LocalDate cutoffDate = LocalDate.now().plusDays(daysAhead);
        return userInventoryRepository.findExpiringItems(user, cutoffDate);
    }

    @Override
    public List<UserInventory> searchItems(Long userId, String keyword) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        return userInventoryRepository.findByUserAndFoodNameContainingIgnoreCase(user, keyword);
    }

    @Override
    @Transactional
    public UserInventory addItem(Long userId, String foodName, Double quantityGrams, String unit, LocalDate expiryDate, Long foodId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        if ((foodName == null || foodName.isBlank()) && foodId == null) {
            throw new RuntimeException("Food name or foodId is required");
        }
        if (quantityGrams == null || quantityGrams <= 0) {
            throw new RuntimeException("Quantity must be greater than 0");
        }

        Food linkedFood = null;
        if (foodId != null) {
            linkedFood = foodRepository.findById(foodId).orElse(null);
        }
        Food finalLinkedFood = linkedFood;
        String finalFoodName = foodName;

        List<UserInventory> matchingItems = userInventoryRepository.findByUserAndIsDeletedFalse(user).stream()
            .filter(item -> matchesInventoryItem(item, finalFoodName, finalLinkedFood))
            .toList();

        if (!matchingItems.isEmpty()) {
            UserInventory inventory = matchingItems.get(0);
            matchingItems.stream().skip(1).forEach(duplicate -> mergeDuplicateIntoPrimary(inventory, duplicate));
            double currentQty = inventory.getQuantityGrams() != null ? inventory.getQuantityGrams() : 0d;
            inventory.setQuantityGrams(currentQty + quantityGrams);
            inventory.setUnit(unit != null && !unit.isBlank() ? unit.trim() : inventory.getUnit());
            if (expiryDate != null && (inventory.getExpiryDate() == null || expiryDate.isBefore(inventory.getExpiryDate()))) {
                inventory.setExpiryDate(expiryDate);
            }
            if (linkedFood != null && inventory.getFood() == null) {
                inventory.setFood(linkedFood);
            }
            inventory.setStatus(UserInventory.InventoryStatus.AVAILABLE);
            inventory.setUsedInPlan(false);
            List<UserInventory> itemsToSave = new ArrayList<>(matchingItems);
            if (!itemsToSave.contains(inventory)) {
                itemsToSave.add(inventory);
            }
            userInventoryRepository.saveAll(itemsToSave);
            return inventory;
        }

        UserInventory inventory = new UserInventory();
        inventory.setUser(user);
        inventory.setFoodName(foodName != null ? foodName.trim() : null);
        inventory.setQuantityGrams(quantityGrams);
        inventory.setUnit(unit != null && !unit.isBlank() ? unit.trim() : "g");
        inventory.setExpiryDate(expiryDate);
        inventory.setStatus(UserInventory.InventoryStatus.AVAILABLE);
        inventory.setUsedInPlan(false);

        // Link to Food entity if foodId provided
        if (linkedFood != null) {
            inventory.setFood(linkedFood);
        }

        return userInventoryRepository.save(inventory);
    }

    @Override
    @Transactional
    public List<UserInventory> replaceItems(Long userId, List<InventoryItemInput> items) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        userInventoryRepository.softDeleteActiveByUser(user);

        if (items == null || items.isEmpty()) {
            return List.of();
        }

        List<UserInventory> savedItems = new ArrayList<>();
        for (InventoryItemInput item : items) {
            savedItems.add(addItem(
                userId,
                item.foodName,
                item.quantityGrams,
                item.unit,
                item.expiryDate,
                item.foodId
            ));
        }
        return consolidateDuplicateItems(savedItems);
    }

    private List<UserInventory> consolidateDuplicateItems(List<UserInventory> items) {
        Map<String, UserInventory> uniqueItems = new LinkedHashMap<>();
        List<UserInventory> changedItems = new ArrayList<>();

        for (UserInventory item : items) {
            String key = inventoryDuplicateKey(item);
            if (key.isBlank()) {
                uniqueItems.put("id:" + item.getInventoryId(), item);
                continue;
            }

            UserInventory primary = uniqueItems.get(key);
            if (primary == null) {
                uniqueItems.put(key, item);
                continue;
            }

            mergeDuplicateIntoPrimary(primary, item);
            changedItems.add(primary);
            changedItems.add(item);
        }

        if (!changedItems.isEmpty()) {
            userInventoryRepository.saveAll(changedItems);
        }

        return new ArrayList<>(uniqueItems.values());
    }

    private void mergeDuplicateIntoPrimary(UserInventory primary, UserInventory duplicate) {
        double primaryQty = primary.getQuantityGrams() != null ? primary.getQuantityGrams() : 0d;
        double duplicateQty = duplicate.getQuantityGrams() != null ? duplicate.getQuantityGrams() : 0d;
        primary.setQuantityGrams(primaryQty + duplicateQty);

        if ((primary.getUnit() == null || primary.getUnit().isBlank()) && duplicate.getUnit() != null) {
            primary.setUnit(duplicate.getUnit());
        }
        if (primary.getFood() == null && duplicate.getFood() != null) {
            primary.setFood(duplicate.getFood());
        }
        if ((primary.getFoodName() == null || primary.getFoodName().isBlank()) && duplicate.getFoodName() != null) {
            primary.setFoodName(duplicate.getFoodName());
        }
        if (duplicate.getExpiryDate() != null
                && (primary.getExpiryDate() == null || duplicate.getExpiryDate().isBefore(primary.getExpiryDate()))) {
            primary.setExpiryDate(duplicate.getExpiryDate());
        }
        if (duplicate.getStatus() == UserInventory.InventoryStatus.AVAILABLE) {
            primary.setStatus(UserInventory.InventoryStatus.AVAILABLE);
            primary.setUsedInPlan(false);
        }

        duplicate.setIsDeleted(true);
        duplicate.setDeletedAt(ZonedDateTime.now());
    }

    private boolean matchesInventoryItem(UserInventory item, String foodName, Food linkedFood) {
        if (linkedFood != null && item.getFood() != null && linkedFood.getFoodId().equals(item.getFood().getFoodId())) {
            return true;
        }

        String incomingName = normalize(linkedFood != null ? linkedFood.getName() : foodName);
        String existingName = normalize(item.getDisplayName());
        return !incomingName.isBlank() && incomingName.equals(existingName);
    }

    private String inventoryDuplicateKey(UserInventory item) {
        if (item.getFood() != null && item.getFood().getFoodId() != null) {
            return "food:" + item.getFood().getFoodId();
        }
        return "name:" + normalize(item.getDisplayName());
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        String normalized = Normalizer.normalize(value.trim().toLowerCase(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return normalized.replaceAll("\\s+", " ");
    }

    @Override
    @Transactional
    public UserInventory updateStatus(Long inventoryId, Long userId, UserInventory.InventoryStatus status) {
        UserInventory inventory = userInventoryRepository.findByIdWithFood(inventoryId)
            .orElseThrow(() -> new RuntimeException("Inventory item not found"));
        
        // Verify ownership
        if (!inventory.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized: Item does not belong to user");
        }
        
        inventory.setStatus(status);
        return userInventoryRepository.save(inventory);
    }

    @Override
    @Transactional
    public void markUsedInPlan(Long inventoryId, Long userId, String aiSuggestion) {
        UserInventory inventory = userInventoryRepository.findById(inventoryId)
            .orElseThrow(() -> new RuntimeException("Inventory item not found"));
        
        // Verify ownership
        if (!inventory.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized: Item does not belong to user");
        }
        
        inventory.setUsedInPlan(true);
        inventory.setAiSuggestionNote(aiSuggestion);
        inventory.setStatus(UserInventory.InventoryStatus.CONSUMED);
        
        userInventoryRepository.save(inventory);
    }

    @Override
    @Transactional
    public void deleteItem(Long inventoryId, Long userId) {
        UserInventory inventory = userInventoryRepository.findById(inventoryId)
            .orElseThrow(() -> new RuntimeException("Inventory item not found"));
        
        // Verify ownership
        if (!inventory.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized: Item does not belong to user");
        }
        
        inventory.setIsDeleted(true);
        inventory.setDeletedAt(java.time.ZonedDateTime.now());
        userInventoryRepository.save(inventory);
    }

    @Override
    @Transactional
    public void restoreItem(Long inventoryId) {
        UserInventory inventory = userInventoryRepository.findById(inventoryId)
            .orElseThrow(() -> new RuntimeException("Inventory item not found"));
        
        inventory.setIsDeleted(false);
        inventory.setDeletedAt(null);
        userInventoryRepository.save(inventory);
    }

    @Override
    public InventoryStats getInventoryStats(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        List<UserInventory> allItems = userInventoryRepository.findAllByUser(user);
        
        int totalItems = allItems.size();
        int availableItems = (int) allItems.stream()
            .filter(item -> !item.getIsDeleted() && item.getStatus() == UserInventory.InventoryStatus.AVAILABLE)
            .count();
        int usedItems = (int) allItems.stream()
            .filter(item -> !item.getIsDeleted() && item.getStatus() == UserInventory.InventoryStatus.CONSUMED)
            .count();
        int expiredItems = (int) allItems.stream()
            .filter(item -> !item.getIsDeleted() && 
                item.getExpiryDate() != null && 
                item.getExpiryDate().isBefore(LocalDate.now()))
            .count();
        int expiringSoon = (int) allItems.stream()
            .filter(item -> !item.getIsDeleted() && 
                item.getExpiryDate() != null && 
                item.getExpiryDate().isBefore(LocalDate.now().plusDays(3)))
            .count();
        
        return new InventoryStats(totalItems, availableItems, usedItems, expiredItems, expiringSoon);
    }

    @Override
    public List<UserInventory> getAvailableItemsForAi(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        return userInventoryRepository.findAvailableItemsForAI(user);
    }
}
