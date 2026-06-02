package com.example.fitchallenge.DTO.TransactionDTO;

import lombok.Data;
import java.math.BigDecimal;
import java.time.ZonedDateTime;

@Data
  
public class TransactionResponse {
    private Long id;
    private Long userId;
    private String userName;
    private String type;
    private BigDecimal amount;
    private Integer points;
    private String reference;
    private String status;
    private String description;
    private ZonedDateTime createdAt;

    public TransactionResponse() {}

    public TransactionResponse(Long id, Long userId, String userName, String type, BigDecimal amount, Integer points, String reference, String status, String description, ZonedDateTime createdAt) {
        this.id = id;
        this.userId = userId;
        this.userName = userName;
        this.type = type;
        this.amount = amount;
        this.points = points;
        this.reference = reference;
        this.status = status;
        this.description = description;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public Integer getPoints() { return points; }
    public void setPoints(Integer points) { this.points = points; }
    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public ZonedDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(ZonedDateTime createdAt) { this.createdAt = createdAt; }
}
