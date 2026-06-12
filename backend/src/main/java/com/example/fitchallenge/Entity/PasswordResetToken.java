package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.ZonedDateTime;

/**
 * Lưu token đặt lại mật khẩu — mỗi token dùng 1 lần, hết hạn sau 30 phút.
 */
@Entity
@Table(
    name = "password_reset_tokens",
    indexes = {
        @Index(name = "idx_prt_token", columnList = "token"),
        @Index(name = "idx_prt_user",  columnList = "user_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** UUID ngẫu nhiên — gửi trong link email */
    @Column(nullable = false, unique = true, length = 64)
    private String token;

    /** Hết hạn sau 30 phút kể từ khi tạo */
    @Column(nullable = false)
    private ZonedDateTime expiresAt;

    /** true khi đã dùng để đặt lại mật khẩu */
    @Column(nullable = false)
    private boolean used = false;

    @Column(nullable = false)
    private ZonedDateTime createdAt = ZonedDateTime.now();
}
