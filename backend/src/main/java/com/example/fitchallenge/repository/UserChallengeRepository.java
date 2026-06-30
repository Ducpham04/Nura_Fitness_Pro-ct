package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.UserChallenge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.ZonedDateTime;
import java.util.List;
import org.springframework.stereotype.Repository;

@Repository
public interface UserChallengeRepository extends JpaRepository<UserChallenge, Long> {
    @Query("SELECT uc FROM UserChallenge uc JOIN FETCH uc.user JOIN FETCH uc.challenge")
    List<UserChallenge> findAllWithUserAndChallenge();

    // Query methods for user profile and challenge participants
    List<UserChallenge> findByUser_Id(Long userId);
    List<UserChallenge> findByUser_IdAndStatus(Long userId, String status);
    List<UserChallenge> findByChallenge_Id(Long challengeId);
    List<UserChallenge> findByChallenge_IdAndStatus(Long challengeId, String status);
    long countByChallenge_Id(Long challengeId);
    long countByChallenge_IdAndStatus(Long challengeId, String status);

    // Dashboard: lọc submissions theo period — tránh findAll() toàn bảng
    List<UserChallenge> findBySubmittedAtAfter(ZonedDateTime since);

    // Dashboard: đếm theo status không cần load entity
    long countByStatus(UserChallenge.UserChallengeStatus status);

    @Query("SELECT COUNT(uc) FROM UserChallenge uc WHERE uc.submittedAt > :since AND uc.status = :status")
    long countBySubmittedAtAfterAndStatus(@Param("since") ZonedDateTime since,
                                          @Param("status") UserChallenge.UserChallengeStatus status);

    // ── getAiStats: COUNT queries thay thế findAll() ──────────────────────

    @Query("SELECT COUNT(uc) FROM UserChallenge uc WHERE uc.status <> :status")
    long countByStatusNot(@Param("status") UserChallenge.UserChallengeStatus status);

    @Query("SELECT COUNT(uc) FROM UserChallenge uc WHERE uc.submittedAt >= :since AND uc.status <> :status")
    long countBySubmittedAtAfterAndStatusNot(@Param("since") ZonedDateTime since,
                                             @Param("status") UserChallenge.UserChallengeStatus status);

    @Query("SELECT uc.user.id, COUNT(uc) FROM UserChallenge uc WHERE uc.user IS NOT NULL AND uc.status <> :status GROUP BY uc.user.id")
    List<Object[]> countNonPendingGroupByUser(@Param("status") UserChallenge.UserChallengeStatus status);

    List<UserChallenge> findTop20ByStatusNotAndSubmittedAtNotNullAndUserNotNullOrderBySubmittedAtDesc(
            UserChallenge.UserChallengeStatus status);
}
