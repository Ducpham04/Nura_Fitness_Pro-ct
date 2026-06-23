package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.ZonedDateTime;

@Entity
@Getter
@Setter
@Table(name = "payment_requests")
public class PaymentRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "package_id")
    private Long packageId;

    @Column(name = "package_code", length = 20)
    private String packageCode;

    @Column(name = "package_name", length = 100)
    private String packageName;

    @Column(name = "price_vnd")
    private int priceVnd;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private Status status = Status.PENDING;

    public enum Status { PENDING, APPROVED, REJECTED }

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "created_at", nullable = false)
    private ZonedDateTime createdAt = ZonedDateTime.now();

    @Column(name = "processed_at")
    private ZonedDateTime processedAt;

    @Column(name = "processed_note", length = 200)
    private String processedNote;
}
