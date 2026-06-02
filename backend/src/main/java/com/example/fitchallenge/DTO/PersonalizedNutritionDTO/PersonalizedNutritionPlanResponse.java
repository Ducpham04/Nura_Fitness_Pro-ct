package com.example.fitchallenge.DTO.PersonalizedNutritionDTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.ZonedDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class PersonalizedNutritionPlanResponse {
    private Long pnpId;
    private String aiPlanId;
    private Integer version;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer durationDays;
    private Integer targetBudgetPerDay;
    private Integer estimatedTotalCost;
    private Integer actualTotalCost;
    private Double targetCalories;
    private Double targetProtein;
    private Double targetCarbs;
    private Double targetFat;
    private String status;
    private Boolean isDeleted;
    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;

    public Long getPnpId() {
        return pnpId;
    }

    public void setPnpId(Long pnpId) {
        this.pnpId = pnpId;
    }

    public String getAiPlanId() {
        return aiPlanId;
    }

    public void setAiPlanId(String aiPlanId) {
        this.aiPlanId = aiPlanId;
    }

    public Integer getVersion() {
        return version;
    }

    public void setVersion(Integer version) {
        this.version = version;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public Integer getDurationDays() {
        return durationDays;
    }

    public void setDurationDays(Integer durationDays) {
        this.durationDays = durationDays;
    }

    public Integer getTargetBudgetPerDay() {
        return targetBudgetPerDay;
    }

    public void setTargetBudgetPerDay(Integer targetBudgetPerDay) {
        this.targetBudgetPerDay = targetBudgetPerDay;
    }

    public Integer getEstimatedTotalCost() {
        return estimatedTotalCost;
    }

    public void setEstimatedTotalCost(Integer estimatedTotalCost) {
        this.estimatedTotalCost = estimatedTotalCost;
    }

    public Integer getActualTotalCost() {
        return actualTotalCost;
    }

    public void setActualTotalCost(Integer actualTotalCost) {
        this.actualTotalCost = actualTotalCost;
    }

    public Double getTargetCalories() {
        return targetCalories;
    }

    public void setTargetCalories(Double targetCalories) {
        this.targetCalories = targetCalories;
    }

    public Double getTargetProtein() {
        return targetProtein;
    }

    public void setTargetProtein(Double targetProtein) {
        this.targetProtein = targetProtein;
    }

    public Double getTargetCarbs() {
        return targetCarbs;
    }

    public void setTargetCarbs(Double targetCarbs) {
        this.targetCarbs = targetCarbs;
    }

    public Double getTargetFat() {
        return targetFat;
    }

    public void setTargetFat(Double targetFat) {
        this.targetFat = targetFat;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Boolean getIsDeleted() {
        return isDeleted;
    }

    public void setIsDeleted(Boolean isDeleted) {
        this.isDeleted = isDeleted;
    }

    public ZonedDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(ZonedDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public ZonedDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(ZonedDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}

