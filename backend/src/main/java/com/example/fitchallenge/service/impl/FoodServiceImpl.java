package com.example.fitchallenge.service.impl;



import com.example.fitchallenge.DTO.FoodDTO.FoodRequest;
import com.example.fitchallenge.DTO.FoodDTO.FoodResponse;
import com.example.fitchallenge.Entity.Food;
import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.repository.FoodRepository;
import com.example.fitchallenge.repository.UserInventoryRepository;
import com.example.fitchallenge.repository.UserPreferenceRepository;
import com.example.fitchallenge.repository.PersonalizedMealItemRepository;
import com.example.fitchallenge.repository.DishIngredientRepository;
import com.example.fitchallenge.service.FoodService;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Transactional(readOnly = true)
@Service
@RequiredArgsConstructor
public class FoodServiceImpl implements FoodService {

    private final FoodRepository foodRepository;
    private final UserInventoryRepository userInventoryRepository;
    private final UserPreferenceRepository userPreferenceRepository;
    private final PersonalizedMealItemRepository personalizedMealItemRepository;
    private final DishIngredientRepository dishIngredientRepository;

    private FoodResponse toResponse(Food food){
        FoodResponse response = new FoodResponse();
        response.setId(food.getFoodId());
        response.setName(food.getName());
        response.setCalories(food.getCaloriesPer100g());
        response.setProtein(food.getProteinPer100g() != null ? food.getProteinPer100g().doubleValue() : null);
        response.setCarbs(food.getCarbsPer100g() != null ? food.getCarbsPer100g().doubleValue() : null);
        response.setFat(food.getFatPer100g() != null ? food.getFatPer100g().doubleValue() : null);
        response.setCategory(food.getCategory());
        response.setAverageMarketPriceVnd(food.getAverageMarketPriceVnd());
        response.setNotes(food.getNotes());
        return response;
    }

    @Override
    @Transactional
    public NotificationResponse createFood(FoodRequest request) {
        Food food = new Food();
        food.setName(request.getName());
        food.setCaloriesPer100g(request.getCalories());
        food.setProteinPer100g(request.getProtein() != null ? BigDecimal.valueOf(request.getProtein()) : null);
        food.setCarbsPer100g(request.getCarbs() != null ? BigDecimal.valueOf(request.getCarbs()) : null);
        food.setFatPer100g(request.getFat() != null ? BigDecimal.valueOf(request.getFat()) : null);
        food.setNotes(request.getNotes());
        foodRepository.save(food);
        return new NotificationResponse(true, "Food created successfully", toResponse(food));
    }

    @Override
    @Transactional
    public NotificationResponse updateFood(Long id, FoodRequest request) {
        Food food = foodRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Food not found with ID: " + id));
        food.setName(request.getName());
        food.setCaloriesPer100g(request.getCalories());
        food.setProteinPer100g(request.getProtein() != null ? BigDecimal.valueOf(request.getProtein()) : null);
        food.setCarbsPer100g(request.getCarbs() != null ? BigDecimal.valueOf(request.getCarbs()) : null);
        food.setFatPer100g(request.getFat() != null ? BigDecimal.valueOf(request.getFat()) : null);
        food.setNotes(request.getNotes());
        foodRepository.save(food);
        return new NotificationResponse(true, "Food updated successfully", toResponse(food));
    }

    @Override
    @Transactional
    public NotificationResponse deleteFood(Long id) {
        if(!foodRepository.existsById(id)){
            return new NotificationResponse(false, "Food not found");
        }
        // Gỡ/xoá mọi tham chiếu tới food trước khi xoá để tránh vi phạm khoá ngoại.
        // - FK NOT NULL (meal item, dish ingredient) → xoá hẳn dòng tham chiếu
        // - FK nullable (kho user, preference) → gỡ link, giữ lại bản ghi của user
        personalizedMealItemRepository.deleteByFoodId(id);
        dishIngredientRepository.deleteByFoodId(id);
        userInventoryRepository.unlinkFood(id);
        userPreferenceRepository.unlinkFood(id);
        foodRepository.deleteById(id);
        return new NotificationResponse(true, "Food deleted successfully");
    }

    @Override
    public NotificationResponse getFoodById(Long id) {
        Food food = foodRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Food not found with ID: " + id));
        return new NotificationResponse(true, "Success", toResponse(food));
    }

    @Override
    public NotificationResponse getAllFoods() {
        List<FoodResponse> list = foodRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return new NotificationResponse(true, "All foods", list);
    }
}
