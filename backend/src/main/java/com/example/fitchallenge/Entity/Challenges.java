package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "challenges")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Challenges {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "challenge_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "goal_id")
    private Goals goal;

    @Column(name = "title", length = 200)
    private String title;

    // 🖼️ Ảnh bìa thử thách (đường dẫn tương đối, vd "uploads/img/abc.jpg")
    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "duration_days")
    private Integer durationDays = 7;

    @Column(name = "reward_points")
    private Integer rewardPoints = 0;

    @Column(name = "reward", length = 200)
    private String reward;

    @Column(name = "ai_rules_json", columnDefinition = "TEXT")
    private String aiRulesJson;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private Status status = Status.ACTIVE;

    public enum Status {
        ACTIVE, INACTIVE, DRAFT, COMPLETED
    }

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @ManyToMany
    @JoinTable(
            name = "challenge_exercises",
            joinColumns = @JoinColumn(name = "challenge_id"),
            inverseJoinColumns = @JoinColumn(name = "exercise_id")
    )
    @Builder.Default
    private Set<Exercise> exercises = new LinkedHashSet<>();

}
