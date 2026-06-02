package com.example.fitchallenge.DTO.PaymentDTO;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentWebhookRequest {
    private String transactionId;
    private String provider;
    private String status;
    private Double amount;
    private String currency;
    private String signature;
    private Long userId;
    private String paymentMethod;
    private String description;
    private Long timestamp;
}
