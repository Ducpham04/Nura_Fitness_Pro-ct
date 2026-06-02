package com.example.fitchallenge.DTO.RewardRedemptionDTO;

import lombok.Data;
import java.time.ZonedDateTime;

@Data
public class RewardRedemptionResponse {
    private Long id;
    private String userName;
    private String rewardName;
    private String status;
    private ZonedDateTime createdAt;
    private ZonedDateTime fulfilledAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
    public String getRewardName() { return rewardName; }
    public void setRewardName(String rewardName) { this.rewardName = rewardName; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public ZonedDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(ZonedDateTime createdAt) { this.createdAt = createdAt; }
    public ZonedDateTime getFulfilledAt() { return fulfilledAt; }
    public void setFulfilledAt(ZonedDateTime fulfilledAt) { this.fulfilledAt = fulfilledAt; }
}
