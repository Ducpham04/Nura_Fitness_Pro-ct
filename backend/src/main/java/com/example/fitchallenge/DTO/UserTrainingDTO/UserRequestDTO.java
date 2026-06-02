package com.example.fitchallenge.DTO.UserTrainingDTO;

import lombok.Data;

import java.time.LocalDate;
@Data
public class UserRequestDTO {
    private Long userID  ;
    private Long trainingID ;
    private LocalDate startDate ;
    private LocalDate endDate ;
    
    // Manual getters/setters for Lombok compatibility
    public Long getUserID() {
        return userID;
    }
    
    public void setUserID(Long userID) {
        this.userID = userID;
    }
    
    public Long getTrainingID() {
        return trainingID;
    }
    
    public void setTrainingID(Long trainingID) {
        this.trainingID = trainingID;
    }
    
    public LocalDate getStartDate() {
        return startDate;
    }
    
    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }
    
    public LocalDate getEndDate() {
        return endDate;
    }
    
    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }
}
