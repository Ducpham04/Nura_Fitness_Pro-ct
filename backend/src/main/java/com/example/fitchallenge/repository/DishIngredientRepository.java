package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.DishIngredient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface DishIngredientRepository extends JpaRepository<DishIngredient, Long> {

    @Query("""
        SELECT di FROM DishIngredient di
        JOIN FETCH di.dish d
        JOIN FETCH di.food f
        WHERE d.dishId IN :dishIds
        ORDER BY d.dishId ASC, di.isCoreIngredient DESC, di.dishIngredientId ASC
    """)
    List<DishIngredient> findByDishIdsWithFood(@Param("dishIds") Collection<Long> dishIds);

    @Query("""
        SELECT di FROM DishIngredient di
        JOIN FETCH di.dish d
        JOIN FETCH di.food f
        WHERE d.dishId = :dishId
        ORDER BY di.isCoreIngredient DESC, di.dishIngredientId ASC
    """)
    List<DishIngredient> findByDishIdWithFood(@Param("dishId") Long dishId);
}
