package com.example.fitchallenge.DTO.SmartMealDTO;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FoodQtyAiDTO {

    @JsonProperty("food_id")
    private Long foodId;

    /**
     * Portion grams; backend scales macros from foods.*_per_100g.
     */
    private Double quantity;
}
