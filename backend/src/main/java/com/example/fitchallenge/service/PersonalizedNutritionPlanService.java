package com.example.fitchallenge.service;

import com.example.fitchallenge.Entity.*;
import com.example.fitchallenge.repository.*;
import com.example.fitchallenge.repository.User.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Service: PersonalizedNutritionPlan
 * 👉 Chức năng: Quản lý AI-generated meal plans
 * 💡 Xử lý logic tạo, cập nhật, và theo dõi progress
 */
@Slf4j
@Service
public class PersonalizedNutritionPlanService {

    @Autowired
    private PersonalizedNutritionPlanRepository planRepository;

    @Autowired
    private PersonalizedMealDetailRepository mealDetailRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PlanVersionHistoryRepository versionHistoryRepository;

    @Autowired
    private ObjectMapper objectMapper;

    /**
     * 🆕 Tạo plan mới từ AI response
     */
    @Transactional
    public PersonalizedNutritionPlan createPlan(Long userId, String aiPlanId,
                                                 LocalDate startDate, Integer durationDays,
                                                 Integer budgetPerDay, Double targetCalories,
                                                 Double targetProtein, Double targetCarbs, Double targetFat,
                                                 String aiContext) {

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        // Deactivate current plan nếu có
        Optional<PersonalizedNutritionPlan> currentPlan = planRepository.findActivePlanByUser(user);
        currentPlan.ifPresent(plan -> {
            plan.setStatus(PersonalizedNutritionPlan.PlanStatus.ARCHIVED);
            planRepository.save(plan);
        });

        // Tạo plan mới
        PersonalizedNutritionPlan plan = new PersonalizedNutritionPlan();
        plan.setUser(user);
        plan.setAiPlanId(aiPlanId);
        plan.setVersion(1);
        plan.setStartDate(startDate);
        plan.setEndDate(startDate.plusDays(durationDays - 1));
        plan.setDurationDays(durationDays);
        plan.setTargetBudgetPerDay(budgetPerDay);
        plan.setTargetCalories(targetCalories);
        plan.setTargetProtein(targetProtein);
        plan.setTargetCarbs(targetCarbs);
        plan.setTargetFat(targetFat);
        plan.setAiGenerationContext(aiContext);
        plan.setStatus(PersonalizedNutritionPlan.PlanStatus.ACTIVE);
        plan.setIsDeleted(false);

        PersonalizedNutritionPlan savedPlan = planRepository.save(plan);

        // Tạo version history
        createVersionHistory(savedPlan, "Initial AI-generated plan");

        return savedPlan;
    }

    /**
     * 🔒 Lấy plan theo id và xác thực thuộc về user đang đăng nhập.
     * Dùng cho các thao tác định danh bằng planId (không có userId trên URL) để
     * chặn IDOR — user không thể thao tác plan của người khác nếu đoán được id.
     * Không lọc isDeleted vì restorePlan cần thao tác cả plan đã soft-delete.
     */
    private PersonalizedNutritionPlan requireOwnedPlan(Long planId, Long userId) {
        PersonalizedNutritionPlan plan = planRepository.findById(planId)
            .orElseThrow(() -> new RuntimeException("Plan not found"));
        if (plan.getUser() == null || !plan.getUser().getId().equals(userId)) {
            throw new SecurityException("Forbidden: Plan does not belong to user");
        }
        return plan;
    }

    /**
     * 🍽️ Thêm meal details vào plan
     */
    @Transactional
    public void addMealDetails(Long planId, Long userId, List<MealDetailRequest> meals) {
        PersonalizedNutritionPlan plan = requireOwnedPlan(planId, userId);

        for (MealDetailRequest mealReq : meals) {
            PersonalizedMealDetail detail = new PersonalizedMealDetail();
            detail.setPersonalizedPlan(plan);
            detail.setDayNumber(mealReq.dayNumber);
            detail.setMealType(mealReq.mealType);
            detail.setMealItemsJson(mealReq.mealItemsJson);
            detail.setTotalCalories(mealReq.totalCalories);
            detail.setTotalProtein(mealReq.totalProtein);
            detail.setTotalCarbs(mealReq.totalCarbs);
            detail.setTotalFat(mealReq.totalFat);
            detail.setEstimatedCost(mealReq.estimatedCost);
            detail.setPrepTimeMinutes(mealReq.prepTimeMinutes);
            detail.setCookingInstructions(mealReq.cookingInstructions);
            detail.setAiPromptVersion(mealReq.aiPromptVersion);
            detail.setWasEaten(false);

            mealDetailRepository.save(detail);
        }

        // Tính tổng estimated cost
        int totalCost = meals.stream().mapToInt(m -> m.estimatedCost != null ? m.estimatedCost : 0).sum();
        plan.setEstimatedTotalCost(totalCost);
        planRepository.save(plan);
    }

    /**
     * 📋 Lấy active plan của user
     */
    public Optional<PersonalizedNutritionPlan> getActivePlan(Long userId) {
        log.debug("🔍 [NutritionService] getActivePlan called for userId: {}", userId);
        
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            log.debug("❌ [NutritionService] User not found with userId: {}", userId);
            return Optional.empty();
        }
        
        User user = userOpt.get();
        log.debug("✅ [NutritionService] User found: {}", user.getEmail());
        
