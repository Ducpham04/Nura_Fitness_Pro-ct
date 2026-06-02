package com.example.fitchallenge.DTO.SmartMealDTO;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Slim catalog row passed to Gemini (IDs + readable names only; no invented macros). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FoodCatalogEntryDTO {

    @JsonProperty("food_id")
    private Long foodId;

    private String name;
}
