package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.Goals;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GoalRepository extends JpaRepository<Goals, Long> {


    boolean existsByName(String name);
}
