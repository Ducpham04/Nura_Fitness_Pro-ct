package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZonedDateTime;

@Entity
@Table(name = "daily_nutrition_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyNutritionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "dnl_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "tracking_date", nullable = false)
    private LocalDate trackingDate;

    @Column(name = "meal_name")
    private String mealName;

    @Column(name = "meal_type")
    private String mealType; // BREAKFAST, LUNCH, DINNER, SNACK, OTHER

    @Column(name = "calories")
    private BigDecimal calories = BigDecimal.ZERO;

    @Column(name = "protein")
    private BigDecimal protein = BigDecimal.ZERO;

    @Column(name = "carbs")
    private BigDecimal carbs = BigDecimal.ZERO;

    @Column(name = "fat")
    private BigDecimal fat = BigDecimal.ZERO;

    @Column(name = "water_liters")
    private BigDecimal waterLiters = BigDecimal.ZERO;

    @Column(name = "cost")
    private Integer cost = 0;

    @Column(name = "created_at")
    private ZonedDateTime createdAt = ZonedDateTime.now();

    // Manual getters/setters for Lombok compatibility
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public LocalDate getTrackingDate() { return trackingDate; }
    public void setTrackingDate(LocalDate trackingDate) { this.trackingDate = trackingDate; }
    public BigDecimal getCalories() { return calories; }
    public void setCalories(BigDecimal calories) { this.calories = calories; }
    public BigDecimal getProtein() { return protein; }
    public void setProtein(BigDecimal protein) { this.protein = protein; }
    public BigDecimal getCarbs() { return carbs; }
    public void setCarbs(BigDecimal carbs) { this.carbs = carbs; }
    public BigDecimal getFat() { return fat; }
    public void setFat(BigDecimal fat) { this.fat = fat; }
}
