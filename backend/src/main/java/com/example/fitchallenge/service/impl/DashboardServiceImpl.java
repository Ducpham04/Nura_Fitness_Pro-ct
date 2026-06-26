package com.example.fitchallenge.service.impl;

import com.example.fitchallenge.DTO.DashboardDTO;
import com.example.fitchallenge.Entity.*;
import com.example.fitchallenge.repository.*;
import com.example.fitchallenge.repository.User.UserRepository;
import com.example.fitchallenge.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.fitchallenge.Entity.PersonalizedMealDetail;
import com.example.fitchallenge.Entity.PersonalizedNutritionPlan;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final UserRepository userRepository;
    private final com.example.fitchallenge.repository.AiTokenLogRepository aiTokenLogRepository;
    private final UserChallengeRepository userChallengeRepository;
    private final ChallengeRepository challengeRepository;
    private final TrainingPlanRepository trainingPlanRepository;
    private final UserTrainingRepository userTrainingRepository;
    private final PersonalizedNutritionPlanRepository personalizedNutritionPlanRepository;
    private final DailyNutritionLogRepository dailyNutritionLogRepository;
    private final RewardRepository rewardRepository;
    private final RewardRedemptionRepository rewardRedemptionRepository;
    private final UserBodyProfileRepository userBodyProfileRepository;
    private final HealthProfileRepository healthProfileRepository;
    private final BodyMetricHistoryRepository bodyMetricHistoryRepository;
    private final DailyTrainingLogRepository dailyTrainingLogRepository;
    private final BudgetTrackingRepository budgetTrackingRepository;
    private final PersonalizedPlanDetailRepository personalizedPlanDetailRepository;
    private final PersonalizedMealDetailRepository personalizedMealDetailRepository;

    @Override
    @Transactional(readOnly = true)
    public DashboardDTO.UserStatsResponse getUserStats(String period) {
        ZonedDateTime startDate = getStartDate(period);

        // COUNT queries — không load toàn bảng users vào memory
        long totalUsers    = userRepository.count();
        long activeUsers   = userRepository.countByStatusIgnoreCase("active");
        long inactiveUsers = userRepository.countByStatusIgnoreCase("inactive");
        long bannedUsers   = userRepository.countByStatusIgnoreCase("banned");

        // Daily new users — chỉ tải bản ghi trong khoảng period
        List<DashboardDTO.DailyUserCount> dailyNewUsers = new ArrayList<>();
        if (startDate != null) {
            List<User> users = userRepository.findByCreatedAtAfter(startDate);
            Map<String, Long> dailyCount = users.stream()
                    .filter(u -> u.getCreatedAt() != null)
                    .collect(Collectors.groupingBy(
                            u -> u.getCreatedAt().toLocalDate().toString(),
                            Collectors.counting()
                    ));
            dailyCount.forEach((date, count) -> {
                DashboardDTO.DailyUserCount dailyUserCount = new DashboardDTO.DailyUserCount();
                dailyUserCount.setDate(date);
                dailyUserCount.setCount(count);
                dailyNewUsers.add(dailyUserCount);
            });
        }

        // Daily active users (users who logged in) — chỉ tải bản ghi trong khoảng period
        List<DashboardDTO.DailyActiveUsers> dailyActiveUsers = new ArrayList<>();
        if (startDate != null) {
            List<User> activeUsersList = userRepository.findByLastLoginAtAfter(startDate);
            Map<String, Long> dailyActiveCount = activeUsersList.stream()
                    .filter(u -> u.getLastLoginAt() != null)
                    .collect(Collectors.groupingBy(
                            u -> u.getLastLoginAt().toLocalDate().toString(),
                            Collectors.counting()
                    ));
            dailyActiveCount.forEach((date, count) -> {
                DashboardDTO.DailyActiveUsers dailyActiveUser = new DashboardDTO.DailyActiveUsers();
                dailyActiveUser.setDate(date);
                dailyActiveUser.setCount(count);
                dailyActiveUsers.add(dailyActiveUser);
            });
        }

        DashboardDTO.UserStatsResponse userResponse = new DashboardDTO.UserStatsResponse();
        userResponse.setTotalUsers(totalUsers);
        userResponse.setActiveUsers(activeUsers);
        userResponse.setInactiveUsers(inactiveUsers);
        userResponse.setBannedUsers(bannedUsers);
        userResponse.setDailyNewUsers(dailyNewUsers);
        userResponse.setDailyActiveUsers(dailyActiveUsers);
        return userResponse;
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardDTO.ChallengeStatsResponse getChallengeStats(String period) {
        ZonedDateTime startDate = getStartDate(period);

        // COUNT queries — không load toàn bảng vào memory
        long totalChallenges  = challengeRepository.count();
        long activeChallenges = challengeRepository.countByStatus(
                com.example.fitchallenge.Entity.Challenges.Status.ACTIVE);

        // Submissions — chỉ tải bản ghi trong khoảng period
        List<UserChallenge> allSubmissions = startDate != null
                ? userChallengeRepository.findBySubmittedAtAfter(startDate)
                : userChallengeRepository.findAll();
        
        long totalSubmissions = allSubmissions.size();
        long completedSubmissions = allSubmissions.stream()
                .filter(uc -> uc.getStatus() == UserChallenge.UserChallengeStatus.SUCCESS)
                .count();
        long pendingSubmissions = allSubmissions.stream()
                .filter(uc -> uc.getStatus() == UserChallenge.UserChallengeStatus.PENDING)
                .count();
        long failedSubmissions = allSubmissions.stream()
                .filter(uc -> uc.getStatus() == UserChallenge.UserChallengeStatus.FAILED)
                .count();

        // Average score — guard mẫu số = 0 (không có submission nào có score) để tránh chia cho 0
        long scoreCount = allSubmissions.stream().filter(uc -> uc.getScore() != null).count();
        BigDecimal averageScore = scoreCount == 0
                ? BigDecimal.ZERO
                : allSubmissions.stream()
                        .filter(uc -> uc.getScore() != null)
                        .map(uc -> BigDecimal.valueOf(uc.getScore()))
                        .reduce(BigDecimal.ZERO, BigDecimal::add)
                        .divide(BigDecimal.valueOf(scoreCount), 2, RoundingMode.HALF_UP);

        // Average confidence — guard tương tự
        long confidenceCount = allSubmissions.stream().filter(uc -> uc.getConfidence() != null).count();
        BigDecimal averageConfidence = confidenceCount == 0
                ? BigDecimal.ZERO
                : allSubmissions.stream()
                        .filter(uc -> uc.getConfidence() != null)
                        .map(uc -> BigDecimal.valueOf(uc.getConfidence()))
                        .reduce(BigDecimal.ZERO, BigDecimal::add)
                        .divide(BigDecimal.valueOf(confidenceCount), 2, RoundingMode.HALF_UP);

        // Daily completed challenges
        List<DashboardDTO.DailyChallengeCount> dailyCompleted = new ArrayList<>();
        Map<String, Long> dailyCount = allSubmissions.stream()
                .filter(uc -> uc.getStatus() == UserChallenge.UserChallengeStatus.SUCCESS && 
                        uc.getCompletedAt() != null)
                .collect(Collectors.groupingBy(
                        uc -> uc.getCompletedAt().toLocalDate().toString(),
                        Collectors.counting()
                ));
        
        dailyCount.forEach((date, count) -> {
                DashboardDTO.DailyChallengeCount dailyChallengeCount = new DashboardDTO.DailyChallengeCount();
                dailyChallengeCount.setDate(date);
                dailyChallengeCount.setCount(count);
                dailyCompleted.add(dailyChallengeCount);
        });

        DashboardDTO.ChallengeStatsResponse response = new DashboardDTO.ChallengeStatsResponse();
        response.setTotalChallenges(totalChallenges);
        response.setActiveChallenges(activeChallenges);
        response.setTotalSubmissions(totalSubmissions);
        response.setCompletedSubmissions(completedSubmissions);
        response.setPendingSubmissions(pendingSubmissions);
        response.setFailedSubmissions(failedSubmissions);
        response.setAverageScore(averageScore);
        response.setAverageConfidence(averageConfidence);
        response.setDailyCompleted(dailyCompleted);
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardDTO.TrainingStatsResponse getTrainingStats(String period) {
        ZonedDateTime startDate = getStartDate(period);

        // COUNT queries — tất cả plans đều có createdAt, activePlans ≈ totalPlans
        long totalPlans  = trainingPlanRepository.count();
        long activePlans = totalPlans; // TrainingPlan chưa có status field; mọi plan đều "active"

        // UserTrainings — chỉ tải bản ghi trong khoảng period
        List<UserTraining> allUserTrainings = startDate != null
                ? userTrainingRepository.findByStartDateAfter(startDate.toLocalDate())
                : userTrainingRepository.findAll();
        
        long totalParticipants = allUserTrainings.size();
        long completedParticipants = allUserTrainings.stream()
                .filter(ut -> "completed".equalsIgnoreCase(ut.getStatus()))
                .count();

        // Average completion rate
        double averageCompletionRate = allUserTrainings.stream()
                .filter(ut -> ut.getCompletionPercentage() != null)
                .mapToDouble(UserTraining::getCompletionPercentage)
                .average()
                .orElse(0.0);

        // Top completed plans
        Map<Long, List<UserTraining>> planGroups = allUserTrainings.stream()
                .filter(ut -> ut.getTrainingPlan() != null)
                .collect(Collectors.groupingBy(
                        ut -> ut.getTrainingPlan().getTpId()
                ));

        List<DashboardDTO.PlanCompletionStats> topCompletedPlans = planGroups.entrySet().stream()
                .map(entry -> {
                    Long planId = entry.getKey();
                    List<UserTraining> trainings = entry.getValue();
                    TrainingPlan plan = trainings.get(0).getTrainingPlan();
                    
                    long completed = trainings.stream()
                            .filter(ut -> "completed".equalsIgnoreCase(ut.getStatus()))
                            .count();
                    
                    double completionRate = trainings.isEmpty() ? 0.0 :
                            (double) completed / trainings.size() * 100;
                    
                    DashboardDTO.PlanCompletionStats planStats = new DashboardDTO.PlanCompletionStats();
                    planStats.setPlanId(planId);
                    planStats.setPlanTitle(plan.getTitle());
                    planStats.setTotalParticipants((long) trainings.size());
                    planStats.setCompletedCount(completed);
                    planStats.setCompletionRate(completionRate);
                    return planStats;
                })
                .sorted((a, b) -> Double.compare(b.getCompletionRate(), a.getCompletionRate()))
                .limit(10)
                .collect(Collectors.toList());

        DashboardDTO.TrainingStatsResponse trainingResponse = new DashboardDTO.TrainingStatsResponse();
        trainingResponse.setTotalPlans(totalPlans);
        trainingResponse.setActivePlans(activePlans);
        trainingResponse.setTotalParticipants(totalParticipants);
        trainingResponse.setCompletedParticipants(completedParticipants);
        trainingResponse.setAverageCompletionRate(averageCompletionRate);
        trainingResponse.setTopCompletedPlans(topCompletedPlans);
        return trainingResponse;
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardDTO.NutritionStatsResponse getNutritionStats(String period) {
        ZonedDateTime startDate = getStartDate(period);

        // COUNT queries — không load toàn bảng vào memory
        long totalPlans  = personalizedNutritionPlanRepository.count();
        long activePlans = personalizedNutritionPlanRepository.countByPlanStatus(
                PersonalizedNutritionPlan.PlanStatus.ACTIVE);

        // Distinct users có plan trong khoảng period
        long totalParticipants = startDate != null
                ? personalizedNutritionPlanRepository.countDistinctUsersByStartDateAfter(
                        startDate.toLocalDate())
                : personalizedNutritionPlanRepository.countDistinctUsers();

        // Average daily calories — AVG query thay vì findAll() + stream
        BigDecimal avgCalories = userBodyProfileRepository.avgRecommendedCalories();
        BigDecimal averageDailyCalories = avgCalories != null
                ? avgCalories.setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        // Total meals completed (có thể tính từ meal logs nếu có)
        long totalMealsCompleted = 0; // TODO: Tính từ meal completion logs nếu có

        // Daily meals completed
        List<DashboardDTO.DailyMealCount> dailyMealsCompleted = new ArrayList<>();
        // TODO: Implement khi có meal completion tracking

        DashboardDTO.NutritionStatsResponse nutritionResponse = new DashboardDTO.NutritionStatsResponse();
        nutritionResponse.setTotalPlans(totalPlans);
        nutritionResponse.setActivePlans(activePlans);
        nutritionResponse.setTotalParticipants(totalParticipants);
        nutritionResponse.setAverageDailyCalories(averageDailyCalories);
        nutritionResponse.setTotalMealsCompleted(totalMealsCompleted);
        nutritionResponse.setDailyMealsCompleted(dailyMealsCompleted);
        return nutritionResponse;
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardDTO.RewardStatsResponse getRewardStats(String period) {
        ZonedDateTime startDate = getStartDate(period);

        // COUNT queries — không load toàn bảng vào memory
        long totalRewards  = rewardRepository.count();
        long activeRewards = rewardRepository.countByStatusIgnoreCase("active");

        // Redemptions — chỉ tải bản ghi trong khoảng period
        List<RewardRedemption> allRedemptions = startDate != null
                ? rewardRedemptionRepository.findByCreatedAtAfter(startDate)
                : rewardRedemptionRepository.findAll();
        
        long totalRedemptions = allRedemptions.size();
        long pendingRedemptions = allRedemptions.stream()
                .filter(rr -> rr.getStatus() == RewardRedemption.RedemptionStatus.PENDING)
                .count();
        long fulfilledRedemptions = allRedemptions.stream()
                .filter(rr -> rr.getStatus() == RewardRedemption.RedemptionStatus.FULFILLED)
                .count();

        // Top rewards
        Map<Long, List<RewardRedemption>> rewardGroups = allRedemptions.stream()
                .filter(rr -> rr.getReward() != null)
                .collect(Collectors.groupingBy(
                        rr -> rr.getReward().getRewardId()
                ));

        List<DashboardDTO.TopReward> topRewards = rewardGroups.entrySet().stream()
                .map(entry -> {
                    Long rewardId = entry.getKey();
                    List<RewardRedemption> redemptions = entry.getValue();
                    Reward reward = redemptions.get(0).getReward();
                    
                    long redemptionCount = redemptions.size();
                    long totalStock = reward.getStock() != null ? reward.getStock() : 0;
                    long remainingStock = totalStock - redemptionCount;
                    
                    DashboardDTO.TopReward topReward = new DashboardDTO.TopReward();
                    topReward.setRewardId(rewardId);
                    topReward.setRewardName(reward.getName());
                    topReward.setRedemptionCount(redemptionCount);
                    topReward.setTotalStock(totalStock);
                    topReward.setRemainingStock(remainingStock);
                    return topReward;
                })
                .sorted((a, b) -> Long.compare(b.getRedemptionCount(), a.getRedemptionCount()))
                .limit(10)
                .collect(Collectors.toList());

        // Daily redemptions
        List<DashboardDTO.DailyRedemptionCount> dailyRedemptions = new ArrayList<>();
        Map<String, Long> dailyCount = allRedemptions.stream()
                .filter(rr -> rr.getCreatedAt() != null)
                .collect(Collectors.groupingBy(
                        rr -> rr.getCreatedAt().toLocalDate().toString(),
                        Collectors.counting()
                ));
        
        dailyCount.forEach((date, count) -> {
                DashboardDTO.DailyRedemptionCount dailyRedemptionCount = new DashboardDTO.DailyRedemptionCount();
                dailyRedemptionCount.setDate(date);
                dailyRedemptionCount.setCount(count);
                dailyRedemptions.add(dailyRedemptionCount);
        });

        DashboardDTO.RewardStatsResponse rewardResponse = new DashboardDTO.RewardStatsResponse();
        rewardResponse.setTotalRewards(totalRewards);
        rewardResponse.setActiveRewards(activeRewards);
        rewardResponse.setTotalRedemptions(totalRedemptions);
        rewardResponse.setPendingRedemptions(pendingRedemptions);
        rewardResponse.setFulfilledRedemptions(fulfilledRedemptions);
        rewardResponse.setTopRewards(topRewards);
        rewardResponse.setDailyRedemptions(dailyRedemptions);
        return rewardResponse;
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardDTO.CustomerDashboardResponse getCustomerDashboard(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        UserBodyProfile profile = user.getUserBodyProfile();
        HealthProfile healthProfile = healthProfileRepository.findByUser(user).orElse(null);

        LocalDate today = LocalDate.now();
        ZonedDateTime todayStart = ZonedDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);

        // ── 1. User Summary ──────────────────────────────────────────────
        int points = user.getPoints() != null ? user.getPoints() : 0;
        // Level dựa trên XP tích luỹ (levelPoints) — KHÔNG tụt khi đổi thưởng.
        // User cũ chưa có levelPoints → fallback sang points để giữ nguyên level.
        int xp = user.getLevelPoints() != null ? user.getLevelPoints() : points;
        int level = Math.max(1, xp / 100 + 1);
        int currentExp = xp % 100;
        int nextLevelExp = 100;

        DashboardDTO.UserSummary userSummary = DashboardDTO.UserSummary.builder()
                .id(user.getId())
                .fullName(user.getFullName() != null ? user.getFullName() : user.getUserName())
                .avatarUrl(user.getLinkImage())
                .level(level)
                .currentExp(currentExp)
                .nextLevelExp(nextLevelExp)
                .streakDays(user.getStreakCount() != null ? user.getStreakCount() : 0)
                .build();

        // ── 2. Nutrition — đọc từ personalized_meal_details (was_eaten=true) ──
        // Đây là nguồn dữ liệu thực tế khi user đánh dấu "đã ăn" trong Diet tab.
        BigDecimal caloriesGoal = profile != null && profile.getRecommendedCalories() != null
                ? profile.getRecommendedCalories() : BigDecimal.valueOf(2000);
        BigDecimal waterGoal = healthProfile != null && healthProfile.getWaterIntakeLitersPerDay() != null
                ? healthProfile.getWaterIntakeLitersPerDay() : BigDecimal.valueOf(2.5);

        BigDecimal caloriesConsumed = BigDecimal.ZERO;
        BigDecimal proteinConsumed  = BigDecimal.ZERO;
        BigDecimal carbsConsumed    = BigDecimal.ZERO;
        BigDecimal fatConsumed      = BigDecimal.ZERO;

        // Tìm plan dinh dưỡng active MỚI NHẤT (MAX pnpId) — tránh nhầm plan cũ
        Optional<PersonalizedNutritionPlan> activePlanOpt = personalizedNutritionPlanRepository
                .findActivePlanByUser(user);

        if (activePlanOpt.isPresent()) {
            PersonalizedNutritionPlan activePlan = activePlanOpt.get();
            // Tính dayNumber của hôm nay trong plan
            int dayNumber = 1;
            if (activePlan.getStartDate() != null) {
                long diff = today.toEpochDay() - activePlan.getStartDate().toEpochDay();
                dayNumber = (int) Math.max(1, diff + 1);
            }
            // Lấy các bữa đã ăn hôm nay
            List<PersonalizedMealDetail> eatenToday = personalizedMealDetailRepository
                    .findByPlanAndDay(activePlan, dayNumber)
                    .stream()
                    .filter(m -> Boolean.TRUE.equals(m.getWasEaten()))
                    .collect(Collectors.toList());

            caloriesConsumed = eatenToday.stream()
                    .mapToDouble(m -> m.getTotalCalories() != null ? m.getTotalCalories() : 0.0)
                    .mapToObj(BigDecimal::valueOf)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            proteinConsumed = eatenToday.stream()
                    .mapToDouble(m -> m.getTotalProtein() != null ? m.getTotalProtein() : 0.0)
                    .mapToObj(BigDecimal::valueOf)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            carbsConsumed = eatenToday.stream()
                    .mapToDouble(m -> m.getTotalCarbs() != null ? m.getTotalCarbs() : 0.0)
                    .mapToObj(BigDecimal::valueOf)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            fatConsumed = eatenToday.stream()
                    .mapToDouble(m -> m.getTotalFat() != null ? m.getTotalFat() : 0.0)
                    .mapToObj(BigDecimal::valueOf)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        // Fallback: đọc từ daily_nutrition_logs nếu có (log thủ công)
        List<DailyNutritionLog> todayNutritionLogs = dailyNutritionLogRepository
                .findByUserAndTrackingDate(user, today);
        if (caloriesConsumed.compareTo(BigDecimal.ZERO) == 0 && !todayNutritionLogs.isEmpty()) {
            caloriesConsumed = sum(todayNutritionLogs, DailyNutritionLog::getCalories);
            proteinConsumed  = sum(todayNutritionLogs, DailyNutritionLog::getProtein);
            carbsConsumed    = sum(todayNutritionLogs, DailyNutritionLog::getCarbs);
            fatConsumed      = sum(todayNutritionLogs, DailyNutritionLog::getFat);
        }

        // ── 3. Training logs hôm nay ─────────────────────────────────────
        List<DailyTrainingLog> todayLogs = dailyTrainingLogRepository
                .findByUser_IdAndTrainingDate(user.getId(), today);

        // Calories đốt hôm nay
        // Chỉ tính calories từ bài ĐÃ HOÀN THÀNH — không include PLANNED/NOT_STARTED
        int caloriesBurned = todayLogs.stream()
                .filter(l -> DailyTrainingLog.DailyTrainingStatus.COMPLETED.equals(l.getStatus()))
                .mapToInt(l -> l.getCaloriesBurned() != null ? l.getCaloriesBurned() : 0)
                .sum();

        // Số bài đã hoàn thành hôm nay
        long completedToday = todayLogs.stream()
                .filter(l -> DailyTrainingLog.DailyTrainingStatus.COMPLETED.equals(l.getStatus()))
                .count();

        // ── 4. Today workouts — lấy từ PersonalizedPlanDetail ────────────
        // Tìm active training để biết ngày trong plan
        Optional<UserTraining> activeTraining = userTrainingRepository
                .findTopByUser_IdAndStatusOrderByUtIdDesc(userId, "active");

        List<DashboardDTO.WorkoutPreview> workouts = new ArrayList<>();
        int scheduledToday = 0;
        int activePlanProgress = 0;
        int workoutsThisWeek = 0;
        int weeklyGoal = 5; // default

        if (activeTraining.isPresent()) {
            UserTraining ut = activeTraining.get();

            // % hoàn thành plan
            activePlanProgress = ut.getCompletionPercentage() != null
                    ? ut.getCompletionPercentage().intValue() : 0;

            // Tính ngày hiện tại trong plan
            int currentDay = ut.getCurrentDay() != null ? ut.getCurrentDay() : 1;

            // Lấy bài tập scheduled ngày hôm nay từ PersonalizedPlanDetail
            List<PersonalizedPlanDetail> todayPlanDetails = personalizedPlanDetailRepository
                    .findByUser_IdAndUtIdAndDayNumberOrderByIdAsc(userId, ut.getUtId(), currentDay);

            if (todayPlanDetails.isEmpty()) {
                // Fallback: lấy theo dayNumber của user
                todayPlanDetails = personalizedPlanDetailRepository
                        .findByUser_IdAndDayNumber(userId, currentDay);
            }

            scheduledToday = todayPlanDetails.size();

            // Map các bài scheduled, mark done nếu có log hôm nay
            java.util.Set<Long> completedExerciseIds = todayLogs.stream()
                    .filter(l -> DailyTrainingLog.DailyTrainingStatus.COMPLETED.equals(l.getStatus()))
                    .filter(l -> l.getExercise() != null)
                    .map(l -> l.getExercise().getId())
                    .collect(java.util.stream.Collectors.toSet());

            workouts = todayPlanDetails.stream()
                    .map(ppd -> {
                        Exercise ex = ppd.getExercise();
                        boolean done = ex != null && completedExerciseIds.contains(ex.getId());
                        return DashboardDTO.WorkoutPreview.builder()
                                .id(ppd.getId())
                                .title(ppd.getExerciseName())
                                .sets(ppd.getSets() + "×" + ppd.getReps())
                                .isCompleted(done)
                                .imageUrl(ex != null ? ex.getImageUrl() : null)
                                .muscle(ppd.getTargetMuscle())
                                .equipment(ex != null ? ex.getRequiredEquipment() : null)
                                .estimatedCalories(ppd.getEstimatedCalories())
                                .build();
                    })
                    .collect(Collectors.toList());

            // Workouts done this week (7 ngày gần nhất)
            LocalDate weekStart = today.minusDays(6);
            workoutsThisWeek = (int) dailyTrainingLogRepository.findByUser_Id(userId).stream()
                    .filter(l -> l.getTrainingDate() != null
                            && !l.getTrainingDate().isBefore(weekStart)
                            && DailyTrainingLog.DailyTrainingStatus.COMPLETED.equals(l.getStatus()))
                    .map(l -> l.getTrainingDate().toString() + "-" + (l.getExercise() != null ? l.getExercise().getId() : ""))
                    .distinct()
                    .count();

            // Weekly goal — 5 buổi/tuần mặc định (TrainingPlan không có field này)
            weeklyGoal = 5;
        }

        // ── 5. Budget ─────────────────────────────────────────────────────
        // Ưu tiên: chi tiêu thực tế hôm nay (BudgetTracking) → ngân sách user đặt
        // ở onboarding (UserBodyProfile.targetBudgetPerDay) → mặc định 80k.
        BudgetTracking todayBudget = budgetTrackingRepository.findByUserAndDate(user, today).orElse(null);
        Integer profileBudget = profile != null ? profile.getTargetBudgetPerDay() : null;
        BigDecimal budgetLimit = (todayBudget != null && todayBudget.getDailyBudget() != null)
                ? BigDecimal.valueOf(todayBudget.getDailyBudget())
                : (profileBudget != null && profileBudget > 0
                        ? BigDecimal.valueOf(profileBudget)
                        : BigDecimal.valueOf(80000));
        BigDecimal budgetSpent = todayBudget != null && todayBudget.getActualSpent() != null
                ? BigDecimal.valueOf(todayBudget.getActualSpent()) : BigDecimal.ZERO;

        List<DashboardDTO.SpendItem> breakdown = budgetSpent.compareTo(BigDecimal.ZERO) > 0
                ? List.of(
                    DashboardDTO.SpendItem.builder().category("Protein").amount(budgetSpent.multiply(new BigDecimal("0.5"))).color("#FF3B30").build(),
                    DashboardDTO.SpendItem.builder().category("Rau củ").amount(budgetSpent.multiply(new BigDecimal("0.3"))).color("#CCFF00").build(),
                    DashboardDTO.SpendItem.builder().category("Khác").amount(budgetSpent.multiply(new BigDecimal("0.2"))).color("#007AFF").build()
                  )
                : List.of();

        // ── 6. DailyStats ────────────────────────────────────────────────
        DashboardDTO.DailyStats dailyStats = DashboardDTO.DailyStats.builder()
                .caloriesConsumed(caloriesConsumed)
                .caloriesGoal(caloriesGoal)
                .proteinConsumed(proteinConsumed)
                .proteinGoal(caloriesGoal.multiply(new BigDecimal("0.25"))
                        .divide(new BigDecimal("4"), RoundingMode.HALF_UP))
                .carbsConsumed(carbsConsumed)
                .carbsGoal(caloriesGoal.multiply(new BigDecimal("0.50"))
                        .divide(new BigDecimal("4"), RoundingMode.HALF_UP))
                .fatConsumed(fatConsumed)
                .fatGoal(caloriesGoal.multiply(new BigDecimal("0.25"))
                        .divide(new BigDecimal("9"), RoundingMode.HALF_UP))
                .waterConsumed(BigDecimal.valueOf(1.2))
                .waterGoal(waterGoal)
                .budgetRemaining(budgetLimit.subtract(budgetSpent))
                .budgetLimit(budgetLimit)
                .caloriesBurned(BigDecimal.valueOf(caloriesBurned))
                .completedWorkoutsToday((int) completedToday)
                .scheduledWorkoutsToday(scheduledToday)
                .workoutsThisWeek(workoutsThisWeek)
                .workoutsWeeklyGoal(weeklyGoal)
                .activePlanProgress(activePlanProgress)
                .build();

        // ── 7. Recovery (dùng DỮ LIỆU THẬT từ check-in buổi tập) ──────────
        // Lấy giấc ngủ & độ mệt mỏi mới nhất user đã log hôm nay; nếu chưa có
        // thì giấc ngủ fallback về baseline trong HealthProfile (nếu có), còn
        // lại để null → FE hiển thị "Chưa có dữ liệu"/"—" thay vì số bịa.
        Double loggedSleep = todayLogs.stream()
                .map(DailyTrainingLog::getSleepHours)
                .filter(v -> v != null)
                .reduce((a, b) -> b)   // bản ghi gần nhất
                .orElse(null);
        Integer loggedFatigue = todayLogs.stream()
                .map(DailyTrainingLog::getFatigueLevel)
                .filter(v -> v != null)
                .reduce((a, b) -> b)
                .orElse(null);

        Double sleepHours = loggedSleep != null ? loggedSleep
                : (healthProfile != null && healthProfile.getSleepHoursPerDay() != null
                        ? healthProfile.getSleepHoursPerDay().doubleValue() : null);

        Integer energyLevel = null;
        String recommendation = null;
        if (loggedFatigue != null) {
            // fatigue 1 (khỏe) .. 5 (kiệt sức) → energy = 6 - fatigue
            energyLevel = Math.max(1, Math.min(5, 6 - loggedFatigue));
            recommendation = loggedFatigue >= 4 ? "rest" : loggedFatigue == 3 ? "light" : "ready";
        } else if (sleepHours != null) {
            energyLevel = sleepHours >= 7 ? 4 : sleepHours >= 5.5 ? 3 : 2;
            recommendation = sleepHours >= 7 ? "ready" : sleepHours >= 5.5 ? "light" : "rest";
        }

        DashboardDTO.RecoveryStats recovery = DashboardDTO.RecoveryStats.builder()
                .sleepHours(sleepHours != null ? BigDecimal.valueOf(sleepHours) : null)
                .sleepGoal(BigDecimal.valueOf(8.0))
                .hrv(null)          // chưa tích hợp thiết bị đeo → không bịa số
                .restingHR(null)
                .energyLevel(energyLevel)
                .recommendation(recommendation)
                .build();

        // ── 8. Recent activities ─────────────────────────────────────────
        List<DashboardDTO.RecentActivity> recentActivities = todayLogs.stream()
                .filter(l -> DailyTrainingLog.DailyTrainingStatus.COMPLETED.equals(l.getStatus()))
                .limit(5)
                .map(l -> DashboardDTO.RecentActivity.builder()
                        .type("workout")
                        .title(l.getExercise() != null ? l.getExercise().getExerciseName() : "Bài tập")
                        .value((l.getSetsCompleted() != null ? l.getSetsCompleted() : 0)
                                + "×" + (l.getRepsCompleted() != null ? l.getRepsCompleted() : 0))
                        .date(today.toString())
                        .build())
                .collect(Collectors.toList());

        // AI suggestion tùy theo dữ liệu
        String aiSuggestion;
        if (workoutsThisWeek == 0) {
            aiSuggestion = "Hôm nay là ngày tuyệt vời để bắt đầu! Hãy hoàn thành ít nhất 1 bài tập để giữ streak nhé.";
        } else if (caloriesConsumed.compareTo(BigDecimal.valueOf(500)) < 0) {
            aiSuggestion = "Bạn chưa ăn đủ hôm nay. Đảm bảo đủ năng lượng trước khi tập để đạt hiệu quả tốt nhất!";
        } else {
            aiSuggestion = "Bạn đang làm rất tốt tuần này! Tiếp tục duy trì nhé — mục tiêu " + weeklyGoal + " buổi/tuần là hoàn toàn trong tầm tay.";
        }

        return DashboardDTO.CustomerDashboardResponse.builder()
                .user(userSummary)
                .stats(dailyStats)
                .todayWorkouts(workouts)
                .recovery(recovery)
                .budgetBreakdown(breakdown)
                .recentActivities(recentActivities)
                .aiSuggestion(aiSuggestion)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AI / Token Usage Stats
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Ước tính token sử dụng dựa trên loại AI call:
     *   MEAL_PLAN    ≈ 2 000 tokens / lần
     *   WORKOUT_PLAN ≈ 2 500 tokens / lần
     *   POSE_EVAL    ≈ 500  tokens / lần
     */
    private static final long TOKENS_MEAL    = 2_000L;
    private static final long TOKENS_WORKOUT = 2_500L;
    private static final long TOKENS_POSE    = 500L;

    @Override
    @Transactional(readOnly = true)
    public DashboardDTO.AiStatsResponse getAiStats() {
        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);
        ZonedDateTime todayStartZdt = today.atStartOfDay(java.time.ZoneOffset.UTC);
        ZonedDateTime monthStartZdt = monthStart.atStartOfDay(java.time.ZoneOffset.UTC);
        UserChallenge.UserChallengeStatus pending = UserChallenge.UserChallengeStatus.PENDING;

        // ── 1. Meal plan counts (COUNT queries — không load toàn bảng) ──────
        long mealToday = personalizedNutritionPlanRepository.countByStartDate(today);
        long mealMonth = personalizedNutritionPlanRepository.countByStartDateGreaterThanEqual(monthStart);
        long mealAll   = personalizedNutritionPlanRepository.count();

        // ── 2. Workout plan counts ─────────────────────────────────────────
        long workoutToday = userTrainingRepository.countByStartDate(today);
        long workoutMonth = userTrainingRepository.countByStartDateGreaterThanEqual(monthStart);
        long workoutAll   = userTrainingRepository.count();

        // ── 3. Pose eval counts (non-PENDING challenges) ───────────────────
        long poseToday = userChallengeRepository.countBySubmittedAtAfterAndStatusNot(todayStartZdt, pending);
        long poseMonth = userChallengeRepository.countBySubmittedAtAfterAndStatusNot(monthStartZdt, pending);
        long poseAll   = userChallengeRepository.countByStatusNot(pending);

        // ── 4. Totals ───────────────────────────────────────────────────────
        long totalToday   = mealToday   + workoutToday   + poseToday;
        long totalMonth   = mealMonth   + workoutMonth   + poseMonth;
        long totalAllTime = mealAll     + workoutAll     + poseAll;

        long tokensToday = mealToday * TOKENS_MEAL + workoutToday * TOKENS_WORKOUT + poseToday * TOKENS_POSE;
        long tokensMonth = mealMonth * TOKENS_MEAL + workoutMonth * TOKENS_WORKOUT + poseMonth * TOKENS_POSE;

        // ── 5. Top users (GROUP BY — không N+1, 1 batch findAllById cuối) ──
        Map<Long, Long> totalByUser = new java.util.HashMap<>();
        personalizedNutritionPlanRepository.countGroupByUser()
                .forEach(row -> totalByUser.merge((Long) row[0], (Long) row[1], Long::sum));
        userTrainingRepository.countGroupByUser()
                .forEach(row -> totalByUser.merge((Long) row[0], (Long) row[1], Long::sum));
        userChallengeRepository.countNonPendingGroupByUser(pending)
                .forEach(row -> totalByUser.merge((Long) row[0], (Long) row[1], Long::sum));

        // ── Token THẬT đo từ Groq (bảng ai_token_log) ──────────────────────
        long realTokensToday = aiTokenLogRepository.sumTotalSince(todayStartZdt);
        long realTokensMonth = aiTokenLogRepository.sumTotalSince(monthStartZdt);
        long realTokensAll   = aiTokenLogRepository.sumTotalAllTime();
        Map<Long, Long> realByUserMonth = new java.util.HashMap<>();
        aiTokenLogRepository.sumByUserSince(monthStartZdt)
                .forEach(row -> realByUserMonth.put((Long) row[0], ((Number) row[1]).longValue()));
        Map<Long, Long> realByUserAll = new java.util.HashMap<>();
        aiTokenLogRepository.sumByUserAllTime()
                .forEach(row -> realByUserAll.put((Long) row[0], ((Number) row[1]).longValue()));

        List<Long> topUserIds = totalByUser.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(10)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());

        Map<Long, User> userMap = userRepository.findAllById(topUserIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        List<DashboardDTO.UserAiUsage> topUsers = topUserIds.stream()
                .map(uid -> {
                    User u = userMap.get(uid);
                    if (u == null) return null;
                    return DashboardDTO.UserAiUsage.builder()
                            .userId(u.getId())
                            .fullName(u.getFullName() != null ? u.getFullName() : u.getUserName())
                            .email(u.getEmail())
                            .totalCalls(totalByUser.get(uid))
                            .realTokensThisMonth(realByUserMonth.getOrDefault(uid, 0L))
                            .realTokensAllTime(realByUserAll.getOrDefault(uid, 0L))
                            .build();
                })
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());

        // ── 6. Recent 20 logs (bounded Top20 queries — không full table scan) ─
        List<DashboardDTO.AiCallLog> recentLogs = new ArrayList<>();

        personalizedNutritionPlanRepository
                .findTop20ByStartDateNotNullAndUserNotNullOrderByStartDateDesc()
                .forEach(p -> {
                    String name = p.getUser().getFullName() != null
                            ? p.getUser().getFullName() : p.getUser().getUserName();
                    recentLogs.add(DashboardDTO.AiCallLog.builder()
                            .type("MEAL_PLAN").userName(name)
                            .createdAt(p.getStartDate().toString())
                            .estimatedTokens(TOKENS_MEAL).build());
                });

        userTrainingRepository
                .findTop20ByStartDateNotNullAndUserNotNullOrderByStartDateDesc()
                .forEach(ut -> {
                    String name = ut.getUser().getFullName() != null
                            ? ut.getUser().getFullName() : ut.getUser().getUserName();
                    recentLogs.add(DashboardDTO.AiCallLog.builder()
                            .type("WORKOUT_PLAN").userName(name)
                            .createdAt(ut.getStartDate().toString())
                            .estimatedTokens(TOKENS_WORKOUT).build());
                });

        userChallengeRepository
                .findTop20ByStatusNotAndSubmittedAtNotNullAndUserNotNullOrderBySubmittedAtDesc(pending)
                .forEach(uc -> {
                    String name = uc.getUser().getFullName() != null
                            ? uc.getUser().getFullName() : uc.getUser().getUserName();
                    recentLogs.add(DashboardDTO.AiCallLog.builder()
                            .type("POSE_EVAL").userName(name)
                            .createdAt(uc.getSubmittedAt().toLocalDate().toString())
                            .estimatedTokens(TOKENS_POSE).build());
                });

        List<DashboardDTO.AiCallLog> sortedLogs = recentLogs.stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .limit(20)
                .collect(Collectors.toList());

        return DashboardDTO.AiStatsResponse.builder()
                .totalCallsToday(totalToday)
                .totalCallsThisMonth(totalMonth)
                .totalCallsAllTime(totalAllTime)
                .estimatedTokensToday(tokensToday)
                .estimatedTokensThisMonth(tokensMonth)
                .realTokensToday(realTokensToday)
                .realTokensThisMonth(realTokensMonth)
                .realTokensAllTime(realTokensAll)
                .mealPlanCalls(mealAll)
                .workoutPlanCalls(workoutAll)
                .poseEvalCalls(poseAll)
                .topUsers(topUsers)
                .recentLogs(sortedLogs)
                .build();
    }

    /** Helper: sum một field BigDecimal từ list */
    @SuppressWarnings("unchecked")
    private <T> BigDecimal sum(List<T> list, java.util.function.Function<T, BigDecimal> getter) {
        return list.stream()
                .map(getter)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Tính start date dựa trên period
     */
    private ZonedDateTime getStartDate(String period) {
        if (period == null || "all".equalsIgnoreCase(period)) {
            return null; // Lấy tất cả
        }
        
        ZonedDateTime now = ZonedDateTime.now();
        switch (period.toLowerCase()) {
            case "day":
                return now.minusDays(1);
            case "week":
                return now.minusWeeks(1);
            case "month":
                return now.minusMonths(1);
            case "year":
                return now.minusYears(1);
            default:
                return null;
        }
    }
}
