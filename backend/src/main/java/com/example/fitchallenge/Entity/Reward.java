package com.example.fitchallenge.Entity;



import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.time.ZonedDateTime;

/**
 * Bảng rewards:
 * Dùng để lưu thông tin các phần thưởng mà người dùng có thể đổi bằng điểm.
 * Mỗi phần thưởng có tên, mô tả, chi phí điểm và số lượng tồn kho.
 */
@Entity
@Table(name = "rewards")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reward {

    /**
     * 🔑 Mã phần thưởng (Primary Key)
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "reward_id")
    private Long rewardId;
    /**
     * 🖼️ Link hình ảnh đại diện phần thưởng (tùy chọn)
     */
    @Column(name = "link_image")
    private String linkImage;
    /**
     * 🎁 Tên phần thưởng (bắt buộc)
     */
    @Column(nullable = false, length = 200)
    private String name;

    /**
     * 📜 Mô tả chi tiết phần thưởng (tùy chọn)
     */


    private String description;

    /**
     * 💰 Số điểm cần để đổi phần thưởng (bắt buộc)
     */
    @Column(name = "cost_points")
    private Integer costPoints;

    /**
     * 📦 Số lượng phần thưởng còn trong kho (mặc định 0)
     */
    @Column(nullable = false)
    private Integer stock = 0;

    /**
     * 🤝 Đối tác hoặc nhà cung cấp phần thưởng (tùy chọn)
     */
    @Column(name = "external_partner", length = 200)
    private String externalPartner;

    /**
     * 🕒 Ngày tạo phần thưởng (tự động mặc định = now())
     */
    @Column(name = "created_at")
    private OffsetDateTime createdAt = OffsetDateTime.now();
    @Column(name = "expire_at")
    private ZonedDateTime expireAt;
    
    @Column (name = "Claimed")
    private Integer claimed = 0;
    
    /**
     * ⚙️ Trạng thái phần thưởng: active, inactive
     */
    @Column(name = "status", length = 20)
    private String status = "active";
    
    // Manual getters/setters for Lombok compatibility
    public Long getRewardId() {
        return rewardId;
    }
    
    public void setRewardId(Long rewardId) {
        this.rewardId = rewardId;
    }
    
    public String getLinkImage() {
        return linkImage;
    }
    
    public void setLinkImage(String linkImage) {
        this.linkImage = linkImage;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public Integer getCostPoints() {
        return costPoints;
    }
    
    public void setCostPoints(Integer costPoints) {
        this.costPoints = costPoints;
    }
    
    public Integer getStock() {
        return stock;
    }
    
    public void setStock(Integer stock) {
        this.stock = stock;
    }
    
    public String getExternalPartner() {
        return externalPartner;
    }
    
    public void setExternalPartner(String externalPartner) {
        this.externalPartner = externalPartner;
    }
    
    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public ZonedDateTime getExpireAt() {
        return expireAt;
    }
    
    public void setExpireAt(ZonedDateTime expireAt) {
        this.expireAt = expireAt;
    }
    
    public Integer getClaimed() {
        return claimed;
    }
    
    public void setClaimed(Integer claimed) {
        this.claimed = claimed;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }

    // Manual Builder
    public static RewardBuilder builder() {
        return new RewardBuilder();
    }

    public static class RewardBuilder {
        private final Reward instance = new Reward();
        public RewardBuilder rewardId(Long rewardId) { instance.setRewardId(rewardId); return this; }
        public RewardBuilder linkImage(String linkImage) { instance.setLinkImage(linkImage); return this; }
        public RewardBuilder name(String name) { instance.setName(name); return this; }
        public RewardBuilder description(String description) { instance.setDescription(description); return this; }
        public RewardBuilder costPoints(Integer costPoints) { instance.setCostPoints(costPoints); return this; }
        public RewardBuilder stock(Integer stock) { instance.setStock(stock); return this; }
        public RewardBuilder externalPartner(String externalPartner) { instance.setExternalPartner(externalPartner); return this; }
        public RewardBuilder createdAt(OffsetDateTime createdAt) { instance.setCreatedAt(createdAt); return this; }
        public RewardBuilder expireAt(ZonedDateTime expireAt) { instance.setExpireAt(expireAt); return this; }
        public RewardBuilder claimed(Integer claimed) { instance.setClaimed(claimed); return this; }
        public RewardBuilder status(String status) { instance.setStatus(status); return this; }
        public Reward build() { return instance; }
    }
}