        Optional<PersonalizedNutritionPlan> planOpt = planRepository.findActivePlanByUser(user);
        if (planOpt.isEmpty()) {
            log.debug("⚠️ [NutritionService] No active plan found for user: {}", userId);
        } else {
            PersonalizedNutritionPlan plan = planOpt.get();
            log.debug("✅ [NutritionService] Active plan found - ID: {}", plan.getPnpId() + ", Status: " + plan.getStatus());
        }
        
        return planOpt;
    }

    /**
     * 📋 Lấy plan theo ID
     */
    public PersonalizedNutritionPlan getPlan(Long planId, Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        return planRepository.findByIdAndUser(planId, userId)
            .orElseThrow(() -> new RuntimeException("Plan not found"));
    }

    /**
     * 📋 Lấy tất cả plans của user
     */
    public List<PersonalizedNutritionPlan> getUserPlans(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return planRepository.findAllByUser(user);
    }

    /**
     * 🍽️ Lấy meals của một ngày
     */
    public List<PersonalizedMealDetail> getDayMeals(Long planId, Integer dayNumber) {
        PersonalizedNutritionPlan plan = planRepository.findById(planId)
            .orElseThrow(() -> new RuntimeException("Plan not found"));
        return mealDetailRepository.findByPlanAndDayWithItems(plan, dayNumber);
    }

    /**
     * ✅ Cập nhật feedback cho meal
     */
    @Transactional
    public void updateMealFeedback(Long mealDetailId, Boolean wasEaten, Integer rating, String feedback) {
        mealDetailRepository.updateUserFeedback(mealDetailId, wasEaten, rating, feedback);
    }

    @Transactional
    public void updateMealFeedback(Long mealDetailId, Long userId, Boolean wasEaten, Integer rating, String feedback) {
        PersonalizedMealDetail meal = mealDetailRepository.findById(mealDetailId)
            .orElseThrow(() -> new RuntimeException("Meal detail not found"));

        Long ownerId = meal.getPersonalizedPlan().getUser().getId();
        if (!ownerId.equals(userId)) {
            throw new RuntimeException("Forbidden: Meal does not belong to user");
        }

        mealDetailRepository.updateUserFeedback(mealDetailId, wasEaten, rating, feedback);
    }

    /**
     * 💰 Cập nhật actual cost
     */
    @Transactional
    public void updateActualCost(Long planId, Long userId, Integer actualCost) {
        requireOwnedPlan(planId, userId);
        planRepository.updateActualCost(planId, actualCost);
    }

    /**
     * ✅ Complete plan
     */
    @Transactional
    public void completePlan(Long planId, Long userId) {
        requireOwnedPlan(planId, userId);
        planRepository.markAsCompleted(planId);
    }

    /**
     * 🗑️ Delete plan (soft delete)
     */
    @Transactional
    public void deletePlan(Long planId, Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        PersonalizedNutritionPlan plan = planRepository.findByIdAndUser(planId, userId)
            .orElseThrow(() -> new RuntimeException("Plan not found"));

        planRepository.softDeleteById(planId);
    }

    /**
     * 🔄 Restore plan
     */
    @Transactional
    public void restorePlan(Long planId, Long userId) {
        requireOwnedPlan(planId, userId);
        planRepository.restoreById(planId);
    }

    /**
     * 📊 Get budget compliance report
     */
    public BudgetReport getBudgetReport(Long userId, LocalDate startDate, LocalDate endDate) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Long totalSpent = planRepository.sumActualCostByUserAndDateRange(user, startDate, endDate);
        Long overBudgetCount = planRepository.countOverBudgetPlans(user);

        return new BudgetReport(totalSpent, overBudgetCount);
    }

    /**
     * 🔗 Create version history entry
     */
    private void createVersionHistory(PersonalizedNutritionPlan plan, String changeSummary) {
        try {
            PlanVersionHistory version = new PlanVersionHistory();
            version.setUser(plan.getUser());
            version.setPlanType(PlanVersionHistory.PlanType.NUTRITION);
            version.setPlanId(plan.getPnpId());
            version.setVersionNumber(plan.getVersion());
            version.setAiVersionId(plan.getAiPlanId());
            version.setChangeSummary(changeSummary);
            version.setPlanDataJson(objectMapper.writeValueAsString(plan));
            version.setEstimatedCost(plan.getEstimatedTotalCost());
            version.setTargetCalories(plan.getTargetCalories());
            version.setTargetProtein(plan.getTargetProtein());
            version.setIsCurrent(true);
            version.setStatus(PlanVersionHistory.VersionStatus.ACTIVE);

            versionHistoryRepository.save(version);
        } catch (Exception e) {
            // Log error but don't fail plan creation
            log.warn("Failed to create version history: {}", e.getMessage());
        }
    }

    // 📦 Request classes
    public static class MealDetailRequest {
        public Integer dayNumber;
        public PersonalizedMealDetail.MealType mealType;
        public String mealItemsJson;
        public Double totalCalories;
        public Double totalProtein;
        public Double totalCarbs;
        public Double totalFat;
        public Integer estimatedCost;
        public Integer prepTimeMinutes;
        public String cookingInstructions;
        public String aiPromptVersion;
    }

    public static class BudgetReport {
        public final Long totalSpent;
        public final Long overBudgetCount;

        public BudgetReport(Long totalSpent, Long overBudgetCount) {
            this.totalSpent = totalSpent;
            this.overBudgetCount = overBudgetCount;
        }
    }
}
