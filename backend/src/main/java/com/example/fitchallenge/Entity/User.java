package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.ZonedDateTime;
import java.util.List;

@Entity
@Table(name="users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor

public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name="user_id")
    private Long id;
    @Column(name="username", nullable = false, unique = true, length = 100)
    private String userName;
    @Column(name="email", nullable = false, unique = true, length = 255)
    private String email;

    @Column(name="password", nullable = false, length = 255)
    private String password;

    @ManyToOne
    @JoinColumn(name="role_id")
    private Role role;


    @Column(name="link_image", length = 500)
    private String linkImage;

    @Column(name="created_at", updatable = false)
    private ZonedDateTime createdAt = ZonedDateTime.now();

    @Column(name="updated_at")
    private ZonedDateTime updatedAt;

    @Column(name="last_login_at")
    private ZonedDateTime lastLoginAt;

    @Column(name="points")
    private Integer points; // Ví điểm tiêu được — đổi thưởng trừ vào đây

    @Column(name="level_points")
    private Integer levelPoints; // XP tích luỹ — chỉ tăng, quyết định level (không bị trừ khi đổi quà)

    @Column(name="full_name")
    private String fullName;

    @Column(name="streak_count")
    private Integer streakCount = 0;

    @Column(name="is_active", length = 20)
    private String status;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<UserBodyProfile> userBodyProfiles;

    public UserBodyProfile getUserBodyProfile() {
        if (this.userBodyProfiles != null && !this.userBodyProfiles.isEmpty()) {
            return this.userBodyProfiles.get(this.userBodyProfiles.size() - 1);
        }
        return null;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = ZonedDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = ZonedDateTime.now();
    }
    
}

