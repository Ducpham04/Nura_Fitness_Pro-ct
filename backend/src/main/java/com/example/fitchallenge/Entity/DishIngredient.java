package com.example.fitchallenge.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

/**
 * Recipe table: links one Dish to the Food rows that Java may use when solving
 * grams/macros/costs. No quantity is stored here by design; quantities are
 * computed per user by SmartMealPlanService.
 */
@Entity
@Table(
    name = "dish_ingredients",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_dish_food", columnNames = {"dish_id", "food_id"})
    },
    indexes = {
        @Index(name = "idx_di_dish", columnList = "dish_id"),
        @Index(name = "idx_di_food", columnList = "food_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DishIngredient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "dish_ingredient_id")
    private Long dishIngredientId;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dish_id", nullable = false)
    private Dish dish;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "food_id", nullable = false)
    private Food food;

    @Column(name = "is_core_ingredient", nullable = false)
    private Boolean isCoreIngredient = true;
}
