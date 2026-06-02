package com.example.fitchallenge.service;

import com.example.fitchallenge.DTO.PaymentDTO.PaymentWebhookResponse;
import com.example.fitchallenge.config.NotificationResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;

public interface PaymentService {
    PaymentWebhookResponse processWebhook(Map<String, Object> webhookData, String provider, String signature, HttpServletRequest request);
    NotificationResponse createPaymentUrl(Long userId, Map<String, Object> paymentRequest);
    NotificationResponse getPaymentStatus(Long userId, String transactionId);
    NotificationResponse getPaymentHistory(Long userId, int page, int size);
    NotificationResponse cancelPayment(Long userId, String transactionId);
}
