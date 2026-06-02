package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.PersonalizedMealItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PersonalizedMealItemRepository extends JpaRepository<PersonalizedMealItem, Long> {
}
