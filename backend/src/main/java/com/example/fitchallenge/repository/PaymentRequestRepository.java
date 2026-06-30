package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.PaymentRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRequestRepository extends JpaRepository<PaymentRequest, Long> {
    List<PaymentRequest> findByStatusOrderByCreatedAtDesc(PaymentRequest.Status status);
    List<PaymentRequest> findAllByOrderByCreatedAtDesc();
    long countByStatus(PaymentRequest.Status status);

    /** Idempotency: giao dịch SePay đã xử lý chưa. */
    Optional<PaymentRequest> findFirstByGatewayRef(String gatewayRef);

    /** Yêu cầu PENDING mới nhất của user cho 1 gói (đối soát webhook). */
    Optional<PaymentRequest> findFirstByUser_IdAndPackageIdAndStatusOrderByCreatedAtDesc(
            Long userId, Long packageId, PaymentRequest.Status status);

    /** Yêu cầu PENDING mới nhất của user (khi không xác định được gói từ nội dung CK). */
    Optional<PaymentRequest> findFirstByUser_IdAndStatusOrderByCreatedAtDesc(
            Long userId, PaymentRequest.Status status);
}
