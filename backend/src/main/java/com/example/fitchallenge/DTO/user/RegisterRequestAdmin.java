package com.example.fitchallenge.DTO.user;

import lombok.Data;

@Data
public class RegisterRequestAdmin {
    private String fullName; // dùng thay cho fullname
    private String email;
    private String password;
    private Long roleId;
    private String status; // "active" | "inactive" — khoá/mở tài khoản (optional)

}
