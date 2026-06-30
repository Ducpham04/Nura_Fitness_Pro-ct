package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.AiPromoCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AiPromoCodeRepository extends JpaRepository<AiPromoCode, Long> {
    Optional<AiPromoCode> findByCodeIgnoreCase(String code);
}
