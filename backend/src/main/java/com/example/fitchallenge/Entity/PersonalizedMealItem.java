package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * One line in a personalized meal: FK to master {@link Food} + portion grams.
 * Calories/cost/macros are derived in the service layer from {@code foods.*} columns.
 */
@Entity
@Table(
    name = "personalized_meal_items",
    indexes = {
        @Index(name = "idx_pmi_pmd", columnList = "pmd_id"),
        @Index(name = "idx_pmi_food", columnList = "food_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PersonalizedMealItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "pmi_id")
    private Long pmiId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pmd_id", nullable = false)
    private PersonalizedMealDetail mealDetail;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "food_id", nullable = false)
    private Food food;

    /**
     * Redundant but intentional for audit/query speed in the Hybrid flow:
     * detail.dish is the slot dish, item.dish tells which dish recipe produced
     * the ingredient line. Legacy rows may keep this null.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dish_id")
    private Dish dish;

    /**
     * Portion size in grams (quantity from AI × master per-100g facts).
     */
    @Column(name = "quantity_grams", nullable = false, precision = 10, scale = 2)
    private BigDecimal quantityGrams;

    /**
     * True when user's fridge/inventory phrase matched this catalog {@link Food}.
     */
    @Column(name = "from_inventory", nullable = false)
    private boolean fromInventory;

    @Column(name = "line_calories")
    private Double lineCalories;

    @Column(name = "line_protein")
    private Double lineProtein;

    @Column(name = "line_carbs")
    private Double lineCarbs;

    @Column(name = "line_fat")
    private Double lineFat;

    @Column(name = "line_cost_vnd")
    private Integer lineCostVnd;
}
