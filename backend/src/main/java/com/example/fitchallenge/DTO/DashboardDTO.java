package com.example.fitchallenge.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * DTOs cho Dashboard Statistics
 */
public class DashboardDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserStatsResponse {
        private Long totalUsers;
        private Long activeUsers;
        private Long inactiveUsers;
        private Long bannedUsers;
        private List<DailyUserCount> dailyNewUsers; // Biểu đồ người dùng mới
        private List<DailyActiveUsers> dailyActiveUsers; // Số user active theo ngày
        
        // Manual getters/setters for Lombok compatibility
        public Long getTotalUsers() { return totalUsers; }
        public void setTotalUsers(Long totalUsers) { this.totalUsers = totalUsers; }
        public Long getActiveUsers() { return activeUsers; }
        public void setActiveUsers(Long activeUsers) { this.activeUsers = activeUsers; }
        public Long getInactiveUsers() { return inactiveUsers; }
        public void setInactiveUsers(Long inactiveUsers) { this.inactiveUsers = inactiveUsers; }
        public Long getBannedUsers() { return bannedUsers; }
        public void setBannedUsers(Long bannedUsers) { this.bannedUsers = bannedUsers; }
        public List<DailyUserCount> getDailyNewUsers() { return dailyNewUsers; }
        public void setDailyNewUsers(List<DailyUserCount> dailyNewUsers) { this.dailyNewUsers = dailyNewUsers; }
        public List<DailyActiveUsers> getDailyActiveUsers() { return dailyActiveUsers; }
        public void setDailyActiveUsers(List<DailyActiveUsers> dailyActiveUsers) { this.dailyActiveUsers = dailyActiveUsers; }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyUserCount {
        private String date;
        private Long count;
        
        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        public Long getCount() { return count; }
        public void setCount(Long count) { this.count = count; }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyActiveUsers {
        private String date;
        private Long count;
        
        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        public Long getCount() { return count; }
        public void setCount(Long count) { this.count = count; }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChallengeStatsResponse {
        private Long totalChallenges;
        private Long activeChallenges;
        private Long totalSubmissions;
        private Long completedSubmissions;
        private Long pendingSubmissions;
        private Long failedSubmissions;
        private BigDecimal averageScore; // Điểm trung bình AI
        private BigDecimal averageConfidence; // Độ tin cậy trung bình
        private List<DailyChallengeCount> dailyCompleted; // Số challenge completed theo ngày
        
        public Long getTotalChallenges() { return totalChallenges; }
        public void setTotalChallenges(Long totalChallenges) { this.totalChallenges = totalChallenges; }
        public Long getActiveChallenges() { return activeChallenges; }
        public void setActiveChallenges(Long activeChallenges) { this.activeChallenges = activeChallenges; }
        public Long getTotalSubmissions() { return totalSubmissions; }
        public void setTotalSubmissions(Long totalSubmissions) { this.totalSubmissions = totalSubmissions; }
        public Long getCompletedSubmissions() { return completedSubmissions; }
        public void setCompletedSubmissions(Long completedSubmissions) { this.completedSubmissions = completedSubmissions; }
        public Long getPendingSubmissions() { return pendingSubmissions; }
        public void setPendingSubmissions(Long pendingSubmissions) { this.pendingSubmissions = pendingSubmissions; }
        public Long getFailedSubmissions() { return failedSubmissions; }
        public void setFailedSubmissions(Long failedSubmissions) { this.failedSubmissions = failedSubmissions; }
        public BigDecimal getAverageScore() { return averageScore; }
        public void setAverageScore(BigDecimal averageScore) { this.averageScore = averageScore; }
        public BigDecimal getAverageConfidence() { return averageConfidence; }
        public void setAverageConfidence(BigDecimal averageConfidence) { this.averageConfidence = averageConfidence; }
        public List<DailyChallengeCount> getDailyCompleted() { return dailyCompleted; }
        public void setDailyCompleted(List<DailyChallengeCount> dailyCompleted) { this.dailyCompleted = dailyCompleted; }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyChallengeCount {
        private String date;
        private Long count;
        
        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        public Long getCount() { return count; }
        public void setCount(Long count) { this.count = count; }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrainingStatsResponse {
        private Long totalPlans;
        private Long activePlans;
        private Long totalParticipants;
        private Long completedParticipants;
        private Double averageCompletionRate; // Tỷ lệ hoàn thành trung bình
        private List<PlanCompletionStats> topCompletedPlans;
        
        public Long getTotalPlans() { return totalPlans; }
        public void setTotalPlans(Long totalPlans) { this.totalPlans = totalPlans; }
        public Long getActivePlans() { return activePlans; }
        public void setActivePlans(Long activePlans) { this.activePlans = activePlans; }
        public Long getTotalParticipants() { return totalParticipants; }
        public void setTotalParticipants(Long totalParticipants) { this.totalParticipants = totalParticipants; }
        public Long getCompletedParticipants() { return completedParticipants; }
        public void setCompletedParticipants(Long completedParticipants) { this.completedParticipants = completedParticipants; }
        public Double getAverageCompletionRate() { return averageCompletionRate; }
        public void setAverageCompletionRate(Double averageCompletionRate) { this.averageCompletionRate = averageCompletionRate; }
        public List<PlanCompletionStats> getTopCompletedPlans() { return topCompletedPlans; }
        public void setTopCompletedPlans(List<PlanCompletionStats> topCompletedPlans) { this.topCompletedPlans = topCompletedPlans; }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PlanCompletionStats {
        private Long planId;
        private String planTitle;
        private Long totalParticipants;
        private Long completedCount;
        private Double completionRate;
        
        public Long getPlanId() { return planId; }
        public void setPlanId(Long planId) { this.planId = planId; }
        public String getPlanTitle() { return planTitle; }
        public void setPlanTitle(String planTitle) { this.planTitle = planTitle; }
        public Long getTotalParticipants() { return totalParticipants; }
        public void setTotalParticipants(Long totalParticipants) { this.totalParticipants = totalParticipants; }
        public Long getCompletedCount() { return completedCount; }
        public void setCompletedCount(Long completedCount) { this.completedCount = completedCount; }
        public Double getCompletionRate() { return completionRate; }
        public void setCompletionRate(Double completionRate) { this.completionRate = completionRate; }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NutritionStatsResponse {
        private Long totalPlans;
        private Long activePlans;
        private Long totalParticipants;
        private BigDecimal averageDailyCalories; // Lượng calories trung bình user tiêu thụ
        private Long totalMealsCompleted; // Số meal completed
        private List<DailyMealCount> dailyMealsCompleted; // Số meal completed theo ngày
        
        public Long getTotalPlans() { return totalPlans; }
        public void setTotalPlans(Long totalPlans) { this.totalPlans = totalPlans; }
        public Long getActivePlans() { return activePlans; }
        public void setActivePlans(Long activePlans) { this.activePlans = activePlans; }
        public Long getTotalParticipants() { return totalParticipants; }
        public void setTotalParticipants(Long totalParticipants) { this.totalParticipants = totalParticipants; }
        public BigDecimal getAverageDailyCalories() { return averageDailyCalories; }
        public void setAverageDailyCalories(BigDecimal averageDailyCalories) { this.averageDailyCalories = averageDailyCalories; }
        public Long getTotalMealsCompleted() { return totalMealsCompleted; }
        public void setTotalMealsCompleted(Long totalMealsCompleted) { this.totalMealsCompleted = totalMealsCompleted; }
        public List<DailyMealCount> getDailyMealsCompleted() { return dailyMealsCompleted; }
        public void setDailyMealsCompleted(List<DailyMealCount> dailyMealsCompleted) { this.dailyMealsCompleted = dailyMealsCompleted; }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyMealCount {
        private String date;
        private Long count;
        
        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        public Long getCount() { return count; }
        public void setCount(Long count) { this.count = count; }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RewardStatsResponse {
        private Long totalRewards;
        private Long activeRewards;
        private Long totalRedemptions;
        private Long pendingRedemptions;
        private Long fulfilledRedemptions;
        private List<TopReward> topRewards; // Top reward được đổi nhiều nhất
        private List<DailyRedemptionCount> dailyRedemptions; // Reward redemption chart
        
        public Long getTotalRewards() { return totalRewards; }
        public void setTotalRewards(Long totalRewards) { this.totalRewards = totalRewards; }
        public Long getActiveRewards() { return activeRewards; }
        public void setActiveRewards(Long activeRewards) { this.activeRewards = activeRewards; }
        public Long getTotalRedemptions() { return totalRedemptions; }
        public void setTotalRedemptions(Long totalRedemptions) { this.totalRedemptions = totalRedemptions; }
        public Long getPendingRedemptions() { return pendingRedemptions; }
        public void setPendingRedemptions(Long pendingRedemptions) { this.pendingRedemptions = pendingRedemptions; }
        public Long getFulfilledRedemptions() { return fulfilledRedemptions; }
        public void setFulfilledRedemptions(Long fulfilledRedemptions) { this.fulfilledRedemptions = fulfilledRedemptions; }
        public List<TopReward> getTopRewards() { return topRewards; }
        public void setTopRewards(List<TopReward> topRewards) { this.topRewards = topRewards; }
        public List<DailyRedemptionCount> getDailyRedemptions() { return dailyRedemptions; }
        public void setDailyRedemptions(List<DailyRedemptionCount> dailyRedemptions) { this.dailyRedemptions = dailyRedemptions; }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopReward {
        private Long rewardId;
        private String rewardName;
        private Long redemptionCount;
        private Long totalStock;
        private Long remainingStock;
        
        public Long getRewardId() { return rewardId; }
        public void setRewardId(Long rewardId) { this.rewardId = rewardId; }
        public String getRewardName() { return rewardName; }
        public void setRewardName(String rewardName) { this.rewardName = rewardName; }
        public Long getRedemptionCount() { return redemptionCount; }
        public void setRedemptionCount(Long redemptionCount) { this.redemptionCount = redemptionCount; }
        public Long getTotalStock() { return totalStock; }
        public void setTotalStock(Long totalStock) { this.totalStock = totalStock; }
        public Long getRemainingStock() { return remainingStock; }
        public void setRemainingStock(Long remainingStock) { this.remainingStock = remainingStock; }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyRedemptionCount {
        private String date;
        private Long count;
        
        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        public Long getCount() { return count; }
        public void setCount(Long count) { this.count = count; }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CustomerDashboardResponse {
        private UserSummary user;
        private DailyStats stats;
        private List<WorkoutPreview> todayWorkouts;
        private RecoveryStats recovery;
        private List<SpendItem> budgetBreakdown;
        private List<RecentActivity> recentActivities;
        private String aiSuggestion;
    }

    @Data
    @Builder
    public static class UserSummary {
        private Long id;
        private String fullName;
        private String avatarUrl;
        private Integer level;
        private Integer currentExp;
        private Integer nextLevelExp;
        private Integer streakDays;
    }

    @Data
    @Builder
    public static class DailyStats {
        private BigDecimal caloriesConsumed;
        private BigDecimal caloriesGoal;
        private BigDecimal proteinConsumed;
        private BigDecimal proteinGoal;
        private BigDecimal carbsConsumed;
        private BigDecimal carbsGoal;
        private BigDecimal fatConsumed;
        private BigDecimal fatGoal;
        private BigDecimal waterConsumed;
        private BigDecimal waterGoal;
        private BigDecimal budgetRemaining;
        private BigDecimal budgetLimit;
        /** Tổng calories đốt hôm nay từ training logs */
        private BigDecimal caloriesBurned;
        /** Số bài đã hoàn thành hôm nay */
        private Integer completedWorkoutsToday;
        /** Tổng số bài scheduled hôm nay */
        private Integer scheduledWorkoutsToday;
        /** Số buổi tập đã xong trong tuần này */
        private Integer workoutsThisWeek;
        /** Tổng buổi tập trong tuần */
        private Integer workoutsWeeklyGoal;
        /** % hoàn thành training plan hiện tại */
        private Integer activePlanProgress;
    }

    @Data
    @Builder
    public static class WorkoutPreview {
        private Long id;
        private String title;
        private String sets;
        private Boolean isCompleted;
        private String imageUrl;
        /** Nhóm cơ chính */
        private String muscle;
        /** Loại thiết bị */
        private String equipment;
        /** Calories ước tính */
        private Integer estimatedCalories;
    }

    @Data
    @Builder
    public static class RecoveryStats {
        private BigDecimal sleepHours;
        private BigDecimal sleepGoal;
        private Integer hrv;
        private Integer restingHR;
        private Integer energyLevel; // 1-5
        private String recommendation; // rest, light, intense
    }

    @Data
    @Builder
    public static class SpendItem {
        private String category;
        private BigDecimal amount;
        private String color;
    }

    @Data
    @Builder
    public static class RecentActivity {
        private String type; // workout, meal, metric
        private String title;
        private String value;
        private String date;
    }

    // ── AI / Token Usage Stats ────────────────────────────────────────────
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AiStatsResponse {
        // Tổng lượt gọi AI
        private long totalCallsToday;
        private long totalCallsThisMonth;
        private long totalCallsAllTime;
        // Ước tính token (meal ~2000, workout ~2500, food ~500 token/lần)
        private long estimatedTokensToday;
        private long estimatedTokensThisMonth;
        // Token THẬT đo từ Groq (bảng ai_token_log). 0 nếu chưa có dữ liệu.
        private long realTokensToday;
        private long realTokensThisMonth;
        private long realTokensAllTime;
        // Phân loại theo loại AI call
        private long mealPlanCalls;
        private long workoutPlanCalls;
        private long poseEvalCalls;
        // Top users theo lượt gọi AI
        private List<UserAiUsage> topUsers;
        // Log 20 lần gọi gần nhất
        private List<AiCallLog> recentLogs;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class UserAiUsage {
        private Long userId;
        private String fullName;
        private String email;
        private long totalCalls;
        // Token THẬT của user này (đo từ Groq). 0 nếu chưa có dữ liệu.
        private long realTokensThisMonth;
        private long realTokensAllTime;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AiCallLog {
        private String type;       // MEAL_PLAN / WORKOUT_PLAN / POSE_EVAL
        private String userName;
        private String createdAt;
        private long estimatedTokens;
    }
}

