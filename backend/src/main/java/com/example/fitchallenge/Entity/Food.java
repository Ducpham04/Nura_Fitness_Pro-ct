package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.Set;

@Entity
@Table(name = "foods")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Food {

    public enum FoodCategory {
        FIBER, PROTEIN, CARB, FAT
    }

    public enum ServingUnit {
        GRAM, PIECE
    }

    public enum PrepState {
        RAW, COOKED
    }

    public enum CookingMethod {
        RAW, BOILED, FRIED, STEAMED, GRILLED, COOKED
    }

    public enum AllergenType {
        GLUTEN, DAIRY, NUTS, SEAFOOD, EGGS, SOY, PEANUTS, SHELLFISH
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "food_id")
    private Long foodId;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "calories_per_100g")
    private Integer caloriesPer100g;

    @Column(name = "protein_per_100g", precision = 5, scale = 2)
    private BigDecimal proteinPer100g;

    @Column(name = "carbs_per_100g", precision = 5, scale = 2)
    private BigDecimal carbsPer100g;

    @Column(name = "fat_per_100g", precision = 5, scale = 2)
    private BigDecimal fatPer100g;

    // 💰 Giá trung bình trên thị trường VN (VND per 100g hoặc per unit)
    @Column(name = "average_market_price_vnd")
    private Integer averageMarketPriceVnd;

    // 🏷️ Phân loại thực phẩm (PROTEIN, CARB, VEGETABLE, FRUIT, FAT, DAIRY)
    @Column(name = "category", length = 30)
    private String category;

    /**
     * Hybrid Smart Meal fields. Kept additive so legacy services that read
     * category as String continue to work during migration.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "serving_unit", length = 20)
    private ServingUnit servingUnit = ServingUnit.GRAM;

    @Column(name = "grams_per_piece", precision = 8, scale = 2)
    private BigDecimal gramsPerPiece;

    @Enumerated(EnumType.STRING)
    @Column(name = "prep_state", length = 20)
    private PrepState prepState = PrepState.COOKED;

    @Column(name = "is_vegan")
    private Boolean isVegan = false;

    private String notes;

    // ─── Phase 2 Fields ────────────────────────────────────────────────────

    @Column(name = "fiber_per_100g", precision = 5, scale = 2)
    private BigDecimal fiberPer100g;

    @Column(name = "sugar_per_100g", precision = 5, scale = 2)
    private BigDecimal sugarPer100g;

    @Column(name = "sodium_per_100mg", precision = 7, scale = 2)
    private BigDecimal sodiumPer100mg;

    /**
     * CSV of meal types where this food is appropriate.
     * Values: BREAKFAST, LUNCH, DINNER, SNACK.
     * AI meal planner uses this to ensure realistic meal generation.
     */
    @Column(name = "meal_type_tags", length = 100)
    private String mealTypeTags;

    @Column(name = "vietnamese_name", length = 200)
    private String vietnameseName;

    @Enumerated(EnumType.STRING)
    @Column(name = "cooking_method", length = 20)
    private CookingMethod cookingMethod;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
            name = "food_allergens",
            joinColumns = @JoinColumn(name = "food_id")
    )
    @Column(name = "allergen")
    @Enumerated(EnumType.STRING)
    private Set<AllergenType> allergens;

    // ─── Phase 3 Fields ────────────────────────────────────────────────────
    @Column(name = "image_url", length = 500)
    private String imageUrl;
    
    // Manual getters/setters for Lombok compatibility
    public Long getFoodId() {
        return foodId;
    }
    
    public void setFoodId(Long foodId) {
        this.foodId = foodId;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public Integer getCaloriesPer100g() {
        return caloriesPer100g;
    }
    
    public void setCaloriesPer100g(Integer caloriesPer100g) {
        this.caloriesPer100g = caloriesPer100g;
    }
    
    public BigDecimal getProteinPer100g() {
        return proteinPer100g;
    }
    
    public void setProteinPer100g(BigDecimal proteinPer100g) {
        this.proteinPer100g = proteinPer100g;
    }
    
    public BigDecimal getCarbsPer100g() {
        return carbsPer100g;
    }
    
    public void setCarbsPer100g(BigDecimal carbsPer100g) {
        this.carbsPer100g = carbsPer100g;
    }
    
    public BigDecimal getFatPer100g() {
        return fatPer100g;
    }
    
    public void setFatPer100g(BigDecimal fatPer100g) {
        this.fatPer100g = fatPer100g;
    }
    
    public Integer getAverageMarketPriceVnd() {
        return averageMarketPriceVnd;
    }
    
    public void setAverageMarketPriceVnd(Integer averageMarketPriceVnd) {
        this.averageMarketPriceVnd = averageMarketPriceVnd;
    }
    
    public String getCategory() {
        return category;
    }
    
    public void setCategory(String category) {
        this.category = category;
    }

    public FoodCategory getFoodCategoryEnum() {
        if (category == null || category.isBlank()) {
            return FoodCategory.FIBER;
        }
        try {
            return FoodCategory.valueOf(category.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            String lower = category.toLowerCase();
            if (lower.contains("protein") || lower.contains("meat") || lower.contains("fish") || lower.contains("egg")) {
                return FoodCategory.PROTEIN;
            }
            if (lower.contains("carb") || lower.contains("rice") || lower.contains("grain") || lower.contains("starch")) {
                return FoodCategory.CARB;
            }
            if (lower.contains("fat") || lower.contains("oil") || lower.contains("nut")) {
                return FoodCategory.FAT;
            }
            return FoodCategory.FIBER;
        }
    }

    public ServingUnit getServingUnit() {
        return servingUnit != null ? servingUnit : ServingUnit.GRAM;
    }

    public void setServingUnit(ServingUnit servingUnit) {
        this.servingUnit = servingUnit;
    }

    public BigDecimal getGramsPerPiece() {
        return gramsPerPiece;
    }

    public void setGramsPerPiece(BigDecimal gramsPerPiece) {
        this.gramsPerPiece = gramsPerPiece;
    }

    public PrepState getPrepState() {
        return prepState;
    }

    public void setPrepState(PrepState prepState) {
        this.prepState = prepState;
    }

    public Boolean getIsVegan() {
        return isVegan;
    }

    public void setIsVegan(Boolean isVegan) {
        this.isVegan = isVegan;
    }
    
    public String getNotes() {
        return notes;
    }
    
    public void setNotes(String notes) {
        this.notes = notes;
    }
    
    public BigDecimal getFiberPer100g() {
        return fiberPer100g;
    }

    public void setFiberPer100g(BigDecimal fiberPer100g) {
        this.fiberPer100g = fiberPer100g;
    }

    public BigDecimal getSugarPer100g() {
        return sugarPer100g;
    }

    public void setSugarPer100g(BigDecimal sugarPer100g) {
        this.sugarPer100g = sugarPer100g;
    }

    public BigDecimal getSodiumPer100mg() {
        return sodiumPer100mg;
    }

    public void setSodiumPer100mg(BigDecimal sodiumPer100mg) {
        this.sodiumPer100mg = sodiumPer100mg;
    }

    public String getMealTypeTags() {
        return mealTypeTags;
    }

    public void setMealTypeTags(String mealTypeTags) {
        this.mealTypeTags = mealTypeTags;
    }

    public String getVietnameseName() {
        return vietnameseName;
    }

    public void setVietnameseName(String vietnameseName) {
        this.vietnameseName = vietnameseName;
    }

    public CookingMethod getCookingMethod() {
        return cookingMethod;
    }

    public void setCookingMethod(CookingMethod cookingMethod) {
        this.cookingMethod = cookingMethod;
    }

    public Set<AllergenType> getAllergens() {
        return allergens;
    }

    public void setAllergens(Set<AllergenType> allergens) {
        this.allergens = allergens;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }
}
