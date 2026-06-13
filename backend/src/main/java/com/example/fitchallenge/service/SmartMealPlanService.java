package com.example.fitchallenge.service;

import com.example.fitchallenge.DTO.SmartMealDTO.DishCatalogEntryDTO;
import com.example.fitchallenge.DTO.SmartMealDTO.SmartDishMealAiDTO;
import com.example.fitchallenge.DTO.SmartMealDTO.SmartDishPlanAiResponseDTO;
import com.example.fitchallenge.Entity.*;
import com.example.fitchallenge.nutrition.NutritionSafetyAdvice;
import com.example.fitchallenge.nutrition.NutritionSafetyResolver;
import com.example.fitchallenge.repository.*;
import com.example.fitchallenge.repository.User.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Hybrid Smart Meal Plan service.
 *
 * Architecture contract:
 * - Groq receives dish catalog and returns dish_id only.
 * - Java looks up recipes from DishIngredient.
 * - Java solves all quantities, macros, cost, and inventory reconciliation.
 * - Legacy tables/JSON are not deleted; new flow writes normalized rows.
 */
@Service
@RequiredArgsConstructor
public class SmartMealPlanService {

    private static final int TOP_DISH_PER_ROLE = 6;
    private static final int MAX_DAYS = 28;

    @Value("${ai.service.url:http://localhost:8001}")
    private String aiServiceUrl;

    private final UserRepository userRepository;
    private final UserBodyProfileRepository bodyProfileRepository;
    private final DishRepository dishRepository;
    private final DishIngredientRepository dishIngredientRepository;
    private final UserInventoryRepository userInventoryRepository;
    private final PersonalizedNutritionPlanRepository planRepository;
    private final PersonalizedMealDetailRepository mealDetailRepository;
    private final PersonalizedMealItemRepository mealItemRepository;
    private final HealthProfileRepository healthProfileRepository;
    private final UserPreferenceService userPreferenceService;
    private final NutritionSafetyResolver nutritionSafetyResolver;

    @Autowired
    private RestTemplate restTemplate; // bean có timeout từ RestTemplateConfig
    private final ObjectMapper mapper = new ObjectMapper();

    @Transactional
    public PersonalizedNutritionPlan generateHybridPlan(Long userId, int requestedDays, int requestedBudget) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        UserBodyProfile profile = bodyProfileRepository.findByUser_Id(userId)
                .orElseThrow(() -> new IllegalStateException("Body profile is required before generating meal plan"));

        int days = Math.max(1, Math.min(requestedDays, MAX_DAYS));
        int budgetPerDay = Math.max(50_000, requestedBudget);

        NutritionSafetyAdvice safety = safetyAdviceFor(userId);
        Map<Dish.DishRole, List<Dish>> topDishes = applySafetyFilter(prefilterTopDishes(), safety);
        SmartDishPlanAiResponseDTO aiPlan = callGroqDishPlanner(days, budgetPerDay, profile, topDishes, user, safety);

        Map<Long, Dish> dishById = topDishes.values().stream()
                .flatMap(Collection::stream)
                .collect(Collectors.toMap(Dish::getDishId, Function.identity(), (a, b) -> a));

        List<Long> selectedDishIds = collectValidDishIds(aiPlan, dishById);
        if (selectedDishIds.isEmpty()) {
            throw new IllegalStateException("Groq returned no valid dish_id values");
        }

        Map<Long, List<DishIngredient>> recipeByDish = dishIngredientRepository.findByDishIdsWithFood(selectedDishIds).stream()
                .collect(Collectors.groupingBy(di -> di.getDish().getDishId()));
        List<UserInventory> inventory = userInventoryRepository.findAvailableItemsForAI(user);

        PersonalizedNutritionPlan plan = createPlanShell(user, profile, aiPlan, days, budgetPerDay);
        MacroTarget dailyTarget = targetMacros(profile);
        int totalCost = 0;

