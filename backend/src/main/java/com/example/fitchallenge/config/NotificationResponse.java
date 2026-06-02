package com.example.fitchallenge.config;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class NotificationResponse {

    private boolean success;
    private String message;
    private Object data;

    
    public boolean isSuccess() {
        return success;
    }
    
    public Object getData() {
        return data;
    }
    
    public void setData(Object data) {
        this.data = data;
    }
    
    // Constructor with 2 parameters for backward compatibility
    public NotificationResponse(boolean success, String message) {
        this.success = success;
        this.message = message;
        this.data = null;
    }
    
    public String getMessage() {
        return message;
    }
    
    public void setMessage(String message) {
        this.message = message;
    }
    
    public void setSuccess(boolean success) {
        this.success = success;
    }
}
