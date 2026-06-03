package com.example.fitchallenge.service;

import com.example.fitchallenge.config.NotificationResponse;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;

public interface AIGatewayService {
    NotificationResponse scanFoodImage(MultipartFile image, Long userId);
    NotificationResponse generateMealPlan(Map<String, Object> request, Long userId);
    NotificationResponse generateWorkoutPlan(Map<String, Object> request, Long userId);
    NotificationResponse analyzePose(MultipartFile media, String exerciseType, Long userId);
    NotificationResponse calculateNutrition(Map<String, Object> foodData, Long userId);
    NotificationResponse chatWithCoach(Map<String, Object> chatRequest, Long userId);
    NotificationResponse scanInventoryImage(MultipartFile image, Long userId);
    NotificationResponse logFoodNatural(Map<String, Object> body, Long userId);
    NotificationResponse suggestDishesFromIngredients(Map<String, Object> body, Long userId);
    NotificationResponse suggestShoppingList(Map<String, Object> body, Long userId);
    NotificationResponse autoRegulate(Map<String, Object> body, Long userId);
}
