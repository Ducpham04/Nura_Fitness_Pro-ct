package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.PaymentConfig;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentConfigRepository extends JpaRepository<PaymentConfig, Integer> {
}
