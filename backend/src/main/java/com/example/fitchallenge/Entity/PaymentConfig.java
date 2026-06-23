package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.ZonedDateTime;

@Entity
@Table(name = "payment_config")
@Getter @Setter @NoArgsConstructor
public class PaymentConfig {

    @Id
    private Integer id = 1;

    @Column(name = "qr_key", nullable = false)
    private String qrKey = "";

    @Column(name = "qr_url", nullable = false)
    private String qrUrl = "";

    @Column(name = "bank_info", nullable = false, columnDefinition = "TEXT")
    private String bankInfo = "";

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt = ZonedDateTime.now();
}
