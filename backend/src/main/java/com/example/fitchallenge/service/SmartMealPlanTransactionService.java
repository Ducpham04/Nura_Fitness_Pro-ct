package com.example.fitchallenge.service;

import com.example.fitchallenge.DTO.SmartMealDTO.SmartMealPlanAiResponseDTO;
import com.example.fitchallenge.DTO.SmartMealDTO.SmartMealSlotAiDTO;
import com.example.fitchallenge.Entity.Food;
import com.example.fitchallenge.Entity.PersonalizedMealDetail;
import com.example.fitchallenge.Entity.PersonalizedMealItem;
import com.example.fitchallenge.Entity.PersonalizedNutritionPlan;
import com.example.fitchallenge.Entity.User;
import com.example.fitchallenge.Entity.UserBodyProfile;
import com.example.fitchallenge.Entity.UserInventory;
import com.example.fitchallenge.repository.PersonalizedMealDetailRepository;
import com.example.fitchallenge.repository.PersonalizedNutritionPlanRepository;
import com.example.fitchallenge.repository.UserInventoryRepository;
import com.example.fitchallenge.repository.User.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Transactional persistence for Master-Data Smart Meal Plans (food FK + grams only).
 */
@Service
@RequiredArgsConstructor
public class SmartMealPlanTransactionService {

    private static final Logger log = LoggerFactory.getLogger(SmartMealPlanTransactionService.class);

    private final UserRepository userRepository;
    private final PersonalizedNutritionPlanRepository planRepository;
    private final PersonalizedMealDetailRepository mealDetailRepository;
    private final UserInventoryRepository userInventoryRepository;
    private final ObjectMapper mapper;

