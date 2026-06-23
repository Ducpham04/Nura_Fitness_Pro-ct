package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.PaymentRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentRequestRepository extends JpaRepository<PaymentRequest, Long> {
    List<PaymentRequest> findByStatusOrderByCreatedAtDesc(PaymentRequest.Status status);
    List<PaymentRequest> findAllByOrderByCreatedAtDesc();
    long countByStatus(PaymentRequest.Status status);
}
