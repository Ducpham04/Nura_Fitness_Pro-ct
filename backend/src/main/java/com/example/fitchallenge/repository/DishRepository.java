package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.Dish;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DishRepository extends JpaRepository<Dish, Long> {

    @Query("""
        SELECT d FROM Dish d
        WHERE (d.isActive = true OR d.isActive IS NULL)
          AND d.dishRole = :role
        ORDER BY d.dishId ASC
    """)
    List<Dish> findActiveByRole(@Param("role") Dish.DishRole role, Pageable pageable);

    @Query("""
        SELECT d FROM Dish d
        WHERE (d.isActive = true OR d.isActive IS NULL)
        ORDER BY d.dishId ASC
    """)
    List<Dish> findActive(Pageable pageable);
}
