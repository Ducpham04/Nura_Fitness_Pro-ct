package com.example.fitchallenge.DTO.FoodDTO;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FoodResponse {
    private Long id;
    private String name;
    private Integer calories;
    private Double protein;
    private Double carbs;
    private Double fat;
    private String category;
    private Integer averageMarketPriceVnd;
    private String notes;
    
    // Manual getters/setters for Lombok compatibility
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
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

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Integer getAverageMarketPriceVnd() {
        return averageMarketPriceVnd;
    }

    public void setAverageMarketPriceVnd(Integer averageMarketPriceVnd) {
        this.averageMarketPriceVnd = averageMarketPriceVnd;
    }
    
    public String getNotes() {
        return notes;
    }
    
    public void setNotes(String notes) {
        this.notes = notes;
    }
}
