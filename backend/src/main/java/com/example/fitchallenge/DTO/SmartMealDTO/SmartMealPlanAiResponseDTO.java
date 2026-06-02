package com.example.fitchallenge.DTO.SmartMealDTO;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Structured payload returned by POST /smart-meal-plan (FastAPI → Spring). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SmartMealPlanAiResponseDTO {

    @JsonProperty("plan_id")
    private String planId;

    private List<SmartMealSlotAiDTO> meals;
}
