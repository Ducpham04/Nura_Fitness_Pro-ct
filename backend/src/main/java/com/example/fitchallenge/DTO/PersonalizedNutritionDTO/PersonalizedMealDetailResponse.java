package com.example.fitchallenge.DTO.PersonalizedNutritionDTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class PersonalizedMealDetailResponse {
    private Long pmdId;
    private Integer dayNumber;
    private String mealType;
    private String mealName;
    private String imageUrl; // Ảnh đại diện món (ưu tiên dish, fallback food)
    /** Legacy AI JSON snapshot; preferred: {@link #mealItems}. */
    private String mealItemsJson;

    /** Normalized lines from foods master table */
    private List<PersonalizedMealItemResponse> mealItems;
    private Double totalCalories;
    private Double totalProtein;
    private Double totalCarbs;
    private Double totalFat;
    private Integer estimatedCost;
    private Integer prepTimeMinutes;
    private String cookingInstructions;
    private Boolean wasEaten;
    private Integer userRating;
    private String userFeedback;
    private String skipReason;
    private String aiPromptVersion;
    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;

    public Long getPmdId() {
        return pmdId;
    }

    public void setPmdId(Long pmdId) {
        this.pmdId = pmdId;
    }

    public Integer getDayNumber() {
        return dayNumber;
    }

    public void setDayNumber(Integer dayNumber) {
        this.dayNumber = dayNumber;
    }

    public String getMealType() {
        return mealType;
    }

    public void setMealType(String mealType) {
        this.mealType = mealType;
    }

    public String getMealName() {
        return mealName;
    }

    public void setMealName(String mealName) {
        this.mealName = mealName;
    }

    public String getMealItemsJson() {
        return mealItemsJson;
    }

    public void setMealItemsJson(String mealItemsJson) {
        this.mealItemsJson = mealItemsJson;
    }

    public List<PersonalizedMealItemResponse> getMealItems() {
        return mealItems;
    }

    public void setMealItems(List<PersonalizedMealItemResponse> mealItems) {
        this.mealItems = mealItems;
    }

    public Double getTotalCalories() {
        return totalCalories;
    }

    public void setTotalCalories(Double totalCalories) {
        this.totalCalories = totalCalories;
    }

    public Double getTotalProtein() {
        return totalProtein;
    }

    public void setTotalProtein(Double totalProtein) {
        this.totalProtein = totalProtein;
    }

    public Double getTotalCarbs() {
        return totalCarbs;
    }

    public void setTotalCarbs(Double totalCarbs) {
        this.totalCarbs = totalCarbs;
    }

    public Double getTotalFat() {
        return totalFat;
    }

    public void setTotalFat(Double totalFat) {
        this.totalFat = totalFat;
    }

    public Integer getEstimatedCost() {
        return estimatedCost;
    }

    public void setEstimatedCost(Integer estimatedCost) {
        this.estimatedCost = estimatedCost;
    }

    public Integer getPrepTimeMinutes() {
        return prepTimeMinutes;
    }

    public void setPrepTimeMinutes(Integer prepTimeMinutes) {
        this.prepTimeMinutes = prepTimeMinutes;
    }

    public String getCookingInstructions() {
        return cookingInstructions;
    }

    public void setCookingInstructions(String cookingInstructions) {
        this.cookingInstructions = cookingInstructions;
    }

    public Boolean getWasEaten() {
        return wasEaten;
    }

    public void setWasEaten(Boolean wasEaten) {
        this.wasEaten = wasEaten;
    }

    public Integer getUserRating() {
        return userRating;
    }

    public void setUserRating(Integer userRating) {
        this.userRating = userRating;
    }

    public String getUserFeedback() {
        return userFeedback;
    }

    public void setUserFeedback(String userFeedback) {
        this.userFeedback = userFeedback;
    }

    public String getSkipReason() {
        return skipReason;
    }

    public void setSkipReason(String skipReason) {
        this.skipReason = skipReason;
    }

    public String getAiPromptVersion() {
        return aiPromptVersion;
    }

    public void setAiPromptVersion(String aiPromptVersion) {
        this.aiPromptVersion = aiPromptVersion;
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
