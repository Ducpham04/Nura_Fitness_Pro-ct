package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.PersonalizedMealItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PersonalizedMealItemRepository extends JpaRepository<PersonalizedMealItem, Long> {

    /** Xoá toàn bộ meal item tham chiếu tới food (food_id NOT NULL) — phục vụ admin xoá food. */
    @Modifying
    @Query("DELETE FROM PersonalizedMealItem pmi WHERE pmi.food.foodId = :foodId")
    void deleteByFoodId(@Param("foodId") Long foodId);
}
