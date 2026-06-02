package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.ZonedDateTime;

/**
 * Entity: BodyMetricHistory
 * 👉 Chức năng: Lưu lịch sử các chỉ số cơ thể của người dùng theo thời gian
 * (cân nặng, BMI, body fat, v.v.) để theo dõi tiến độ.
 */
@Entity
@Table(name = "body_metric_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BodyMetricHistory {

    /**
     * 🔑 Mã bản ghi lịch sử (Primary Key, tự tăng)
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "bmh_id")
    private Long bmhId;

    /**
     * 👤 Người dùng (khóa ngoại → users.user_id)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * ⚖️ Cân nặng (kg)
     * Precision: 6, Scale: 2 (ví dụ: 75.50 kg)
     */
    @Column(name = "weight_kg", precision = 6, scale = 2, nullable = false)
    private BigDecimal weightKg;

    /**
     * 📏 Chiều cao (cm)
     * Precision: 5, Scale: 2 (ví dụ: 175.00 cm)
     */
    @Column(name = "height_cm", precision = 5, scale = 2)
    private BigDecimal heightCm;

    /**
     * 📊 Chỉ số BMI (Body Mass Index)
     * Precision: 5, Scale: 2 (ví dụ: 24.50)
     */
    @Column(name = "bmi", precision = 5, scale = 2)
    private BigDecimal bmi;

    /**
     * 🎯 Tỷ lệ mỡ cơ thể (%)
     * Precision: 5, Scale: 2 (ví dụ: 15.50%)
     */
    @Column(name = "body_fat_pct", precision = 5, scale = 2)
    private BigDecimal bodyFatPct;

    /**
     * 💪 Khối lượng cơ (kg)
     * Precision: 6, Scale: 2
     */
    @Column(name = "muscle_mass_kg", precision = 6, scale = 2)
    private BigDecimal muscleMassKg;

    /**
     * 💧 Tỷ lệ nước trong cơ thể (%)
     * Precision: 5, Scale = 2
     */
    @Column(name = "water_pct", precision = 5, scale = 2)
    private BigDecimal waterPct;

    /**
     * � Vòng eo (cm) - Waist circumference
     */
    @Column(name = "waist_cm", precision = 5, scale = 2)
    private BigDecimal waistCm;

    /**
     * 📏 Vòng hông (cm) - Hip circumference
     */
    @Column(name = "hip_cm", precision = 5, scale = 2)
    private BigDecimal hipCm;

    /**
     * 📏 Vòng ngực (cm) - Chest circumference
     */
    @Column(name = "chest_cm", precision = 5, scale = 2)
    private BigDecimal chestCm;

    /**
     * 📏 Vòng tay (cm) - Arm circumference
     */
    @Column(name = "arm_cm", precision = 5, scale = 2)
    private BigDecimal armCm;

    /**
     * 📏 Vòng đùi (cm) - Thigh circumference
     */
    @Column(name = "thigh_cm", precision = 5, scale = 2)
    private BigDecimal thighCm;

    /**
     * 📊 Tỷ lệ eo/hông - Waist-to-Hip Ratio (tính từ waist/hip)
     */
    @Column(name = "waist_hip_ratio", precision = 4, scale = 2)
    private BigDecimal waistHipRatio;

    /**
     * 🔥 BMR tính toán (Basal Metabolic Rate)
     */
    @Column(name = "bmr_calculated", precision = 7, scale = 2)
    private BigDecimal bmrCalculated;

    /**
     * 🔥 TDEE tính toán (Total Daily Energy Expenditure)
     */
    @Column(name = "tdee_calculated", precision = 7, scale = 2)
    private BigDecimal tdeeCalculated;

    /**
     * 📱 Nguồn dữ liệu (USER_INPUT, DEVICE_SYNC, AI_ESTIMATE)
     */
    @Column(name = "source", length = 30)
    private String source;

    /**
     * 🔗 ID thiết bị (nếu sync từ smart scale, smart watch)
     */
    @Column(name = "device_id", length = 100)
    private String deviceId;

    /**
     * �📝 Ghi chú hoặc mô tả thêm
     */
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    /**
     * 📅 Ngày ghi nhận chỉ số
     * Mặc định là thời điểm hiện tại
     */
    @Column(name = "recorded_at", nullable = false)
    private ZonedDateTime recordedAt = ZonedDateTime.now();

    /**
     * 🕒 Ngày tạo bản ghi
     */
    @Column(name = "created_at")
    private ZonedDateTime createdAt = ZonedDateTime.now();

    /**
     * 🕒 Ngày cập nhật
     */
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;

    /**
     * 🗑️ Soft delete flag
     */
    @Column(name = "is_deleted")
    private Boolean isDeleted = false;

    /**
     * 🗑️ Thời điểm xóa (soft delete)
     */
    @Column(name = "deleted_at")
    private ZonedDateTime deletedAt;

    @PreUpdate
    protected void onUpdate() {
        updatedAt = ZonedDateTime.now();
    }

    /**
     * 🔄 Tính Waist-Hip Ratio tự động
     */
    public void calculateWaistHipRatio() {
        if (waistCm != null && hipCm != null && hipCm.compareTo(BigDecimal.ZERO) > 0) {
            this.waistHipRatio = waistCm.divide(hipCm, 2, BigDecimal.ROUND_HALF_UP);
        }
    }

    /**
     * 🔄 Phương thức khôi phục sau soft delete
     */
    public void restore() {
        this.isDeleted = false;
        this.deletedAt = null;
    }
    
    // Manual getters/setters for Lombok compatibility
    public Long getBmhId() {
        return bmhId;
    }
    
    public void setBmhId(Long bmhId) {
        this.bmhId = bmhId;
    }
    
    public User getUser() {
        return user;
    }
    
    public void setUser(User user) {
        this.user = user;
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
    
    public BigDecimal getWaistCm() {
        return waistCm;
    }
    
    public void setWaistCm(BigDecimal waistCm) {
        this.waistCm = waistCm;
    }
    
    public BigDecimal getHipCm() {
        return hipCm;
    }
    
    public void setHipCm(BigDecimal hipCm) {
        this.hipCm = hipCm;
    }
    
    public BigDecimal getChestCm() {
        return chestCm;
    }
    
    public void setChestCm(BigDecimal chestCm) {
        this.chestCm = chestCm;
    }
    
    public BigDecimal getArmCm() {
        return armCm;
    }
    
    public void setArmCm(BigDecimal armCm) {
        this.armCm = armCm;
    }
    
    public BigDecimal getThighCm() {
        return thighCm;
    }
    
    public void setThighCm(BigDecimal thighCm) {
        this.thighCm = thighCm;
    }
    
    public BigDecimal getWaistHipRatio() {
        return waistHipRatio;
    }
    
    public void setWaistHipRatio(BigDecimal waistHipRatio) {
        this.waistHipRatio = waistHipRatio;
    }
    
    public BigDecimal getBmrCalculated() {
        return bmrCalculated;
    }
    
    public void setBmrCalculated(BigDecimal bmrCalculated) {
        this.bmrCalculated = bmrCalculated;
    }
    
    public BigDecimal getTdeeCalculated() {
        return tdeeCalculated;
    }
    
    public void setTdeeCalculated(BigDecimal tdeeCalculated) {
        this.tdeeCalculated = tdeeCalculated;
    }
    
    public String getSource() {
        return source;
    }
    
    public void setSource(String source) {
        this.source = source;
    }
    
    public String getDeviceId() {
        return deviceId;
    }
    
    public void setDeviceId(String deviceId) {
        this.deviceId = deviceId;
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
    
    public ZonedDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(ZonedDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    public Boolean getIsDeleted() {
        return isDeleted;
    }
    
    public void setIsDeleted(Boolean isDeleted) {
        this.isDeleted = isDeleted;
    }
    
    public ZonedDateTime getDeletedAt() {
        return deletedAt;
    }
    
    public void setDeletedAt(ZonedDateTime deletedAt) {
        this.deletedAt = deletedAt;
    }
    
    // Manual builder method for Lombok compatibility
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private User user;
        private BigDecimal weightKg;
        private BigDecimal heightCm;
        private BigDecimal bodyFatPercent;
        private BigDecimal bmi;
        private BigDecimal muscleMassKg;
        private BigDecimal waterPct;
        private String notes;
        private ZonedDateTime recordedAt;
        private ZonedDateTime createdAt;
        private ZonedDateTime updatedAt;
        private Boolean isDeleted;
        private ZonedDateTime deletedAt;
        
        public Builder user(User user) {
            this.user = user;
            return this;
        }
        
        public Builder weightKg(BigDecimal weightKg) {
            this.weightKg = weightKg;
            return this;
        }
        
        public Builder heightCm(BigDecimal heightCm) {
            this.heightCm = heightCm;
            return this;
        }
        
        public Builder bodyFatPct(BigDecimal bodyFatPct) {
            this.bodyFatPercent = bodyFatPct;
            return this;
        }
        
        public Builder bmi(BigDecimal bmi) {
            this.bmi = bmi;
            return this;
        }
        
        public Builder muscleMassKg(BigDecimal muscleMassKg) {
            this.muscleMassKg = muscleMassKg;
            return this;
        }

        public Builder waterPct(BigDecimal waterPct) {
            this.waterPct = waterPct;
            return this;
        }

        public Builder recordedAt(ZonedDateTime recordedAt) {
            this.recordedAt = recordedAt;
            return this;
        }
        
        public Builder notes(String notes) {
            this.notes = notes;
            return this;
        }
        
        public Builder createdAt(ZonedDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }
        
        public Builder updatedAt(ZonedDateTime updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }
        
        public Builder isDeleted(Boolean isDeleted) {
            this.isDeleted = isDeleted;
            return this;
        }
        
        public Builder deletedAt(ZonedDateTime deletedAt) {
            this.deletedAt = deletedAt;
            return this;
        }
        
        public BodyMetricHistory build() {
            BodyMetricHistory history = new BodyMetricHistory();
            history.user = this.user;
            history.weightKg = this.weightKg;
            history.heightCm = this.heightCm;
            history.bodyFatPct = this.bodyFatPercent;
            history.bmi = this.bmi;
            history.muscleMassKg = this.muscleMassKg;
            history.waterPct = this.waterPct;
            history.notes = this.notes;
            history.recordedAt = this.recordedAt;
            history.createdAt = this.createdAt;
            history.updatedAt = this.updatedAt;
            history.isDeleted = this.isDeleted;
            history.deletedAt = this.deletedAt;
            return history;
        }
    }
}







