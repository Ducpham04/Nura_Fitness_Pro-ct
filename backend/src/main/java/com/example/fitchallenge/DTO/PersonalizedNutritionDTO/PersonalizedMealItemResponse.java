package com.example.fitchallenge.DTO.PersonalizedNutritionDTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class PersonalizedMealItemResponse {
    private Long pmiId;
    private Long foodId;
    private String foodName;
    /** Grams consumed in this meal line */
    private BigDecimal quantityGrams;
    /** Matched user's fridge vocabulary to master food → no spend on line */
    private Boolean fromInventory;
    private Double lineCalories;
    private Double lineProtein;
    private Double lineCarbs;
    private Double lineFat;
    /** VND attributed to purchasing this line (0 if from inventory) */
    private Integer lineEstimatedCost;
}
