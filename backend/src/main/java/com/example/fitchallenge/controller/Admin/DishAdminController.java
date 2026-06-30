package com.example.fitchallenge.controller.Admin;

import com.example.fitchallenge.Entity.Dish;
import com.example.fitchallenge.Entity.DishIngredient;
import com.example.fitchallenge.Entity.Food;
import com.example.fitchallenge.config.NotificationResponse;
import com.example.fitchallenge.repository.DishIngredientRepository;
import com.example.fitchallenge.repository.DishRepository;
import com.example.fitchallenge.repository.FoodRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/admin/dishes")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DishAdminController {

    private final DishRepository dishRepository;
    private final DishIngredientRepository dishIngredientRepository;
    private final FoodRepository foodRepository;

    @GetMapping
    public ResponseEntity<NotificationResponse> getAll() {
        return ResponseEntity.ok(new NotificationResponse(true, "Dishes retrieved successfully", dishRepository.findAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<NotificationResponse> getById(@PathVariable Long id) {
        Dish dish = dishRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Dish not found"));
        return ResponseEntity.ok(new NotificationResponse(true, "Dish retrieved successfully", dish));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<NotificationResponse> create(@Valid @RequestBody DishRequest request) {
        Dish dish = new Dish();
        applyDishRequest(dish, request);
        Dish saved = dishRepository.save(dish);
        return ResponseEntity.ok(new NotificationResponse(true, "Dish created successfully", saved));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<NotificationResponse> update(@PathVariable Long id, @Valid @RequestBody DishRequest request) {
        Dish dish = dishRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Dish not found"));
        applyDishRequest(dish, request);
        Dish saved = dishRepository.save(dish);
        return ResponseEntity.ok(new NotificationResponse(true, "Dish updated successfully", saved));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<NotificationResponse> delete(@PathVariable Long id) {
        if (!dishRepository.existsById(id)) {
            return ResponseEntity.status(404).body(new NotificationResponse(false, "Dish not found"));
        }
        dishRepository.deleteById(id);
        return ResponseEntity.ok(new NotificationResponse(true, "Dish deleted successfully"));
    }

    @GetMapping("/{dishId}/ingredients")
    public ResponseEntity<NotificationResponse> getIngredients(@PathVariable Long dishId) {
        try {
            List<Map<String, Object>> views = dishIngredientRepository.findByDishIdWithFood(dishId)
                    .stream().map(DishAdminController::toView).toList();
            return ResponseEntity.ok(new NotificationResponse(true, "Dish ingredients retrieved successfully", views));
        } catch (Exception e) {
            log.error("[Ingredients] load dish {} failed", dishId, e);
            return ResponseEntity.status(500)
                    .body(new NotificationResponse(false, "Lỗi tải công thức: " + e.getMessage()));
        }
    }

    @PostMapping("/{dishId}/ingredients")
    @Transactional
    public ResponseEntity<NotificationResponse> addIngredient(
            @PathVariable Long dishId,
            @Valid @RequestBody DishIngredientRequest request) {
        try {
            Dish dish = dishRepository.findById(dishId)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy món (id=" + dishId + ")"));
            Food food = foodRepository.findById(request.getFoodId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy thực phẩm (id=" + request.getFoodId() + ")"));

            // Tránh trùng (unique constraint dish+food) → báo lỗi thân thiện thay vì 500
            boolean exists = dishIngredientRepository.findByDishIdWithFood(dishId).stream()
                    .anyMatch(di -> di.getFood() != null
                            && di.getFood().getFoodId().equals(request.getFoodId()));
            if (exists) {
                return ResponseEntity.badRequest()
                        .body(new NotificationResponse(false, "Thực phẩm này đã có trong công thức món"));
            }

            DishIngredient ingredient = new DishIngredient();
            ingredient.setDish(dish);
            ingredient.setFood(food);
            ingredient.setIsCoreIngredient(request.getIsCoreIngredient() == null || request.getIsCoreIngredient());
            DishIngredient saved = dishIngredientRepository.save(ingredient);
            return ResponseEntity.ok(new NotificationResponse(true, "Dish ingredient added successfully", toView(saved)));
        } catch (Exception e) {
            log.error("[Ingredients] add to dish {} food {} failed", dishId, request.getFoodId(), e);
            return ResponseEntity.status(500)
                    .body(new NotificationResponse(false, "Lỗi thêm nguyên liệu: " + e.getMessage()));
        }
    }

    @PutMapping("/ingredients/{ingredientId}")
    @Transactional
    public ResponseEntity<NotificationResponse> updateIngredient(
            @PathVariable Long ingredientId,
            @Valid @RequestBody DishIngredientRequest request) {
        DishIngredient ingredient = dishIngredientRepository.findById(ingredientId)
                .orElseThrow(() -> new RuntimeException("Dish ingredient not found"));

        if (request.getFoodId() != null) {
            Food food = foodRepository.findById(request.getFoodId())
                    .orElseThrow(() -> new RuntimeException("Food not found"));
            ingredient.setFood(food);
        }
        if (request.getIsCoreIngredient() != null) {
            ingredient.setIsCoreIngredient(request.getIsCoreIngredient());
        }

        DishIngredient saved = dishIngredientRepository.save(ingredient);
        return ResponseEntity.ok(new NotificationResponse(true, "Dish ingredient updated successfully", toView(saved)));
    }

    @DeleteMapping("/ingredients/{ingredientId}")
    @Transactional
    public ResponseEntity<NotificationResponse> deleteIngredient(@PathVariable Long ingredientId) {
        if (!dishIngredientRepository.existsById(ingredientId)) {
            return ResponseEntity.status(404).body(new NotificationResponse(false, "Dish ingredient not found"));
        }
        dishIngredientRepository.deleteById(ingredientId);
        return ResponseEntity.ok(new NotificationResponse(true, "Dish ingredient deleted successfully"));
    }

    private void applyDishRequest(Dish dish, DishRequest request) {
        dish.setDishName(request.getDishName());
        dish.setImageUrl(request.getImageUrl());
        dish.setDishRole(Dish.DishRole.valueOf(request.getDishRole()));
        dish.setSuitableMealTypes(request.getSuitableMealTypes());
        dish.setIsActive(request.getIsActive() == null || request.getIsActive());
    }

    @Data
    public static class DishRequest {
        private String dishName;
        private String imageUrl;
        private String dishRole;
        private String suitableMealTypes;
        private Boolean isActive;
    }

    @Data
    public static class DishIngredientRequest {
        private Long foodId;
        private Boolean isCoreIngredient;
    }

    // Map gọn — tránh serialize entity Food (có @ElementCollection LAZY gây 500)
    private static Map<String, Object> toView(DishIngredient di) {
        Map<String, Object> m = new HashMap<>();
        m.put("dishIngredientId", di.getDishIngredientId());
        m.put("isCoreIngredient", di.getIsCoreIngredient());
        Food f = di.getFood();
        if (f != null) {
            Map<String, Object> fm = new HashMap<>();
            fm.put("foodId", f.getFoodId());
            fm.put("name", f.getName());
            m.put("food", fm);
        }
        return m;
    }
}
