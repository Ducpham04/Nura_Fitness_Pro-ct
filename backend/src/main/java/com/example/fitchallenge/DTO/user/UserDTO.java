package com.example.fitchallenge.DTO.user;

import lombok.*;

import java.time.ZonedDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserDTO {
    private Long id;
    private String email;
    private String fullName;
    private String role;
    private String linkImage;
    private String profileImage; // Alias for linkImage for FE compatibility
    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;
    private ZonedDateTime lastLoginAt;
    private String status;
    

    

}
