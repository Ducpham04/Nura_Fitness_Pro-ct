package com.example.fitchallenge.DTO.RewardDTO;

import lombok.Builder;
import lombok.Data;

import java.util.Date;
@Data
@Builder
public class AdminRewardDTO {
    private Long id ;
    private String name ;
    private String linkImage;
    private String description ;
    private Integer points ;
    private Integer total ;
    private String status ;
    private String externalPartner ;
    private Integer claimed ;
    private java.util.Date expireAt ;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getLinkImage() { return linkImage; }
    public void setLinkImage(String linkImage) { this.linkImage = linkImage; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Integer getPoints() { return points; }
    public void setPoints(Integer points) { this.points = points; }
    public Integer getTotal() { return total; }
    public void setTotal(Integer total) { this.total = total; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getExternalPartner() { return externalPartner; }
    public void setExternalPartner(String externalPartner) { this.externalPartner = externalPartner; }
    public Integer getClaimed() { return claimed; }
    public void setClaimed(Integer claimed) { this.claimed = claimed; }
    public java.util.Date getExpireAt() { return expireAt; }
    public void setExpireAt(java.util.Date expireAt) { this.expireAt = expireAt; }

    }
