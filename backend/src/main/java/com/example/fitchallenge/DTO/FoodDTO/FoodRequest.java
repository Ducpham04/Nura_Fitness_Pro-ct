package com.example.fitchallenge.DTO.FoodDTO;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FoodRequest {
    private String name;
    private Integer calories;
    private Double protein;
    private Double carbs ;
    private Double fat;
    private String notes;
    
    // Manual getters/setters for Lombok compatibility
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public Integer getCalories() {
        return calories;
    }
    
    public void setCalories(Integer calories) {
        this.calories = calories;
    }
    
    public Double getProtein() {
        return protein;
    }
    
    public void setProtein(Double protein) {
        this.protein = protein;
    }
    
    public Double getCarbs() {
        return carbs;
    }
    
    public void setCarbs(Double carbs) {
        this.carbs = carbs;
    }
    
    public Double getFat() {
        return fat;
    }
    
    public void setFat(Double fat) {
        this.fat = fat;
    }
    
    public String getNotes() {
        return notes;
    }
    
    public void setNotes(String notes) {
        this.notes = notes;
    }
}