    @Transactional(rollbackFor = Exception.class)
    public PersonalizedNutritionPlan saveFromCatalogRecommendation(
            Long userId,
            UserBodyProfile profile,
            int requestedDays,
            int requestedBudget,
            List<String> inventoryTags,
            SmartMealPlanAiResponseDTO aiStructured,
            List<Food> catalogSnapshot,
            Map<String, Object> rawAiEnvelopeForAudit
    ) {
        Objects.requireNonNull(aiStructured.getMeals(), "AI meals missing");

        Map<Long, Food> foodMap = catalogSnapshot.stream()
                .collect(Collectors.toMap(Food::getFoodId, Function.identity(), (a, b) -> a));

        User user = userRepository.findById(userId).orElseThrow(() -> new IllegalStateException("User not found"));

        archiveActivePlans(user);

        String planAuditJson;
        try {
            planAuditJson = mapper.writeValueAsString(rawAiEnvelopeForAudit != null ? rawAiEnvelopeForAudit : aiStructured);
        } catch (Exception e) {
            planAuditJson = "{}";
            log.warn("Could not serialize AI audit JSON", e);
        }

        List<UserInventory> availableInventory = userInventoryRepository.findAvailableItemsForAI(user);

        PersonalizedNutritionPlan plan = PersonalizedNutritionPlan.builder()
                .user(user)
                .aiPlanId(aiStructured.getPlanId() != null ? aiStructured.getPlanId() : "AI_PLAN_" + System.currentTimeMillis())
                .version(1)
                .startDate(java.time.LocalDate.now())
                .endDate(java.time.LocalDate.now().plusDays(requestedDays - 1))
                .durationDays(requestedDays)
                .targetBudgetPerDay(requestedBudget)
                .targetCalories(targetCalories(profile))
                .targetProtein(targetProtein(profile))
                .targetCarbs(targetCarbs(profile))
                .targetFat(targetFat(profile))
                .aiGenerationContext(buildGenerationContext(profile, inventoryTags, requestedBudget, requestedDays))
                .aiPromptVersion("gemini_smart_meal_catalog_v1")
                .aiResponseJson(planAuditJson)
                .generationNotes("smart_meal_catalog_v1")
                .status(PersonalizedNutritionPlan.PlanStatus.ACTIVE)
                .isDeleted(false)
                .createdAt(ZonedDateTime.now())
                .build();

        PersonalizedNutritionPlan savedPlan = planRepository.save(plan);

        int accumulatedPlanSpend = 0;

        List<PersonalizedMealDetail> persisted = new ArrayList<>();
        Set<String> seenMealSlots = new HashSet<>();
        for (SmartMealSlotAiDTO slot : aiStructured.getMeals()) {
            if (slot.getItems() == null || slot.getItems().isEmpty()) {
                continue;
            }
            PersonalizedMealDetail.MealType mealType = validateSlotAndGetMealType(slot, requestedDays, seenMealSlots);

            PersonalizedMealDetail detail = new PersonalizedMealDetail();
            detail.setPersonalizedPlan(savedPlan);
            detail.setDayNumber(slot.getDayNumber());
            detail.setMealType(mealType);
            detail.setWasEaten(false);
            detail.setAiPromptVersion("gemini_smart_meal_catalog_v1");
            detail.setCreatedAt(ZonedDateTime.now());

            double mealCals = 0, mealProt = 0, mealCarb = 0, mealFat = 0;
            int mealSpend = 0;

            List<PersonalizedMealItem> rows = new ArrayList<>();
            for (var fq : slot.getItems()) {
                Long fid = fq.getFoodId();
                if (fid == null) {
                    throw new IllegalArgumentException("AI returned an item without food_id");
                }
                Food food = foodMap.get(fid);
                if (food == null) {
                    throw new IllegalArgumentException("AI referenced unknown food_id=" + fid);
                }
                Double rawQuantity = fq.getQuantity();
                if (rawQuantity == null || rawQuantity <= 0 || rawQuantity > 5000) {
                    throw new IllegalArgumentException("Invalid quantity for food_id=" + fid + ": " + rawQuantity);
                }
                BigDecimal qty = BigDecimal.valueOf(rawQuantity)
                        .setScale(2, RoundingMode.HALF_UP);

                BigDecimal inventoryQty = consumeInventoryQuantity(food, qty, availableInventory);
                BigDecimal purchaseQty = qty.subtract(inventoryQty);
                LineNutrition totalLine = nutritionForLine(food, qty);

                if (inventoryQty.compareTo(BigDecimal.ZERO) > 0) {
                    rows.add(buildMealItem(detail, food, inventoryQty, true));
                }
                if (purchaseQty.compareTo(BigDecimal.ZERO) > 0) {
                    rows.add(buildMealItem(detail, food, purchaseQty, false));
                    mealSpend += nutritionForLine(food, purchaseQty).costVnd();
                }

                mealCals += totalLine.calories();
                mealProt += totalLine.protein();
                mealCarb += totalLine.carbs();
                mealFat += totalLine.fat();
            }

            if (rows.isEmpty()) continue;

            detail.setMealItems(rows);
            detail.setMealItemsJson(null);
            detail.setTotalCalories(mealCals);
            detail.setTotalProtein(mealProt);
            detail.setTotalCarbs(mealCarb);
            detail.setTotalFat(mealFat);
            detail.setEstimatedCost(mealSpend);
            persisted.add(detail);

            accumulatedPlanSpend += mealSpend;
            mealDetailRepository.save(detail);
        }

        if (persisted.isEmpty()) {
            throw new IllegalStateException("No valid meals to persist — check AI structured output.");
        }

        savedPlan.setEstimatedTotalCost(accumulatedPlanSpend);
        planRepository.save(savedPlan);
        userInventoryRepository.softDeleteUsedUpByUser(user);
        log.info("[SmartMeal] Saved plan {} for user {} items={} ledgerCost={}",
                savedPlan.getPnpId(), userId, persisted.size(), accumulatedPlanSpend);
        return savedPlan;
    }

