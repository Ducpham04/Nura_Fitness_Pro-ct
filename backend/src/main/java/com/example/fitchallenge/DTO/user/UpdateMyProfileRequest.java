package com.example.fitchallenge.DTO.user;

import lombok.Data;

@Data
public class UpdateMyProfileRequest {
    private String fullName;
    private String email;
}
