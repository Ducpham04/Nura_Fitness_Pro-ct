package com.example.fitchallenge.service;

import com.example.fitchallenge.DTO.DashboardDTO;
import java.util.List;

public interface DashboardService {
    /**
     * Lấy thống kê user
     * @param period day, week, month, year, all
     */
    DashboardDTO.UserStatsResponse getUserStats(String period);
    
    /**
     * Lấy thống kê challenge
     * @param period day, week, month, year, all
     */
    DashboardDTO.ChallengeStatsResponse getChallengeStats(String period);
    
    /**
     * Lấy thống kê training plan
     * @param period day, week, month, year, all
     */
    DashboardDTO.TrainingStatsResponse getTrainingStats(String period);
    
    /**
     * Lấy thống kê nutrition
     * @param period day, week, month, year, all
     */
    DashboardDTO.NutritionStatsResponse getNutritionStats(String period);
    
    /**
     * Lấy thống kê reward
     * @param period day, week, month, year, all
     */
    DashboardDTO.RewardStatsResponse getRewardStats(String period);
    
    /**
     * Lấy tổng quan dashboard cho user cá nhân
     */
    DashboardDTO.CustomerDashboardResponse getCustomerDashboard(Long userId);

    /**
     * Thống kê lượt gọi AI + ước tính token Groq
     */
    DashboardDTO.AiStatsResponse getAiStats();

    /**
     * Bảng hoạt động người dùng: last login, AI calls, token tháng này
     */
    List<DashboardDTO.UserActivityRow> getUserActivity();

    /**
     * Báo cáo tăng trưởng đăng ký: đăng ký theo ngày + so sánh kỳ trước
     * @param days số ngày của biểu đồ (30/90), clamp 7-365
     */
    DashboardDTO.GrowthStatsResponse getGrowthStats(int days);

    /**
     * Funnel activation: đăng ký → hồ sơ → sinh plan → tập buổi đầu → paid
     * @param days cohort đăng ký trong N ngày gần nhất; 0 hoặc âm = toàn bộ user
     */
    DashboardDTO.FunnelStatsResponse getFunnelStats(int days);
}







