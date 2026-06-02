package com.example.fitchallenge.service.impl;

import com.example.fitchallenge.Entity.BudgetTracking;
import com.example.fitchallenge.Entity.PersonalizedNutritionPlan;
import com.example.fitchallenge.Entity.User;
import com.example.fitchallenge.repository.BudgetTrackingRepository;
import com.example.fitchallenge.repository.PersonalizedNutritionPlanRepository;
import com.example.fitchallenge.repository.User.UserRepository;
import com.example.fitchallenge.service.BudgetTrackingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Optional;

@Service
class BudgetTrackingServiceImpl implements BudgetTrackingService {

    @Autowired
    private BudgetTrackingRepository budgetRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PersonalizedNutritionPlanRepository planRepository;

    @Override
    @Transactional
    public BudgetTracking trackDailySpending(Long userId, LocalDate date, Integer actualSpent, Integer explicitDailyBudget, String itemsJson, String notes) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Tính toán các giá trị liên quan
        LocalDate weekStart = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        // Tìm daily budget từ request, nếu không có thì lấy từ plan
        Integer dailyBudget = explicitDailyBudget != null ? explicitDailyBudget : getDailyBudgetFromPlan(user, date);

        // Tính variance
        Integer variance = (dailyBudget != null && actualSpent != null) ? actualSpent - dailyBudget : null;

        // Kiểm tra AI compliance
        Boolean aiCompliance = checkAiCompliance(user, date, actualSpent);

        BudgetTracking tracking;
        Optional<BudgetTracking> existing = budgetRepository.findByUserAndDate(user, date);

        if (existing.isPresent()) {
            tracking = existing.get();
            tracking.setActualSpent(actualSpent);
            tracking.setVariance(variance);
            tracking.setAiStayedWithinBudget(aiCompliance);
            tracking.setBudgetNotes(notes);
            tracking.setPurchasedItemsJson(itemsJson);
        } else {
            tracking = new BudgetTracking();
            tracking.setUser(user);
            tracking.setTrackingDate(date);
            tracking.setWeekStartDate(weekStart);
            tracking.setDailyBudget(dailyBudget);
            tracking.setActualSpent(actualSpent);
            tracking.setVariance(variance);
            tracking.setAiStayedWithinBudget(aiCompliance);
            tracking.setBudgetNotes(notes);
            tracking.setPurchasedItemsJson(itemsJson);
        }

        // Cập nhật weekly totals
        updateWeeklyTotals(tracking, user, weekStart);

