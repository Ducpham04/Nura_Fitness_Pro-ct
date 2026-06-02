package com.example.fitchallenge.service;

import com.example.fitchallenge.Entity.BudgetTracking;

import java.time.LocalDate;
import java.util.List;

/**
 * Service Interface: BudgetTracking
 * 👉 Chức năng: Theo dõi và phân tích chi tiêu thực tế vs AI ước tính
 * 💡 Đánh giá độ chính xác của AI trong việc dự đoán chi phí
 */
public interface BudgetTrackingService {
    /**
     * 📝 Ghi nhận chi tiêu trong ngày
     */
    BudgetTracking trackDailySpending(Long userId, LocalDate date, Integer actualSpent, Integer dailyBudget, String itemsJson, String notes);
    
    /**
     * 📊 Lấy report chi tiêu tuần
     */
    WeeklyBudgetReport getWeeklyReport(Long userId, LocalDate weekStartDate);
    
    /**
     * 📊 Lấy report chi tiêu tháng
     */
    MonthlyBudgetReport getMonthlyReport(Long userId, int year, int month);
    
    /**
     * 📋 Lấy lịch sử chi tiêu theo khoảng thời gian
     */
    List<BudgetTracking> getSpendingHistory(Long userId, LocalDate startDate, LocalDate endDate);
    
    /**
     * 🤖 Đánh giá độ chính xác của AI trong việc dự đoán chi phí
     */
    AiAccuracyReport evaluateAiAccuracy(Long userId, LocalDate startDate, LocalDate endDate);
    
    // Report classes
    class WeeklyBudgetReport {
        public final LocalDate weekStartDate;
        public final int totalBudget;
        public final int totalSpent;
        public final int totalVariance;
        public final double aiComplianceRate;
        public final List<BudgetTracking> dailyRecords;

        public WeeklyBudgetReport(LocalDate weekStartDate, int totalBudget, int totalSpent,
                                   int totalVariance, double aiComplianceRate, List<BudgetTracking> dailyRecords) {
            this.weekStartDate = weekStartDate;
            this.totalBudget = totalBudget;
            this.totalSpent = totalSpent;
            this.totalVariance = totalVariance;
            this.aiComplianceRate = aiComplianceRate;
            this.dailyRecords = dailyRecords;
        }
    }

    class MonthlyBudgetReport {
        public final int year;
        public final int month;
        public final long totalSpent;
        public final double averageDailySpent;
        public final double aiComplianceRate;
        public final int overBudgetDays;
        public final int underBudgetDays;

        public MonthlyBudgetReport(int year, int month, long totalSpent, double averageDailySpent,
                                    double aiComplianceRate, int overBudgetDays, int underBudgetDays) {
            this.year = year;
            this.month = month;
            this.totalSpent = totalSpent;
            this.averageDailySpent = averageDailySpent;
            this.aiComplianceRate = aiComplianceRate;
            this.overBudgetDays = overBudgetDays;
            this.underBudgetDays = underBudgetDays;
        }
    }

    class AiAccuracyReport {
        public final long totalTrackedDays;
        public final long compliantDays;
        public final double accuracyPercentage;
        public final double averageVariance;

        public AiAccuracyReport(long totalTrackedDays, long compliantDays, double accuracyPercentage, double averageVariance) {
            this.totalTrackedDays = totalTrackedDays;
            this.compliantDays = compliantDays;
            this.accuracyPercentage = accuracyPercentage;
            this.averageVariance = averageVariance;
        }
    }
}

