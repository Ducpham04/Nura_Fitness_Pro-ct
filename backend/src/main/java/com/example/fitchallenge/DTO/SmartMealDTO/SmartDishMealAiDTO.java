package com.example.fitchallenge.DTO.SmartMealDTO;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SmartDishMealAiDTO {
    @JsonProperty("meal_type")
    private String mealType;

    /**
     * Strict zero-hallucination contract: each item contains only dish_id.
     */
    private List<SmartDishRefAiDTO> dishes;
}
