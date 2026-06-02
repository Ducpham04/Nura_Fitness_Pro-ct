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
public class SmartDishDayAiDTO {
    @JsonProperty("day_number")
    private Integer dayNumber;

    private List<SmartDishMealAiDTO> meals;
}
