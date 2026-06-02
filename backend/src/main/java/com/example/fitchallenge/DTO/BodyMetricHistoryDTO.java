package com.example.fitchallenge.DTO;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.ZonedDateTime;

/**
 * DTO cho Body Metric History API
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BodyMetricHistoryDTO {
    private Long bmhId;
    private Long userId;
    
    // Metrics
    private BigDecimal weightKg;
    private BigDecimal heightCm;
    private BigDecimal bmi;
    private BigDecimal bodyFatPct;
    private BigDecimal muscleMassKg;
    private BigDecimal waterPct;
    // Số đo vòng (cm) — phục vụ tính WHR & Navy body fat
    private BigDecimal waistCm;
    private BigDecimal hipCm;
    private BigDecimal chestCm;
    private BigDecimal armCm;
    private BigDecimal thighCm;
    // Chỉ số dẫn xuất (backend tự tính)
    private BigDecimal waistHipRatio;
    private BigDecimal bmrCalculated;
    private BigDecimal tdeeCalculated;
    private String notes;

    // Timestamps - Accept ISO string format
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSSXXX")
    private ZonedDateTime recordedAt;
    
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSSXXX")
    private ZonedDateTime createdAt;
    
    // Manual getters/setters for Lombok compatibility
    public Long getBmhId() {
        return bmhId;
    }
    
    public void setBmhId(Long bmhId) {
        this.bmhId = bmhId;
    }
    
    public Long getUserId() {
        return userId;
    }
    
    public void setUserId(Long userId) {
        this.userId = userId;
    }
    
    public BigDecimal getWeightKg() {
        return weightKg;
    }
    
    public void setWeightKg(BigDecimal weightKg) {
        this.weightKg = weightKg;
    }
    
    public BigDecimal getHeightCm() {
        return heightCm;
    }
    
    public void setHeightCm(BigDecimal heightCm) {
        this.heightCm = heightCm;
    }
    
    public BigDecimal getBmi() {
        return bmi;
    }
    
    public void setBmi(BigDecimal bmi) {
        this.bmi = bmi;
    }
    
    public BigDecimal getBodyFatPct() {
        return bodyFatPct;
    }
    
    public void setBodyFatPct(BigDecimal bodyFatPct) {
        this.bodyFatPct = bodyFatPct;
    }
    
    public BigDecimal getMuscleMassKg() {
        return muscleMassKg;
    }
    
    public void setMuscleMassKg(BigDecimal muscleMassKg) {
        this.muscleMassKg = muscleMassKg;
    }
    
    public BigDecimal getWaterPct() {
        return waterPct;
    }
    
    public void setWaterPct(BigDecimal waterPct) {
        this.waterPct = waterPct;
    }
    
    public String getNotes() {
        return notes;
    }
    
    public void setNotes(String notes) {
        this.notes = notes;
    }
    
    public ZonedDateTime getRecordedAt() {
        return recordedAt;
    }
    
    public void setRecordedAt(ZonedDateTime recordedAt) {
        this.recordedAt = recordedAt;
    }
    
    public ZonedDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(ZonedDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

