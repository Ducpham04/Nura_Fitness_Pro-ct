package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.ZonedDateTime;

/**
 * Entity: PlanVersionHistory
 * 👉 Chức năng: Lưu lịch sử version của plan để compare và revert
 * 💡 Đồng bộ với AI Service plan_versioning.py
 * 🎯 Cho phép user xem lại plan cũ, so sánh, và khôi phục
 */
@Entity
@Table(
    name = "plan_version_history",
    indexes = {
        @Index(name = "idx_pvh_user_plan", columnList = "user_id,plan_type,plan_id"),
        @Index(name = "idx_pvh_version", columnList = "version_number"),
        @Index(name = "idx_pvh_parent", columnList = "parent_version_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlanVersionHistory {

    /**
     * 🔑 Mã bản ghi (Primary Key, tự tăng)
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "pvh_id")
    private Long pvhId;

    /**
     * 👤 Người dùng (khóa ngoại → users.user_id)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * 📊 Loại plan
     * - NUTRITION: PersonalizedNutritionPlan
     * - WORKOUT: PersonalizedWorkoutDetail
     * - TRAINING: UserTraining
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "plan_type", length = 20, nullable = false)
    private PlanType planType;

    public enum PlanType {
        NUTRITION, WORKOUT, TRAINING
    }

    /**
     * 🔗 ID plan gốc (pnp_id, pwd_id, hoặc ut_id)
     */
    @Column(name = "plan_id", nullable = false)
    private Long planId;

    /**
     * 🔢 Số thứ tự version
     */
    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    /**
     * 🏷️ Version ID từ AI Service (nếu có)
     */
    @Column(name = "ai_version_id", length = 100)
    private String aiVersionId;

    /**
     * 🔗 Version cha (nếu đây là revision)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_version_id")
    private PlanVersionHistory parentVersion;

    /**
     * 📝 Mô tả thay đổi từ version trước
     */
    @Column(name = "change_summary", columnDefinition = "TEXT")
    private String changeSummary;

    /**
     * 📋 Data snapshot (JSON đầy đủ của plan tại thời điểm này)
     * Cho phép revert về version cũ
     */
    @Column(name = "plan_data_json", columnDefinition = "TEXT")
    private String planDataJson;

    /**
     * 📊 Diff so với version trước (optional)
     * Lưu sự khác biệt để hiển thị nhanh
     */
    @Column(name = "diff_json", columnDefinition = "TEXT")
    private String diffJson;

    /**
     * 💰 Chi phí tại version này (nếu là nutrition plan)
     */
    @Column(name = "estimated_cost")
    private Integer estimatedCost;

    /**
     * 🎯 Calories tại version này
     */
    @Column(name = "target_calories")
    private Double targetCalories;

    /**
     * 🥩 Protein tại version này
     */
    @Column(name = "target_protein")
    private Double targetProtein;

    /**
     * 📊 Trạng thái version
     * - ACTIVE: Version đang sử dụng
     * - ARCHIVED: Đã lưu trữ
     * - REVERTED: Đã revert về version khác
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private VersionStatus status = VersionStatus.ACTIVE;

    public enum VersionStatus {
        ACTIVE, ARCHIVED, REVERTED
    }

    /**
     * ✅ Là version hiện tại (latest)?
     */
    @Column(name = "is_current")
    private Boolean isCurrent = false;

    /**
     * 🕒 Thời điểm tạo version
     */
    @Column(name = "created_at")
    private ZonedDateTime createdAt = ZonedDateTime.now();

    /**
     * 🗑️ Soft delete flag
     */
    @Column(name = "is_deleted")
    private Boolean isDeleted = false;

    /**
     * 🗑️ Thời điểm xóa
     */
    @Column(name = "deleted_at")
    private ZonedDateTime deletedAt;

    /**
     * 🔄 Khôi phục sau soft delete
     */
    public void restore() {
        this.isDeleted = false;
        this.deletedAt = null;
    }

    /**
     * 📝 Tạo summary tự động nếu chưa có
     */
    public void generateSummary() {
        if (changeSummary == null || changeSummary.isEmpty()) {
            this.changeSummary = "Version " + versionNumber + " created at " + createdAt;
        }
    }
    
    // Manual getters/setters for Lombok compatibility
    public Long getPvhId() {
        return pvhId;
    }
    
    public void setPvhId(Long pvhId) {
        this.pvhId = pvhId;
    }
    
    public User getUser() {
        return user;
    }
    
    public void setUser(User user) {
        this.user = user;
    }
    
    public PlanType getPlanType() {
        return planType;
    }
    
    public void setPlanType(PlanType planType) {
        this.planType = planType;
    }
    
    public Long getPlanId() {
        return planId;
    }
    
    public void setPlanId(Long planId) {
        this.planId = planId;
    }
    
    public Integer getVersionNumber() {
        return versionNumber;
    }
    
    public void setVersionNumber(Integer versionNumber) {
        this.versionNumber = versionNumber;
    }
    
    public String getAiVersionId() {
        return aiVersionId;
    }
    
    public void setAiVersionId(String aiVersionId) {
        this.aiVersionId = aiVersionId;
    }
    
    public PlanVersionHistory getParentVersion() {
        return parentVersion;
    }
    
    public void setParentVersion(PlanVersionHistory parentVersion) {
        this.parentVersion = parentVersion;
    }
    
    public String getChangeSummary() {
        return changeSummary;
    }
    
    public void setChangeSummary(String changeSummary) {
        this.changeSummary = changeSummary;
    }
    
    public String getPlanDataJson() {
        return planDataJson;
    }
    
    public void setPlanDataJson(String planDataJson) {
        this.planDataJson = planDataJson;
    }
    
    public String getDiffJson() {
        return diffJson;
    }
    
    public void setDiffJson(String diffJson) {
        this.diffJson = diffJson;
    }
    
    public Integer getEstimatedCost() {
        return estimatedCost;
    }
    
    public void setEstimatedCost(Integer estimatedCost) {
        this.estimatedCost = estimatedCost;
    }
    
    public Double getTargetCalories() {
        return targetCalories;
    }
    
    public void setTargetCalories(Double targetCalories) {
        this.targetCalories = targetCalories;
    }
    
    public Double getTargetProtein() {
        return targetProtein;
    }
    
    public void setTargetProtein(Double targetProtein) {
        this.targetProtein = targetProtein;
    }
    
    public VersionStatus getStatus() {
        return status;
    }
    
    public void setStatus(VersionStatus status) {
        this.status = status;
    }
    
    public Boolean getIsCurrent() {
        return isCurrent;
    }
    
    public void setIsCurrent(Boolean isCurrent) {
        this.isCurrent = isCurrent;
    }
    
    public ZonedDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(ZonedDateTime createdAt) {
        this.createdAt = createdAt;
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
}