        return budgetRepository.save(tracking);
    }

    @Override
    /**
     * 📊 Lấy report chi tiêu tuần
     */
    public BudgetTrackingService.WeeklyBudgetReport getWeeklyReport(Long userId, LocalDate weekStartDate) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<BudgetTracking> weekData = budgetRepository.findByUserAndWeek(user, weekStartDate);

        int totalBudget = weekData.stream().mapToInt(bt -> bt.getDailyBudget() != null ? bt.getDailyBudget() : 0).sum();
        int totalSpent = weekData.stream().mapToInt(bt -> bt.getActualSpent() != null ? bt.getActualSpent() : 0).sum();
        int totalVariance = totalSpent - totalBudget;

        long compliantDays = weekData.stream().filter(bt -> Boolean.TRUE.equals(bt.getAiStayedWithinBudget())).count();
        double complianceRate = weekData.isEmpty() ? 0.0 : (compliantDays * 100.0) / weekData.size();

        return new BudgetTrackingService.WeeklyBudgetReport(weekStartDate, totalBudget, totalSpent, totalVariance, complianceRate, weekData);
    }

    @Override
    /**
     * 📊 Lấy report chi tiêu tháng
     */
    public BudgetTrackingService.MonthlyBudgetReport getMonthlyReport(Long userId, int year, int month) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());

        Long totalSpent = budgetRepository.sumActualSpentByUserAndDateRange(user, startDate, endDate);
        Double avgDaily = budgetRepository.calculateAverageDailySpent(user, startDate, endDate);
        Double complianceRate = budgetRepository.calculateAiComplianceRate(user, startDate, endDate);

        List<BudgetTracking> overBudgetDays = budgetRepository.findOverBudgetDays(user, startDate, endDate);
        List<BudgetTracking> underBudgetDays = budgetRepository.findUnderBudgetDays(user, startDate, endDate);

        return new BudgetTrackingService.MonthlyBudgetReport(
                year, month,
                totalSpent != null ? totalSpent : 0L,
                avgDaily != null ? avgDaily : 0.0,
                complianceRate != null ? complianceRate : 0.0,
                overBudgetDays.size(),
                underBudgetDays.size()
        );
    }

    @Override
    /**
     * 📋 Lấy lịch sử chi tiêu theo khoảng thời gian
     */
    public List<BudgetTracking> getSpendingHistory(Long userId, LocalDate startDate, LocalDate endDate) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return budgetRepository.findByUserAndDateRange(user, startDate, endDate);
    }

    @Override
    /**
     * 🤖 Đánh giá độ chính xác của AI trong việc dự đoán chi phí
     */
    public BudgetTrackingService.AiAccuracyReport evaluateAiAccuracy(Long userId, LocalDate startDate, LocalDate endDate) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Long totalDays = budgetRepository.countTrackingDays(user, startDate, endDate);
        Long compliantDays = budgetRepository.countAiComplianceDays(user, startDate, endDate);
        Long varianceSum = budgetRepository.sumVarianceByUserAndDateRange(user, startDate, endDate);

        double accuracyRate = totalDays == 0 ? 0.0 : (compliantDays * 100.0) / totalDays;
        double avgVariance = totalDays == 0 ? 0.0 : (varianceSum != null ? varianceSum.doubleValue() / totalDays : 0.0);

        return new BudgetTrackingService.AiAccuracyReport(totalDays, compliantDays, accuracyRate, avgVariance);
    }

    /**
     * 💡 Lấy daily budget từ plan nếu có
     */
    private Integer getDailyBudgetFromPlan(User user, LocalDate date) {
        Optional<PersonalizedNutritionPlan> activePlan = planRepository.findActivePlanByUser(user);
        if (activePlan.isPresent()) {
            PersonalizedNutritionPlan plan = activePlan.get();
            if (!date.isBefore(plan.getStartDate()) && !date.isAfter(plan.getEndDate())) {
                return plan.getTargetBudgetPerDay();
            }
        }
        return null;
    }

    /**
     * ✅ Kiểm tra AI có tuân thủ budget không
     */
    private Boolean checkAiCompliance(User user, LocalDate date, Integer actualSpent) {
        Optional<PersonalizedNutritionPlan> activePlan = planRepository.findActivePlanByUser(user);
        if (activePlan.isPresent()) {
            PersonalizedNutritionPlan plan = activePlan.get();
            if (!date.isBefore(plan.getStartDate()) && !date.isAfter(plan.getEndDate())) {
                Integer budget = plan.getTargetBudgetPerDay();
                if (budget != null && actualSpent != null) {
                    // Cho phép variance ±10%
                    double variancePercent = Math.abs((actualSpent - budget) * 100.0 / budget);
                    return variancePercent <= 10.0;
                }
            }
        }
        return null;
    }

    /**
     * 🔄 Cập nhật weekly totals
     */
    private void updateWeeklyTotals(BudgetTracking tracking, User user, LocalDate weekStart) {
        // Tính lại weekly totals từ tất cả các ngày trong tuần
        List<BudgetTracking> weekData = budgetRepository.findByUserAndWeek(user, weekStart);

        int weeklyBudget = weekData.stream().mapToInt(bt -> bt.getDailyBudget() != null ? bt.getDailyBudget() : 0).sum();
        int weeklySpent = weekData.stream().mapToInt(bt -> bt.getActualSpent() != null ? bt.getActualSpent() : 0).sum();

        tracking.setWeeklyBudget(weeklyBudget);
        tracking.setWeeklySpent(weeklySpent);
        tracking.setWeeklyRemaining(weeklyBudget - weeklySpent);
    }

    }
