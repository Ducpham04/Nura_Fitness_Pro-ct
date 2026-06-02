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
public class DishCatalogEntryDTO {
    @JsonProperty("dish_id")
    private Long dishId;

    @JsonProperty("dish_name")
    private String dishName;

    @JsonProperty("dish_role")
    private String dishRole;

    @JsonProperty("suitable_meal_types")
    private String suitableMealTypes;
}
