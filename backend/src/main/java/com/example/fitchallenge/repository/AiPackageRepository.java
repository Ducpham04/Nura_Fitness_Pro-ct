package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.AiPackage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AiPackageRepository extends JpaRepository<AiPackage, Long> {
    Optional<AiPackage> findByCode(String code);
    List<AiPackage> findByIsActiveTrueOrderBySortOrderAsc();
}