    private PersonalizedMealItem buildMealItem(
            PersonalizedMealDetail detail,
            Food food,
            BigDecimal quantity,
            boolean fromInventory
    ) {
        return PersonalizedMealItem.builder()
                .mealDetail(detail)
                .food(food)
                .quantityGrams(quantity.setScale(2, RoundingMode.HALF_UP))
                .fromInventory(fromInventory)
                .build();
    }

    private BigDecimal consumeInventoryQuantity(
            Food food,
            BigDecimal requestedQty,
            List<UserInventory> availableInventory
    ) {
        BigDecimal remaining = requestedQty;
        BigDecimal consumed = BigDecimal.ZERO;

        for (UserInventory inventory : availableInventory) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) break;
            if (!inventoryMatchesFood(inventory, food)) continue;

            BigDecimal available = BigDecimal.valueOf(inventory.getQuantityGrams() != null ? inventory.getQuantityGrams() : 0d);
            if (available.compareTo(BigDecimal.ZERO) <= 0) continue;

            BigDecimal used = available.min(remaining).setScale(2, RoundingMode.HALF_UP);
            BigDecimal updated = available.subtract(used).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);

            inventory.setQuantityGrams(updated.doubleValue());
            inventory.setUsedInPlan(true);
            inventory.setAiSuggestionNote("Used by smart meal plan");
            if (updated.compareTo(BigDecimal.ZERO) == 0) {
                inventory.setStatus(UserInventory.InventoryStatus.RESERVED);
            }
            userInventoryRepository.save(inventory);

            consumed = consumed.add(used);
            remaining = remaining.subtract(used);
        }

        return consumed.setScale(2, RoundingMode.HALF_UP);
    }

    private boolean inventoryMatchesFood(UserInventory inventory, Food food) {
        if (inventory.getFood() != null && Objects.equals(inventory.getFood().getFoodId(), food.getFoodId())) {
            return true;
        }
        String inventoryName = normalizeName(inventory.getDisplayName());
        String foodName = normalizeName(food.getName());
        return !inventoryName.isBlank()
                && !foodName.isBlank()
                && (inventoryName.contains(foodName) || foodName.contains(inventoryName));
    }

    private String normalizeName(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private PersonalizedMealDetail.MealType validateSlotAndGetMealType(
            SmartMealSlotAiDTO slot,
            int requestedDays,
            Set<String> seenMealSlots
    ) {
        if (slot.getDayNumber() == null || slot.getDayNumber() < 1 || slot.getDayNumber() > requestedDays) {
            throw new IllegalArgumentException("AI returned invalid day_number=" + slot.getDayNumber());
        }

        PersonalizedMealDetail.MealType mealType;
        try {
            mealType = PersonalizedMealDetail.MealType.valueOf(
                    Objects.requireNonNull(slot.getMealType(), "meal_type missing").trim().toUpperCase()
            );
        } catch (Exception e) {
            throw new IllegalArgumentException("AI returned invalid meal_type=" + slot.getMealType());
        }

        String slotKey = slot.getDayNumber() + ":" + mealType.name();
        if (!seenMealSlots.add(slotKey)) {
            throw new IllegalArgumentException("AI returned duplicate meal slot=" + slotKey);
        }

        return mealType;
    }

    private double targetCalories(UserBodyProfile profile) {
        return profile.getRecommendedCalories() != null ? profile.getRecommendedCalories().doubleValue() : 2000d;
    }

    private double targetProtein(UserBodyProfile profile) {
        double weightKg = profile.getWeight() != null ? profile.getWeight().doubleValue() : 70d;
        String goal = profile.getGoal() != null ? profile.getGoal().toLowerCase() : "";
        double multiplier = goal.contains("muscle") || goal.contains("tăng") ? 2.0d : 1.6d;
        return Math.round(weightKg * multiplier * 10.0d) / 10.0d;
    }

    private double targetFat(UserBodyProfile profile) {
        double calories = targetCalories(profile);
        return Math.round((calories * 0.25d / 9.0d) * 10.0d) / 10.0d;
    }

    private double targetCarbs(UserBodyProfile profile) {
        double calories = targetCalories(profile);
        double proteinCalories = targetProtein(profile) * 4.0d;
        double fatCalories = targetFat(profile) * 9.0d;
        return Math.max(0d, Math.round(((calories - proteinCalories - fatCalories) / 4.0d) * 10.0d) / 10.0d);
    }

    private String buildGenerationContext(
            UserBodyProfile profile,
            List<String> inventoryTags,
            int requestedBudget,
            int requestedDays
    ) {
        try {
            Map<String, Object> context = Map.of(
                    "source", "smart_meal_catalog_v1",
                    "days", requestedDays,
                    "budget_per_day", requestedBudget,
                    "inventory", inventoryTags != null ? inventoryTags : List.of(),
                    "goal", profile.getGoal() != null ? profile.getGoal() : "",
                    "experience_level", profile.getExperienceLevel() != null ? profile.getExperienceLevel() : "",
                    "activity_level", profile.getActivityLevel() != null ? profile.getActivityLevel() : ""
            );
            return mapper.writeValueAsString(context);
        } catch (Exception e) {
            return "{}";
        }
    }

    private void archiveActivePlans(User user) {
        List<PersonalizedNutritionPlan> active = planRepository.findAllByUser(user).stream()
                .filter(p -> p.getStatus() == PersonalizedNutritionPlan.PlanStatus.ACTIVE)
                .toList();
        for (PersonalizedNutritionPlan p : active) {
            p.setStatus(PersonalizedNutritionPlan.PlanStatus.ARCHIVED);
            planRepository.save(p);
        }
    }

    /**
     * Heuristic: substring match Vietnamese fridge tags ⇄ canonical food names in catalog batch.
     */
    public Set<Long> resolvePantryFoodIds(List<String> inventoryTags, List<Food> catalog) {
        Set<Long> out = new HashSet<>();
        if (inventoryTags == null || inventoryTags.isEmpty()) {
            return out;
        }
        List<String> normTags = inventoryTags.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> s.toLowerCase())
                .toList();

        for (Food f : catalog) {
            if (f.getName() == null) continue;
            String nm = f.getName().toLowerCase();
            for (String tag : normTags) {
                if (nm.contains(tag) || tag.contains(nm)) {
                    out.add(f.getFoodId());
                    break;
                }
            }
        }
        return out;
    }

    /** Portion gram × per-100g master columns (+ market price scaled). */
    public static LineNutrition nutritionForLine(Food food, BigDecimal qtyGrams) {
        BigDecimal ratio = qtyGrams.divide(BigDecimal.valueOf(100), 8, RoundingMode.HALF_UP);

        double cals = safeInt(food.getCaloriesPer100g()) * ratio.doubleValue();
        double prot = toDouble(food.getProteinPer100g()) * ratio.doubleValue();
        double carb = toDouble(food.getCarbsPer100g()) * ratio.doubleValue();
        double fat = toDouble(food.getFatPer100g()) * ratio.doubleValue();
        int rawPrice = food.getAverageMarketPriceVnd() != null ? food.getAverageMarketPriceVnd() : 0;
        double priceFactor = qtyGrams.divide(BigDecimal.valueOf(100), 8, RoundingMode.HALF_UP).doubleValue();
        int cost = BigDecimal.valueOf(rawPrice).multiply(BigDecimal.valueOf(priceFactor)).setScale(0, RoundingMode.HALF_UP).intValue();

        return new LineNutrition(cals, prot, carb, fat, Math.max(cost, 0));
    }

    private static double toDouble(java.math.BigDecimal v) {
        return v != null ? v.doubleValue() : 0d;
    }

    private static int safeInt(Integer v) {
        return v != null ? v : 0;
    }

    public record LineNutrition(double calories, double protein, double carbs, double fat, int costVnd) {}
}