        for (var day : aiPlan.getDays()) {
            if (day.getDayNumber() == null || day.getDayNumber() < 1 || day.getDayNumber() > days) {
                continue;
            }
            for (SmartDishMealAiDTO meal : safeList(day.getMeals())) {
                PersonalizedMealDetail.MealType mealType = parseMealType(meal.getMealType());
                double mealRatio = mealMacroRatio(mealType);
                MacroTarget mealTarget = dailyTarget.scale(mealRatio);

                List<Dish> mealDishes = safeList(meal.getDishes()).stream()
                        .map(ref -> ref.getDishId() == null ? null : dishById.get(ref.getDishId()))
                        .filter(Objects::nonNull)
                        .toList();
                if (mealDishes.isEmpty()) {
                    continue;
                }

                List<DishIngredient> mealRecipe = mealDishes.stream()
                        .flatMap(dish -> recipeByDish.getOrDefault(dish.getDishId(), List.of()).stream())
                        .toList();
                List<SolvedLine> solvedLines = solveQuantities(mealRecipe, mealTarget, inventory);
                solvedLines = enforceMealGuards(solvedLines, mealTarget.calories(), budgetPerDay * mealRatio);

                Map<Long, List<SolvedLine>> linesByDish = solvedLines.stream()
                        .collect(Collectors.groupingBy(line -> line.dish().getDishId(), LinkedHashMap::new, Collectors.toList()));

                for (Dish dish : mealDishes) {
                    List<SolvedLine> dishLines = linesByDish.getOrDefault(dish.getDishId(), List.of());
                    if (dishLines.isEmpty()) {
                        continue;
                    }
                    PersonalizedMealDetail detail = createMealDetail(plan, dish, day.getDayNumber(), mealType, dishLines);
                    mealDetailRepository.save(detail);
                    List<PersonalizedMealItem> items = dishLines.stream()
                            .map(line -> toMealItem(detail, line))
                            .toList();
                    mealItemRepository.saveAll(items);
                    detail.setMealItems(new ArrayList<>(items));
                    totalCost += detail.getEstimatedCost() != null ? detail.getEstimatedCost() : 0;
                }
            }
        }

