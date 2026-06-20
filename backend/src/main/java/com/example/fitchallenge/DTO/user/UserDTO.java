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

    // Gói AI hiện tại — để admin xem & quản lý ngay trên danh sách user
    private String aiPackageCode;             // FREE | PLUS | PRO ...
    private String aiPackageName;
    private Integer aiQuota;                  // -1 = không giới hạn
    private Integer aiUsed;
    private ZonedDateTime aiPackageExpiresAt; // null = miễn phí/không hết hạn
}
