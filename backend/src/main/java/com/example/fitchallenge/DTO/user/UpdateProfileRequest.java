package com.example.fitchallenge.DTO.user;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String userName;
    private String email;
    private String linkImage; // URL của avatar image
    
    // Manual getters/setters for Lombok compatibility
    public String getUserName() {
        return userName;
    }
    
    public void setUserName(String userName) {
        this.userName = userName;
    }
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public String getLinkImage() {
        return linkImage;
    }
    
    public void setLinkImage(String linkImage) {
        this.linkImage = linkImage;
    }
}



