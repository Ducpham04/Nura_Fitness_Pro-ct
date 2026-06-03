package com.example.fitchallenge.controller.Admin;



import com.example.fitchallenge.DTO.FoodDTO.FoodRequest;
import com.example.fitchallenge.service.FoodService;
import com.example.fitchallenge.config.NotificationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FoodController {

    private final FoodService foodService;

    @PostMapping("/admin/foods")
    public NotificationResponse createFood(@Valid @RequestBody FoodRequest request){
        log.debug("Received Food Request: {}", request);
        return foodService.createFood(request);
    }

    @PutMapping("/admin/foods/{id}")
    public NotificationResponse updateFood(@PathVariable Long id, @Valid @RequestBody FoodRequest request){
        return foodService.updateFood(id, request);
    }

    @DeleteMapping("/admin/foods/{id}")
    public NotificationResponse deleteFood(@PathVariable Long id){
        return foodService.deleteFood(id);
    }

    @GetMapping("/admin/foods/{id}")
    public NotificationResponse getFoodById(@PathVariable Long id){
        return foodService.getFoodById(id);
    }

    /** Danh sách thực phẩm cho trang admin (đồng bộ với POST/PUT/DELETE /admin/foods). */
    @GetMapping("/admin/foods")
    public NotificationResponse getAllFoodsAdmin(){
        return foodService.getAllFoods();
    }

    @GetMapping("/foods")
    public NotificationResponse getAllFoods(){
        return foodService.getAllFoods();
    }
}
