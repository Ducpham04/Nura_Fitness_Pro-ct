package com.example.fitchallenge.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Master dish catalog for the Hybrid Smart Meal flow.
 *
 * A Dish is the human-facing meal name ("Com ga healthy"). The LLM is allowed
 * to choose dishes only by dishId. It never invents ingredients or quantities.
 */
@Entity
@Table(
    name = "dishes",
    indexes = {
        @Index(name = "idx_dish_role", columnList = "dish_role"),
        @Index(name = "idx_dish_name", columnList = "dish_name")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Dish {

    public enum DishRole {
        MAIN_PROTEIN, SOUP, VEGETABLE, CARB_BASE, ONE_POT
    }

    public enum MealTypeTag {
        BREAKFAST, MAIN_COURSE, SNACK
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "dish_id")
    private Long dishId;

    @Column(name = "dish_name", nullable = false, length = 255)
    private String dishName;

    @Column(name = "image_url", length = 1000)
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "dish_role", nullable = false, length = 30)
    private DishRole dishRole;

    /**
     * Stored as CSV for low-risk migration and simple catalog filtering.
     * Example: "BREAKFAST,MAIN_COURSE".
     */
    @Column(name = "suitable_meal_types", length = 120)
    private String suitableMealTypes;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @JsonIgnore
    @OneToMany(mappedBy = "dish", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<DishIngredient> ingredients = new ArrayList<>();

    public boolean isSuitableFor(MealTypeTag mealType) {
        if (mealType == null) return false;
        if (suitableMealTypes == null || suitableMealTypes.isBlank()) return true;
        return suitableMealTypes.toUpperCase().contains(mealType.name());
    }
}