        plan.setEstimatedTotalCost(totalCost);
        PersonalizedNutritionPlan savedPlan = planRepository.save(plan);
        return savedPlan;
    }

    /**
     * Swap the dish on a single meal slot to the next dish in the same role catalog.
     * Uses round-robin: if current dish is at index i, next dish is at index (i+1) % catalog.size().
     * Quantities are re-solved from the new dish's recipe, matching the same macro target.
     */
    @Transactional
    public PersonalizedMealDetail swapMealDish(Long mealDetailId, Long authenticatedUserId) {
        PersonalizedMealDetail detail = mealDetailRepository.findById(mealDetailId)
                .orElseThrow(() -> new IllegalArgumentException("Meal detail not found: " + mealDetailId));

        PersonalizedNutritionPlan plan = detail.getPersonalizedPlan();
        if (!plan.getUser().getId().equals(authenticatedUserId)) {
            throw new SecurityException("Access denied to meal detail " + mealDetailId);
        }

        Dish currentDish = detail.getDish();
        if (currentDish == null) {
            throw new IllegalStateException("Meal detail has no associated dish to swap");
        }

        NutritionSafetyAdvice safety = safetyAdviceFor(authenticatedUserId);
        List<Dish> catalog = dishRepository.findActiveByRole(
                        currentDish.getDishRole(), PageRequest.of(0, TOP_DISH_PER_ROLE + 1)).stream()
                .filter(d -> d.getDishId().equals(currentDish.getDishId())
                        || !matchesAvoidKeyword(d.getDishName(), safety.getAvoidKeywords()))
                .toList();
        if (catalog.size() <= 1) {
            throw new IllegalStateException("No alternative dishes available for role: " + currentDish.getDishRole());
        }

        int currentPos = 0;
        for (int i = 0; i < catalog.size(); i++) {
            if (catalog.get(i).getDishId().equals(currentDish.getDishId())) {
                currentPos = i;
                break;
            }
        }
        Dish newDish = catalog.get((currentPos + 1) % catalog.size());

        List<DishIngredient> recipe = dishIngredientRepository.findByDishIdsWithFood(List.of(newDish.getDishId()));
        List<UserInventory> inventory = userInventoryRepository.findAvailableItemsForAI(plan.getUser());

        double mealRatio = mealMacroRatio(detail.getMealType());
        MacroTarget dailyTarget = new MacroTarget(
                plan.getTargetCalories() != null ? plan.getTargetCalories() : 2000.0,
                plan.getTargetProtein()  != null ? plan.getTargetProtein()  : 120.0,
                plan.getTargetCarbs()    != null ? plan.getTargetCarbs()    : 200.0,
                plan.getTargetFat()      != null ? plan.getTargetFat()      : 60.0
        );
        MacroTarget mealTarget = dailyTarget.scale(mealRatio);
        int budgetPerDay = plan.getTargetBudgetPerDay() != null ? plan.getTargetBudgetPerDay() : 80_000;

        List<SolvedLine> lines = solveQuantities(recipe, mealTarget, inventory);
        lines = enforceMealGuards(lines, mealTarget.calories(), budgetPerDay * mealRatio);

        detail.getMealItems().clear();
        detail.setDish(newDish);

        double totalCals = 0, totalProt = 0, totalCarbs = 0, totalFat = 0;
        int totalCost = 0;
        for (SolvedLine line : lines) {
            PersonalizedMealItem item = toMealItem(detail, line);
            detail.getMealItems().add(item);
            totalCals += line.calories();
            totalProt += line.protein();
            totalCarbs += line.carbs();
            totalFat += line.fat();
            totalCost += line.costVnd();
        }
        detail.setTotalCalories(totalCals);
        detail.setTotalProtein(totalProt);
        detail.setTotalCarbs(totalCarbs);
        detail.setTotalFat(totalFat);
        detail.setEstimatedCost(totalCost);
        detail.setUpdatedAt(ZonedDateTime.now());

        mealDetailRepository.save(detail);

        // Reload with items eagerly fetched so controller can map without LazyInitializationException
        return mealDetailRepository.findByIdWithItems(mealDetailId).orElse(detail);
    }

    /**
     * Step 1: conservative pre-filter. This keeps prompts small and gives Groq
     * only top dishes grouped by role. Future scoring can add cuisine preference,
     * seasonal pricing, and user dislikes without changing the Groq contract.
     */
    private Map<Dish.DishRole, List<Dish>> prefilterTopDishes() {
        Map<Dish.DishRole, List<Dish>> result = new EnumMap<>(Dish.DishRole.class);
        for (Dish.DishRole role : Dish.DishRole.values()) {
            result.put(role, dishRepository.findActiveByRole(role, PageRequest.of(0, TOP_DISH_PER_ROLE)));
        }
        return result;
    }

    /**
     * Ràng buộc an toàn dinh dưỡng của user (dị ứng, bệnh nền) — Java enforce
     * bằng hard-filter catalog, AI chỉ nhận thêm context. Public để controller
     * gắn disclaimer vào response.
     */
    public NutritionSafetyAdvice safetyAdviceFor(Long userId) {
        HealthProfile health = healthProfileRepository.findByUser_Id(userId).orElse(null);
        List<String> dislikedFoods = userPreferenceService.getFoodsToAvoid(userId);
        return nutritionSafetyResolver.resolve(health, dislikedFoods);
    }

    /** Loại món có tên khớp từ khóa dị ứng/không ăn ra khỏi catalog trước khi đưa cho Groq. */
    private Map<Dish.DishRole, List<Dish>> applySafetyFilter(
            Map<Dish.DishRole, List<Dish>> topDishes, NutritionSafetyAdvice safety) {
        if (safety.getAvoidKeywords().isEmpty()) {
            return topDishes;
        }
        Map<Dish.DishRole, List<Dish>> filtered = new EnumMap<>(Dish.DishRole.class);
        for (var entry : topDishes.entrySet()) {
            List<Dish> kept = entry.getValue().stream()
                    .filter(dish -> !matchesAvoidKeyword(dish.getDishName(), safety.getAvoidKeywords()))
                    .toList();
            // Không để trống role (solver cần fallback) — chỉ áp filter khi còn món thay thế
            filtered.put(entry.getKey(), kept.isEmpty() ? entry.getValue() : kept);
        }
        return filtered;
    }

    private boolean matchesAvoidKeyword(String dishName, List<String> avoidKeywords) {
        if (dishName == null) return false;
        String name = java.text.Normalizer.normalize(dishName, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT);
        return avoidKeywords.stream().anyMatch(name::contains);
    }

    private SmartDishPlanAiResponseDTO callGroqDishPlanner(
            int days,
            int budgetPerDay,
            UserBodyProfile profile,
            Map<Dish.DishRole, List<Dish>> topDishes,
            User user,
            NutritionSafetyAdvice safety
    ) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("days", days);
        payload.put("budget_per_day", budgetPerDay);
        payload.put("user_goal", profile.getGoal() != null ? profile.getGoal() : "maintenance");
        payload.put("avoid_keywords", safety.getAvoidKeywords());
        payload.put("diet_rules", safety.getDietRules());
        payload.put("medical_conditions", safety.getConditions());
        payload.put("inventory", userInventoryRepository.findAvailableItemsForAI(user).stream()
                .map(UserInventory::getDisplayName)
                .filter(Objects::nonNull)
                .toList());
        payload.put("dish_catalog_by_role", topDishes.entrySet().stream()
                .collect(Collectors.toMap(
                        entry -> entry.getKey().name(),
                        entry -> entry.getValue().stream().map(this::toCatalogEntry).toList(),
                        (a, b) -> a,
                        LinkedHashMap::new
                )));

        ResponseEntity<Map> response = restTemplate.postForEntity(
                aiServiceUrl + "/smart-meal-plan-dish",
                payload,
                Map.class
        );
        if (response.getBody() == null) {
            throw new IllegalStateException("AI service returned empty body");
        }
        return mapper.convertValue(response.getBody(), SmartDishPlanAiResponseDTO.class);
    }

    private DishCatalogEntryDTO toCatalogEntry(Dish dish) {
        return DishCatalogEntryDTO.builder()
                .dishId(dish.getDishId())
                .dishName(dish.getDishName())
                .dishRole(dish.getDishRole() != null ? dish.getDishRole().name() : null)
                .suitableMealTypes(dish.getSuitableMealTypes())
                .build();
    }

    private List<Long> collectValidDishIds(SmartDishPlanAiResponseDTO aiPlan, Map<Long, Dish> dishById) {
        Set<Long> selected = new LinkedHashSet<>();
        for (var day : safeList(aiPlan.getDays())) {
            for (var meal : safeList(day.getMeals())) {
                for (var dish : safeList(meal.getDishes())) {
                    Long dishId = dish.getDishId();
                    if (dishId != null && dishById.containsKey(dishId)) {
                        selected.add(dishId);
                    }
                }
            }
        }
        return new ArrayList<>(selected);
    }

    /**
     * Step 4: Heuristic Macro Solver.
     *
     * Rules:
     * - FIBER is fixed to 150g per fiber ingredient.
     * - FAT is derived from target.fat() (clamped 5–80g per ingredient).
     * - Remaining protein target is filled by PROTEIN foods.
     * - Remaining carb target is filled by CARB foods.
     * - PIECE serving units are rounded to whole pieces and converted back to grams.
     * - Inventory-matched foods are marked fromInventory and cost zero.
     * - Calorie top-up: if calories < 92% of target, CARB lines are upscaled (≤2x)
     *   to close the gap before the enforceMealGuards pass.
     */
    public List<SolvedLine> solveQuantities(
            List<DishIngredient> recipeLines,
            MacroTarget target,
            List<UserInventory> inventory
    ) {
        Map<Food.FoodCategory, List<DishIngredient>> byCategory = recipeLines.stream()
                .filter(di -> di.getFood() != null)
                .collect(Collectors.groupingBy(di -> di.getFood().getFoodCategoryEnum()));

        List<SolvedLine> solved = new ArrayList<>();
        MacroTarget remaining = target.copy();

        List<DishIngredient> fibers = byCategory.getOrDefault(Food.FoodCategory.FIBER, List.of());
        BigDecimal fiberGrams = fibers.isEmpty()
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(150.0 / fibers.size()).setScale(2, RoundingMode.HALF_UP);
        for (DishIngredient fiber : fibers) {
            solved.add(buildSolvedLine(fiber, fiberGrams, inventory));
            remaining = remaining.minus(nutritionFor(fiber.getFood(), fiberGrams));
        }

        List<DishIngredient> fats = byCategory.getOrDefault(Food.FoodCategory.FAT, List.of());
        if (!fats.isEmpty()) {
            // Solve fat ingredients to meet the fat macro target.
            // Cap per-food fat at 50g (avoids overloading with a single oil source).
            double fatTargetTotal = Math.min(target.fat(), 50.0 * fats.size());
            BigDecimal fatGramsPerItem = BigDecimal.valueOf(fatTargetTotal / fats.size()).setScale(2, RoundingMode.HALF_UP);
            for (DishIngredient fat : fats) {
                Food fatFood = fat.getFood();
                // Derive quantity from fat content per 100 g so macros actually reach target
                double fatPer100 = safe(fatFood.getFatPer100g());
                BigDecimal derivedGrams = fatPer100 > 0
                        ? BigDecimal.valueOf((fatTargetTotal / fats.size() / fatPer100) * 100.0)
                                .setScale(2, RoundingMode.HALF_UP)
                        : fatGramsPerItem;
                // Guard: realistic cooking amount (5–80 g per fat ingredient)
                double clamped = Math.min(80.0, Math.max(5.0, derivedGrams.doubleValue()));
                BigDecimal normalized = normalizeServing(fatFood, BigDecimal.valueOf(clamped));
                solved.add(buildSolvedLine(fat, normalized, inventory));
                remaining = remaining.minus(nutritionFor(fatFood, normalized));
            }
        }

        solveCategory(byCategory.getOrDefault(Food.FoodCategory.PROTEIN, List.of()), remaining.protein(), MacroKind.PROTEIN, inventory, solved);
        MacroTarget afterProtein = target.minus(totalNutrition(solved));
        solveCategory(byCategory.getOrDefault(Food.FoodCategory.CARB, List.of()), afterProtein.carbs(), MacroKind.CARB, inventory, solved);

        // Calorie top-up: if total calories fall below 92% of the meal target, scale up
        // CARB lines proportionally to close the gap. Carbs are the safest macro to boost
        // because they don't distort protein balance or fat taste.
        // We compute how much extra carb-portion uplift is needed, capped at 2.0x to
        // prevent runaway servings.
        double achievedCalories = solved.stream().mapToDouble(SolvedLine::calories).sum();
        double calTarget = target.calories();
        if (achievedCalories > 0 && achievedCalories < calTarget * 0.92) {
            List<DishIngredient> carbCandidates = byCategory.getOrDefault(Food.FoodCategory.CARB, List.of());
            Set<Long> carbFoodIds = carbCandidates.stream()
                    .filter(di -> di.getFood() != null)
                    .map(di -> di.getFood().getFoodId())
                    .collect(Collectors.toSet());
            double carbCalories = solved.stream()
                    .filter(l -> l.food() != null && carbFoodIds.contains(l.food().getFoodId()))
                    .mapToDouble(SolvedLine::calories)
                    .sum();
            if (carbCalories > 0) {
                double nonCarbCalories = achievedCalories - carbCalories;
                double needed = calTarget - nonCarbCalories;
                double scaleUp = Math.min(2.00, needed / carbCalories);
                if (scaleUp > 1.01) {
                    solved = solved.stream()
                            .map(line -> {
                                if (line.food() == null || !carbFoodIds.contains(line.food().getFoodId())) {
                                    return line;
                                }
                                BigDecimal scaled = line.quantityGrams()
                                        .multiply(BigDecimal.valueOf(scaleUp))
                                        .setScale(2, RoundingMode.HALF_UP);
                                BigDecimal normalized = normalizeServing(line.food(), scaled);
                                return buildSolvedLine(line.dish(), line.food(), normalized, line.fromInventory());
                            })
                            .collect(Collectors.toList());
                }
            }
        }

        return solved.stream()
                .filter(line -> line.quantityGrams().compareTo(BigDecimal.ZERO) > 0)
                .toList();
    }

    /**
     * Final safety guard. The macro solver is goal-oriented, but this pass keeps
     * the generated meal inside hard UX constraints:
     * - calories should not exceed the meal target by more than 10%
     * - purchase cost should not exceed the meal budget slice
     * Inventory lines are preserved as much as possible because they are free.
     */
    private List<SolvedLine> enforceMealGuards(List<SolvedLine> lines, double calorieBudget, double moneyBudget) {
        if (lines.isEmpty()) {
            return lines;
        }

        double calories = lines.stream().mapToDouble(SolvedLine::calories).sum();
        double cost = lines.stream().mapToInt(SolvedLine::costVnd).sum();
        double calorieLimit = Math.max(250.0, calorieBudget * 1.10);
        double moneyLimit = Math.max(5_000.0, moneyBudget);

        double scale = 1.0;
        if (calories > calorieLimit) {
            scale = Math.min(scale, calorieLimit / calories);
        }
        if (cost > moneyLimit) {
            scale = Math.min(scale, moneyLimit / cost);
        }

        if (scale >= 0.999) {
            return lines;
        }

        double finalScale = Math.max(0.35, scale);
        return lines.stream()
                .map(line -> {
                    // Keep free inventory ingredients a bit more stable; shrink purchased lines harder.
                    double lineScale = line.fromInventory() ? Math.max(finalScale, 0.75) : finalScale;
                    BigDecimal grams = normalizeServing(line.food(), line.quantityGrams()
                            .multiply(BigDecimal.valueOf(lineScale))
                            .setScale(2, RoundingMode.HALF_UP));
                    return buildSolvedLine(line.dish(), line.food(), grams, line.fromInventory());
                })
                .filter(line -> line.quantityGrams().compareTo(BigDecimal.ZERO) > 0)
                .toList();
    }

    private void solveCategory(
            List<DishIngredient> candidates,
            double macroNeeded,
            MacroKind macroKind,
            List<UserInventory> inventory,
            List<SolvedLine> solved
    ) {
        if (candidates.isEmpty() || macroNeeded <= 0) {
            return;
        }
        double splitTarget = macroNeeded / candidates.size();
        for (DishIngredient candidate : candidates) {
            Food food = candidate.getFood();
            double per100 = macroKind == MacroKind.PROTEIN
                    ? safe(food.getProteinPer100g())
                    : safe(food.getCarbsPer100g());
            if (per100 <= 0) {
                continue;
            }
            BigDecimal grams = BigDecimal.valueOf((splitTarget / per100) * 100.0)
                    .setScale(2, RoundingMode.HALF_UP);
            solved.add(buildSolvedLine(candidate, normalizeServing(food, grams), inventory));
        }
    }

    private BigDecimal normalizeServing(Food food, BigDecimal theoreticalGrams) {
        if (theoreticalGrams == null || theoreticalGrams.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        if (food.getServingUnit() == Food.ServingUnit.PIECE
                && food.getGramsPerPiece() != null
                && food.getGramsPerPiece().compareTo(BigDecimal.ZERO) > 0) {
            double rawPieces = theoreticalGrams.doubleValue() / food.getGramsPerPiece().doubleValue();
            long actualPieces = Math.max(1L, Math.round(rawPieces));
            return food.getGramsPerPiece()
                    .multiply(BigDecimal.valueOf(actualPieces))
                    .setScale(2, RoundingMode.HALF_UP);
        }

        double roundedGrams = Math.round(theoreticalGrams.doubleValue() / 5.0) * 5.0;
        if (roundedGrams <= 0.0) {
            roundedGrams = 5.0;
        }
        return BigDecimal.valueOf(roundedGrams).setScale(2, RoundingMode.HALF_UP);
    }

    private SolvedLine buildSolvedLine(DishIngredient ingredient, BigDecimal grams, List<UserInventory> inventory) {
        Food food = ingredient.getFood();
        boolean fromInventory = inventory.stream().anyMatch(item -> inventoryMatchesFood(item, food));
        return buildSolvedLine(ingredient.getDish(), food, grams, fromInventory);
    }

    private SolvedLine buildSolvedLine(Dish dish, Food food, BigDecimal grams, boolean fromInventory) {
        MacroTarget lineMacro = nutritionFor(food, grams);
        int cost = fromInventory ? 0 : lineCost(food, grams);
        return new SolvedLine(
                dish,
                food,
                grams,
                lineMacro.calories(),
                lineMacro.protein(),
                lineMacro.carbs(),
                lineMacro.fat(),
                cost,
                fromInventory
        );
    }

    private PersonalizedNutritionPlan createPlanShell(
            User user,
            UserBodyProfile profile,
            SmartDishPlanAiResponseDTO aiPlan,
            int days,
            int budgetPerDay
    ) {
        PersonalizedNutritionPlan plan = new PersonalizedNutritionPlan();
        plan.setUser(user);
        plan.setAiPlanId(aiPlan.getPlanId());
        plan.setVersion(1);
        plan.setStartDate(LocalDate.now());
        plan.setEndDate(LocalDate.now().plusDays(days - 1L));
        plan.setDurationDays(days);
        plan.setTargetBudgetPerDay(budgetPerDay);
        MacroTarget target = targetMacros(profile);
        plan.setTargetCalories(target.calories());
        plan.setTargetProtein(target.protein());
        plan.setTargetCarbs(target.carbs());
        plan.setTargetFat(target.fat());
        plan.setAiPromptVersion("groq_dish_only_v1");
        plan.setGenerationNotes("hybrid_master_data_heuristic_solver_v1");
        plan.setStatus(PersonalizedNutritionPlan.PlanStatus.ACTIVE);
        plan.setIsDeleted(false);
        plan.setCreatedAt(ZonedDateTime.now());
        return planRepository.save(plan);
    }

    private PersonalizedMealDetail createMealDetail(
            PersonalizedNutritionPlan plan,
            Dish dish,
            Integer dayNumber,
            PersonalizedMealDetail.MealType mealType,
            List<SolvedLine> lines
    ) {
        PersonalizedMealDetail detail = new PersonalizedMealDetail();
        detail.setPersonalizedPlan(plan);
        detail.setDish(dish);
        detail.setDayNumber(dayNumber);
        detail.setMealType(mealType);
        detail.setWasEaten(false);
        detail.setAiPromptVersion("groq_dish_only_v1");
        detail.setMealItemsJson(null);
        detail.setCreatedAt(ZonedDateTime.now());
        detail.setTotalCalories(lines.stream().mapToDouble(SolvedLine::calories).sum());
        detail.setTotalProtein(lines.stream().mapToDouble(SolvedLine::protein).sum());
        detail.setTotalCarbs(lines.stream().mapToDouble(SolvedLine::carbs).sum());
        detail.setTotalFat(lines.stream().mapToDouble(SolvedLine::fat).sum());
        detail.setEstimatedCost(lines.stream().mapToInt(SolvedLine::costVnd).sum());
        return detail;
    }

    private PersonalizedMealItem toMealItem(PersonalizedMealDetail detail, SolvedLine line) {
        PersonalizedMealItem item = new PersonalizedMealItem();
        item.setMealDetail(detail);
        item.setDish(line.dish());
        item.setFood(line.food());
        item.setQuantityGrams(line.quantityGrams());
        item.setFromInventory(line.fromInventory());
        item.setLineCalories(line.calories());
        item.setLineProtein(line.protein());
        item.setLineCarbs(line.carbs());
        item.setLineFat(line.fat());
        item.setLineCostVnd(line.costVnd());
        return item;
    }

    private MacroTarget targetMacros(UserBodyProfile profile) {
        double calories = profile.getRecommendedCalories() != null
                ? profile.getRecommendedCalories().doubleValue()
                : 2000.0;
        double weight = profile.getWeight() != null ? profile.getWeight().doubleValue() : 65.0;
        double protein = Math.max(80.0, weight * 1.8);
        double fat = Math.max(40.0, (calories * 0.25) / 9.0);
        double carbs = Math.max(120.0, (calories - protein * 4.0 - fat * 9.0) / 4.0);
        return new MacroTarget(calories, protein, carbs, fat);
    }

    private MacroTarget nutritionFor(Food food, BigDecimal grams) {
        double factor = grams.doubleValue() / 100.0;
        return new MacroTarget(
                safe(food.getCaloriesPer100g()) * factor,
                safe(food.getProteinPer100g()) * factor,
                safe(food.getCarbsPer100g()) * factor,
                safe(food.getFatPer100g()) * factor
        );
    }

    private MacroTarget totalNutrition(List<SolvedLine> lines) {
        return new MacroTarget(
                lines.stream().mapToDouble(SolvedLine::calories).sum(),
                lines.stream().mapToDouble(SolvedLine::protein).sum(),
                lines.stream().mapToDouble(SolvedLine::carbs).sum(),
                lines.stream().mapToDouble(SolvedLine::fat).sum()
        );
    }

    private int lineCost(Food food, BigDecimal grams) {
        int listedPrice = food.getAverageMarketPriceVnd() != null ? food.getAverageMarketPriceVnd() : 0;
        if (food.getServingUnit() == Food.ServingUnit.PIECE
                && food.getGramsPerPiece() != null
                && food.getGramsPerPiece().compareTo(BigDecimal.ZERO) > 0) {
            long pieces = Math.max(1L, Math.round(grams.doubleValue() / food.getGramsPerPiece().doubleValue()));
            return (int) Math.round(pieces * listedPrice);
        }
        return (int) Math.round((grams.doubleValue() / 100.0) * listedPrice);
    }

    private boolean inventoryMatchesFood(UserInventory inventory, Food food) {
        if (inventory.getFood() != null && Objects.equals(inventory.getFood().getFoodId(), food.getFoodId())) {
            return true;
        }
        String inventoryName = normalize(inventory.getDisplayName());
        String foodName = normalize(food.getName());
        return !inventoryName.isBlank() && !foodName.isBlank()
                && (inventoryName.contains(foodName) || foodName.contains(inventoryName));
    }

    private PersonalizedMealDetail.MealType parseMealType(String value) {
        try {
            return PersonalizedMealDetail.MealType.valueOf(value == null ? "" : value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return PersonalizedMealDetail.MealType.LUNCH;
        }
    }

    private double mealMacroRatio(PersonalizedMealDetail.MealType mealType) {
        return switch (mealType) {
            case BREAKFAST -> 0.25;
            case LUNCH -> 0.35;
            case DINNER -> 0.35;
            case SNACK -> 0.05;
        };
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private double safe(BigDecimal value) {
        return value != null ? value.doubleValue() : 0.0;
    }

    private double safe(Integer value) {
        return value != null ? value.doubleValue() : 0.0;
    }

    private <T> List<T> safeList(List<T> value) {
        return value == null ? List.of() : value;
    }

    private enum MacroKind {
        PROTEIN, CARB
    }

    public record MacroTarget(double calories, double protein, double carbs, double fat) {
        MacroTarget scale(double ratio) {
            return new MacroTarget(calories * ratio, protein * ratio, carbs * ratio, fat * ratio);
        }

        MacroTarget minus(MacroTarget other) {
            return new MacroTarget(
                    Math.max(0, calories - other.calories),
                    Math.max(0, protein - other.protein),
                    Math.max(0, carbs - other.carbs),
                    Math.max(0, fat - other.fat)
            );
        }

        MacroTarget copy() {
            return new MacroTarget(calories, protein, carbs, fat);
        }
    }

    public record SolvedLine(
            Dish dish,
            Food food,
            BigDecimal quantityGrams,
            double calories,
            double protein,
            double carbs,
            double fat,
            int costVnd,
            boolean fromInventory
    ) {
    }
}
