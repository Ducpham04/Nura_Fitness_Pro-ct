package com.example.fitchallenge.service.impl;

import com.example.fitchallenge.DTO.LeaderboardDTO;
import com.example.fitchallenge.Entity.DailyTrainingLog;
import com.example.fitchallenge.Entity.User;
import com.example.fitchallenge.Entity.UserChallenge;
import com.example.fitchallenge.repository.UserChallengeRepository;
import com.example.fitchallenge.repository.User.UserRepository;
import com.example.fitchallenge.repository.DailyTrainingLogRepository;
import com.example.fitchallenge.service.LeaderboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Implementation của LeaderboardService
 */
@Transactional(readOnly = true)
@Service
@RequiredArgsConstructor
public class LeaderboardServiceImpl implements LeaderboardService {

    private final UserRepository userRepository;
    private final UserChallengeRepository userChallengeRepository;
    private final DailyTrainingLogRepository dailyTrainingLogRepository;

    @Override
    public List<LeaderboardDTO.LeaderboardEntryDTO> getGlobalLeaderboard(
            String category,
            String period,
            Integer limit,
            Long currentUserId
    ) {
        // 1. Lấy tất cả users active
        List<User> users = userRepository.findAll().stream()
                .filter(user -> user.getStatus() != null && "active".equalsIgnoreCase(user.getStatus()))
                .collect(Collectors.toList());

        // 2. Tính stats cho mỗi user và tạo entries
        List<LeaderboardDTO.LeaderboardEntryDTO> entries = users.stream()
                .map(user -> buildLeaderboardEntry(user, currentUserId, category))
                .collect(Collectors.toList());

        // 3. Filter theo period nếu cần
        if (period != null && !"all-time".equalsIgnoreCase(period)) {
            entries = filterByPeriod(entries, period);
        }

        // 4. Sort theo category
        Comparator<LeaderboardDTO.LeaderboardEntryDTO> comparator = getComparatorByCategory(category);
        entries.sort(comparator.reversed()); // Descending order

        // 5. Assign ranks và limit
        for (int i = 0; i < entries.size(); i++) {
            entries.get(i).setRank(i + 1);
        }

        // 6. Apply limit
        if (limit != null && limit > 0) {
            entries = entries.stream()
                    .limit(limit)
                    .collect(Collectors.toList());
        }

        return entries;
    }

    /**
     * Build leaderboard entry từ User entity
     */
    private LeaderboardDTO.LeaderboardEntryDTO buildLeaderboardEntry(User user, Long currentUserId, String category) {
        // Tính challengesCompleted
        long challengesCompleted = userChallengeRepository.findAll().stream()
                .filter(uc -> uc.getUser().getId().equals(user.getId()) && uc.getStatus() == UserChallenge.UserChallengeStatus.SUCCESS)
                .count();

        // Tính currentStreak
        int streak = calculateCurrentStreak(user.getId());

        // ✅ FIX: AI Score từ DailyTrainingLog (tổng score của tất cả completed logs)
        Integer aiScore = calculateTotalAIScore(user.getId());

        // Determine value based on category
        Integer value;
        if (category != null) {
            switch (category.toLowerCase()) {
                case "challenges":
                    value = (int) challengesCompleted;
                    break;
                case "streak":
                    value = streak;
                    break;
                case "points":
                default:
                    value = aiScore;
                    break;
            }
        } else {
            value = aiScore; // Default to points
        }

        LeaderboardDTO.LeaderboardEntryDTO entry = new LeaderboardDTO.LeaderboardEntryDTO();
        entry.setUserId(user.getId());
        entry.setUserName(user.getUserName());
        entry.setProfileImage(user.getLinkImage());
        entry.setAiScore(aiScore);
        entry.setChallengesCompleted((int) challengesCompleted);
        entry.setStreak(streak);
        entry.setValue(value);
        entry.setIsCurrentUser(currentUserId != null && user.getId().equals(currentUserId));
        return entry;
    }

    /**
     * ✅ Tính tổng AI Score từ DailyTrainingLog
     * Lấy tổng score của tất cả completed logs
     */
    private Integer calculateTotalAIScore(Long userId) {
        return dailyTrainingLogRepository.findByUser_Id(userId).stream()
                .filter(log -> log.getStatus() == DailyTrainingLog.DailyTrainingStatus.COMPLETED)
                .filter(log -> log.getScore() != null && log.getScore() > 0)
                .mapToInt(log -> log.getScore())
                .sum();
    }

    /**
     * Tính currentStreak cho user
     * Logic tương tự như trong UserServiceImpl
     */
    private int calculateCurrentStreak(Long userId) {
        List<UserChallenge> challenges = userChallengeRepository.findAll().stream()
                .filter(uc -> uc.getUser().getId().equals(userId) && uc.getStatus() == UserChallenge.UserChallengeStatus.SUCCESS)
                .filter(uc -> uc.getCompletedAt() != null)
                .sorted((a, b) -> b.getCompletedAt().compareTo(a.getCompletedAt()))
                .collect(Collectors.toList());

        if (challenges.isEmpty()) {
            return 0;
        }

        int streak = 0;
        LocalDate lastDate = null;
        LocalDate today = LocalDate.now();

        for (UserChallenge challenge : challenges) {
            LocalDate completedDate = challenge.getCompletedAt().toLocalDate();

            if (lastDate == null) {
                // Ngày đầu tiên
                if (completedDate.equals(today) || completedDate.equals(today.minusDays(1))) {
                    streak = 1;
                    lastDate = completedDate;
                } else {
                    break;
                }
            } else {
                // Kiểm tra ngày liên tiếp
                if (completedDate.equals(lastDate.minusDays(1))) {
                    streak++;
                    lastDate = completedDate;
                } else {
                    break;
                }
            }
        }

        return streak;
    }

    /**
     * Filter entries theo period
     */
    private List<LeaderboardDTO.LeaderboardEntryDTO> filterByPeriod(
            List<LeaderboardDTO.LeaderboardEntryDTO> entries,
            String period
    ) {
        ZonedDateTime startDate = getStartDate(period);
        if (startDate == null) {
            return entries;
        }

        // Filter users based on their activity in the period
        // For now, we'll return all entries (can be enhanced later)
        return entries;
    }

    /**
     * Get start date based on period
     */
    private ZonedDateTime getStartDate(String period) {
        if (period == null || "all-time".equalsIgnoreCase(period)) {
            return null;
        }

        ZonedDateTime now = ZonedDateTime.now(ZoneId.systemDefault());
        switch (period.toLowerCase()) {
            case "weekly":
                return now.minusWeeks(1);
            case "monthly":
                return now.minusMonths(1);
            default:
                return null;
        }
    }

    /**
     * Get comparator based on category
     */
    private Comparator<LeaderboardDTO.LeaderboardEntryDTO> getComparatorByCategory(String category) {
        if (category == null) {
            category = "points";
        }

        switch (category.toLowerCase()) {
            case "points":
                return Comparator.comparing(entry -> {
                    Integer score = entry.getAiScore();
                    return score != null ? score : 0;
                });
            case "challenges":
                return Comparator.comparing(entry -> {
                    Integer challenges = entry.getChallengesCompleted();
                    return challenges != null ? challenges : 0;
                });
            case "streak":
                return Comparator.comparing(entry -> {
                    Integer streak = entry.getStreak();
                    return streak != null ? streak : 0;
                });
            default:
                return Comparator.comparing(entry -> {
                    Integer score = entry.getAiScore();
                    return score != null ? score : 0;
                });
        }
    }
}

