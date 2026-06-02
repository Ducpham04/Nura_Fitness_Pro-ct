package com.example.fitchallenge.service.impl;

import com.example.fitchallenge.Entity.*;
import com.example.fitchallenge.repository.*;
import com.example.fitchallenge.repository.GoalRepository;
import com.example.fitchallenge.repository.User.UserRepository;
import com.example.fitchallenge.service.DataSeederService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

/**
 * Service để import dữ liệu mẫu vào database
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DataSeederServiceImpl implements DataSeederService {

    @Autowired
    private final UserRepository userRepository;
    @Autowired
    private final RoleRepository roleRepository;
    @Autowired
    private final GoalRepository goalRepository;
    @Autowired
    private final ChallengeRepository challengeRepository;
    @Autowired
    private final TrainingPlanRepository trainingPlanRepository;
    @Autowired
    private final TrainingPlanDetailRepository trainingPlanDetailRepository;
    @Autowired
    private final DailyTrainingLogRepository dailyTrainingLogRepository;
    @Autowired
    private final UserChallengeRepository userChallengeRepository;
    @Autowired
    private final HealthProfileRepository healthProfileRepository;
    @Autowired
    private final InformationBodyUserRepository informationBodyUserRepository;
    @Autowired
    private final BudgetTrackingRepository budgetTrackingRepository;
    private final RewardRepository rewardRepository;
    private final RewardRedemptionRepository rewardRedemptionRepository;
    private final UserTrainingRepository userTrainingRepository;
    private final PersonalizedPlanDetailRepository personalizedPlanDetailRepository;
    private final FoodRepository foodRepository;
    private final UserInventoryRepository userInventoryRepository;
    private final PersonalizedNutritionPlanRepository personalizedNutritionPlanRepository;
    private final PersonalizedMealDetailRepository personalizedMealDetailRepository;
    private final DishRepository dishRepository;
    private final DishIngredientRepository dishIngredientRepository;
    private final UserPreferenceRepository userPreferenceRepository;
    private final NotificationRepository notificationRepository;
    private final BodyMetricHistoryRepository bodyMetricHistoryRepository;
    private final AiEvaluationLogRepository aiEvaluationLogRepository;
    private final AiModelEventRepository aiModelEventRepository;
    private final PlanVersionHistoryRepository planVersionHistoryRepository;
    private final ReportRepository reportRepository;
    private final TransactionRepository transactionRepository;
    private final UserBodyProfileRepository userBodyProfileRepository;
    private final ExerciseRepository exerciseRepository;
    private final PasswordEncoder passwordEncoder;
    private final GoalRepository goalsRepository ;

    private static final String[] FIRST_NAMES = {
        "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng",
        "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Đinh", "Đào", "Mai", "Tô"
    };

    private static final String[] LAST_NAMES = {
        "Văn", "Thị", "Minh", "Anh", "Hùng", "Dũng", "Hoa", "Lan", "Hương", "Linh",
        "Nam", "Bình", "Hạnh", "Phúc", "Thành", "Tài", "Đức", "Khang", "Tuấn", "Quang"
    };

    private static final String[] CHALLENGE_TITLES = {
        "Push-up Challenge", "Squat Challenge", "Plank Challenge", "Pull-up Challenge",
        "Sit-up Challenge", "Burpee Challenge", "Jump Rope Challenge", "Mountain Climber Challenge",
        "Lunges Challenge", "Deadlift Challenge", "Bench Press Challenge", "Running Challenge"
    };

    private static final String[] TRAINING_PLAN_TITLES = {
        "Beginner Full Body", "Intermediate Strength", "Advanced Power", "Cardio Blast",
        "Muscle Building", "Weight Loss", "Endurance Training", "Flexibility & Mobility"
    };

    @Override
    @Transactional
    public DataSeederResult importAllData() {
        DataSeederResult result = new DataSeederResult();

        log.debug("🚀 Bắt đầu import dữ liệu mẫu...");

        // 0. Import Roles (nếu chưa có)
        if (roleRepository.count() == 0) {
            importRoles();
        }

        // 1. Import Goals (nếu chưa có)
        if (goalRepository.count() == 0) {
            importGoals();
        }

        // 1.1. Import/complete Exercise master data even when older seed data exists.
        int exerciseCount = seedMissingDefaultExercises();
        result.setExercisesCreated(exerciseCount);

        // 2. Import Users
        int usersCount = importUsers(20); // Reduced for speed
        result.setUsersCreated(usersCount);
        
        // 3. Import Challenges
        int challengesCount = importChallenges(20);
        result.setChallengesCreated(challengesCount);
        
        // 4. Import Training Plans
        int plansCount = importTrainingPlans(10);
        result.setTrainingPlansCreated(plansCount);
        
        // 5. Import Health Profiles & Body Info
        int healthCount = importHealthProfiles();
        result.setHealthProfilesCreated(healthCount);
        
        // 6. Import Daily Training Logs
        int logsCount = importDailyTrainingLogs(100);
        result.setDailyLogsCreated(logsCount);
        
        // 7. Import User Challenges
        int userChallengesCount = importUserChallenges(50);
        result.setUserChallengesCreated(userChallengesCount);

        // 8. Import Budget Tracking
        int budgetCount = importBudgetTracking(100);
        result.setBudgetRecordsCreated(budgetCount);

        // 9. Import Rewards
        int rewardsCount = importRewards();
        result.setRewardsCreated(rewardsCount);

        // 10. Import User Training Plans & Personalized Details
        int userTrainingCount = importUserTrainingPlans();

        // 11. Import Foods
        int foodCount = importFoods();
        result.setFoodsCreated(foodCount);

        // 12. Import Hybrid Smart Meal catalog (dishes + dish ingredients)
        int hybridMealCount = importHybridMealCatalog();
        result.setHybridMealRecordsCreated(hybridMealCount);

        // 13. Import UserInventory, Notifications, BodyMetrics, Preferences
        int extraCount = importExtraData();

        // 14. Import remaining: UserBodyProfile, Transaction, RewardRedemption, AiLogs, Reports
        int remainingCount = importRemainingEntities();
        
        int total = usersCount + exerciseCount + challengesCount + plansCount + healthCount + logsCount + userChallengesCount + budgetCount + rewardsCount + userTrainingCount + foodCount + hybridMealCount + extraCount + remainingCount;
        result.setTotalRecords(total);
        
        log.debug("✅ Hoàn thành import dữ liệu! Tổng: {}", total + " records");
        
        return result;
    }

    @Transactional
    public int importUserTrainingPlans() {
        List<User> users = userRepository.findAll();
        List<TrainingPlan> templates = trainingPlanRepository.findAll();
        if (users.isEmpty() || templates.isEmpty()) return 0;

        Random random = new Random();
        int count = 0;

        // Seed active training plans for 50% of users
        for (int i = 0; i < users.size() / 2; i++) {
            User user = users.get(i);
            TrainingPlan template = templates.get(random.nextInt(templates.size()));

            UserTraining ut = new UserTraining();
            ut.setUser(user);
            ut.setTrainingPlan(template);
            ut.setStartDate(LocalDate.now().minusDays(random.nextInt(7)));
            ut.setEndDate(ut.getStartDate().plusWeeks(template.getDurationWeeks() != null ? template.getDurationWeeks() : 4));
            ut.setStatus("active");
            ut.setCompletionPercentage(random.nextDouble() * 50);
            userTrainingRepository.save(ut);

            // Seed personalized plan details for this user training
            List<TrainingPlanDetail> templateDetails = trainingPlanDetailRepository.findByTrainingPlan_TpId(template.getTpId());
            for (TrainingPlanDetail td : templateDetails) {
                PersonalizedPlanDetail ppd = new PersonalizedPlanDetail();
                ppd.setUtId(ut.getUtId());
                ppd.setTpdId(td.getTpdId());
                ppd.setUser(user);
                ppd.setDayNumber(td.getDayNumber());
                ppd.setExercise(td.getExercise());
                ppd.setExerciseName(td.getExercise() != null ? td.getExercise().getExerciseName() : "Exercise");
                ppd.setSets(td.getSets());
                ppd.setReps(td.getReps());
                ppd.setRestTime(td.getRestTime());
                ppd.setDifficulty(td.getExercise() != null && td.getExercise().getDifficultyLevel() != null
                        ? td.getExercise().getDifficultyLevel().name() : "MEDIUM");
                ppd.setTargetMuscle(td.getExercise() != null && td.getExercise().getPrimaryMuscle() != null
                        ? td.getExercise().getPrimaryMuscle() : "Mixed");
                ppd.setEstimatedCalories(200 + random.nextInt(200));
                personalizedPlanDetailRepository.save(ppd);
            }
            count++;
        }
        return count;
    }

    @Override
    @Transactional
    public int importUsers(int count) {
        List<Role> roles = roleRepository.findAll();
        if (roles.isEmpty()) {
            throw new RuntimeException("Không tìm thấy Role nào. Vui lòng tạo Role trước.");
        }
        
        Role userRole = roles.stream()
            .filter(r -> "USER".equalsIgnoreCase(r.getRoleName()) || "user".equalsIgnoreCase(r.getRoleName()))
            .findFirst()
            .orElse(roles.get(0));
        
        List<User> users = new ArrayList<>();
        Random random = new Random();
        
        for (int i = 0; i < count; i++) {
            String firstName = FIRST_NAMES[random.nextInt(FIRST_NAMES.length)];
            String lastName = LAST_NAMES[random.nextInt(LAST_NAMES.length)];
            String fullName = firstName + " " + lastName;
            String email = "user" + (i + 1) + "@example.com";
            
            // Kiểm tra email đã tồn tại chưa
            if (userRepository.existsByEmail(email)) {
                email = "user" + System.currentTimeMillis() + i + "@example.com";
            }
            
            User user = new User();
            user.setUserName(fullName.replace(" ", "") + random.nextInt(1000)); // Remove space + random number for unique username
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode("123456")); // Default password
            user.setRole(userRole);
            user.setLinkImage("https://api.dicebear.com/7.x/avataaars/svg?seed=" + fullName);
            user.setCreatedAt(ZonedDateTime.now());
            user.setUpdatedAt(ZonedDateTime.now());
            user.setPoints(random.nextInt(10000)); // Random points 0-10000
            user.setStatus("active");
            
            users.add(user);
        }
        
        userRepository.saveAll(users);
        return users.size();
    }

    @Override
    @Transactional
    public int importChallenges(int count) {
        List<Goals> goals = goalRepository.findAll();
        if (goals.isEmpty()) {
            // Tạo goals mẫu nếu chưa có
            importGoals();
            goals = goalRepository.findAll();
        }
        
        Random random = new Random();
        List<Challenges> challenges = new ArrayList<>();
        
        Challenges.Status[] statuses = {Challenges.Status.ACTIVE, Challenges.Status.ACTIVE, Challenges.Status.ACTIVE, Challenges.Status.INACTIVE};
        List<Exercise> exercises = exerciseRepository.findAll();
        if (exercises.isEmpty()) {
            exercises = seedDefaultExercises();
        }
        
        for (int i = 0; i < count; i++) {
            Goals goal = goals.get(random.nextInt(goals.size()));
            String title = CHALLENGE_TITLES[random.nextInt(CHALLENGE_TITLES.length)] + " #" + (i + 1);
            
            Challenges challenge = new Challenges();
            challenge.setGoal(goal);
            challenge.setTitle(title);
            challenge.setDescription("Complete " + title + " with proper form. AI will analyze your performance.");
            challenge.setDurationDays(7 + random.nextInt(21));
            challenge.setRewardPoints(random.nextInt(500) + 100);
            challenge.setReward((random.nextInt(500) + 100) + " AI Points");
            challenge.setAiRulesJson("{\"min_rom_score\":0.75,\"min_quality_score\":0.7}");
            challenge.setStatus(statuses[random.nextInt(statuses.length)]);
            challenge.getExercises().add(exercises.get(random.nextInt(exercises.size())));
            
            challenges.add(challenge);
        }
        
        challengeRepository.saveAll(challenges);
        return challenges.size();
    }

    @Override
    @Transactional
    public int importTrainingPlans(int count) {
        List<Goals> goals = goalRepository.findAll();
        if (goals.isEmpty()) {
            importGoals();
            goals = goalRepository.findAll();
        }
        
        Random random = new Random();
        List<TrainingPlan> plans = new ArrayList<>();
        
        String[] difficulties = {"beginner", "intermediate", "advanced"};
        
        for (int i = 0; i < count; i++) {
            Goals goal = goals.get(random.nextInt(goals.size()));
            String title = TRAINING_PLAN_TITLES[random.nextInt(TRAINING_PLAN_TITLES.length)] + " #" + (i + 1);
            
            TrainingPlan plan = new TrainingPlan();
            plan.setGoal(goal);
            plan.setTitle(title);
            plan.setDescription("A comprehensive " + title.toLowerCase() + " program designed for all fitness levels.");
            plan.setDifficultyLevel(difficulties[random.nextInt(difficulties.length)]);
            plan.setDurationWeeks(random.nextInt(8) + 4); // 4-12 weeks
            
            plans.add(plan);
        }
        
        trainingPlanRepository.saveAll(plans);
        
        // Tạo training plan details cho mỗi plan bằng Exercise master data
        List<Exercise> exercises = exerciseRepository.findAll();
        if (exercises.isEmpty()) {
            exercises = seedDefaultExercises();
        }
        if (!exercises.isEmpty()) {
            for (TrainingPlan plan : plans) {
                createTrainingPlanDetails(plan, exercises, random);
            }
        }
        
        return plans.size();
    }

    private void createTrainingPlanDetails(TrainingPlan plan, List<Exercise> exercises, Random random) {
        int days = plan.getDurationWeeks() * 7; // Total days
        List<TrainingPlanDetail> details = new ArrayList<>();
        
        for (int day = 1; day <= Math.min(days, 30); day++) { // Limit to 30 days max
            Exercise exercise = exercises.get(random.nextInt(exercises.size()));
            
            TrainingPlanDetail detail = new TrainingPlanDetail();
            detail.setTrainingPlan(plan);
            detail.setDayNumber(day);
            detail.setExercise(exercise);
            detail.setSets(exercise.getDefaultSets() != null ? exercise.getDefaultSets() : random.nextInt(3) + 2);
            detail.setReps(exercise.getDefaultReps() != null ? exercise.getDefaultReps() : random.nextInt(20) + 10);
            detail.setRestTime(exercise.getDefaultRestSeconds() != null ? exercise.getDefaultRestSeconds() : 60);
            
            details.add(detail);
        }
        
        trainingPlanDetailRepository.saveAll(details);
    }

    private List<Exercise> seedDefaultExercises() {
        seedMissingDefaultExercises();
        return exerciseRepository.findAll();
    }

    @Override
    @Transactional
    public int importExercises() {
        return seedMissingDefaultExercises();
    }

    private int seedMissingDefaultExercises() {
        List<Exercise> exercises = new ArrayList<>();
        List<Exercise> existingExercises = exerciseRepository.findAll();
        Set<String> existingNames = existingExercises.stream()
                .map(Exercise::getExerciseName)
                .filter(Objects::nonNull)
                .map(name -> name.toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());

        exercises.add(Exercise.builder().exerciseName("Push Up").exerciseNameVi("Chống Đẩy").description("Compound upper-body push for chest, shoulders, triceps, and trunk bracing.")
                .exerciseType("PUSH_UP")
                .difficultyLevel(Exercise.DifficultyLevel.EASY).requiredEquipment("BODYWEIGHT")
                .movementPattern("PUSH").primaryMuscle("Chest").secondaryMuscles("Shoulders,Triceps,Core").wristLoading(true)
                .contraindicatedInjuries("wrist,shoulder,acute chest pain")
                .defaultSets(3).defaultReps(12).defaultRestSeconds(60).status("ACTIVE").build());
        exercises.add(Exercise.builder().exerciseName("Incline Push Up").exerciseNameVi("Chống Đẩy Nghiêng").description("Lower-load push-up variation suitable for beginners or return-to-training phases.")
                .exerciseType("PUSH_UP")
                .difficultyLevel(Exercise.DifficultyLevel.EASY).requiredEquipment("BENCH")
                .equipmentAlternatives("table,wall,stable chair").movementPattern("PUSH").primaryMuscle("Chest")
                .secondaryMuscles("Shoulders,Triceps,Core").wristLoading(true)
                .contraindicatedInjuries("wrist,shoulder")
                .defaultSets(3).defaultReps(10).defaultRestSeconds(60).status("ACTIVE").build());
        exercises.add(Exercise.builder().exerciseName("Knee Push Up").exerciseNameVi("Chống Đẩy Đầu Gối").description("Reduced-load horizontal push focused on controlled range of motion.")
                .exerciseType("PUSH_UP")
                .difficultyLevel(Exercise.DifficultyLevel.EASY).requiredEquipment("BODYWEIGHT")
                .movementPattern("PUSH").primaryMuscle("Chest").secondaryMuscles("Shoulders,Triceps")
                .wristLoading(true).contraindicatedInjuries("wrist,shoulder,knee")
                .defaultSets(3).defaultReps(10).defaultRestSeconds(60).status("ACTIVE").build());
        exercises.add(Exercise.builder().exerciseName("Pike Push Up").exerciseNameVi("Chống Đẩy Chữ A").description("Bodyweight overhead pressing pattern emphasizing shoulder strength.")
                .exerciseType("PUSH_UP")
                .difficultyLevel(Exercise.DifficultyLevel.HARD).requiredEquipment("BODYWEIGHT")
                .movementPattern("PUSH").primaryMuscle("Shoulders").secondaryMuscles("Triceps,Upper Chest,Core")
                .shoulderOverhead(true).wristLoading(true).contraindicatedInjuries("shoulder,vai,wrist,neck")
                .defaultSets(3).defaultReps(8).defaultRestSeconds(90).status("ACTIVE").build());
        exercises.add(Exercise.builder().exerciseName("Wide Push Up").exerciseNameVi("Chống Đẩy Rộng Tay").description("Horizontal push-up variation emphasizing chest with bodyweight-only setup.")
                .exerciseType("PUSH_UP")
                .difficultyLevel(Exercise.DifficultyLevel.MEDIUM).requiredEquipment("BODYWEIGHT")
                .movementPattern("PUSH").primaryMuscle("Chest").secondaryMuscles("Shoulders,Triceps,Core")
                .wristLoading(true).contraindicatedInjuries("wrist,shoulder")
                .defaultSets(3).defaultReps(10).defaultRestSeconds(75).status("ACTIVE")
                .forceType("PUSH").exerciseCategory("COMPOUND").metValue(BigDecimal.valueOf(5.0)).tempo("3-0-1").rpeMin((short) 5).rpeMax((short) 7).build());
        exercises.add(Exercise.builder().exerciseName("Diamond Push Up").exerciseNameVi("Chống Đẩy Kim Cương").description("Narrow-grip push-up variation emphasizing triceps and chest control.")
                .exerciseType("PUSH_UP")
                .difficultyLevel(Exercise.DifficultyLevel.HARD).requiredEquipment("BODYWEIGHT")
                .movementPattern("PUSH").primaryMuscle("Triceps").secondaryMuscles("Chest,Shoulders,Core")
                .wristLoading(true).contraindicatedInjuries("wrist,elbow,shoulder")
                .defaultSets(3).defaultReps(8).defaultRestSeconds(90).status("ACTIVE")
                .forceType("PUSH").exerciseCategory("COMPOUND").metValue(BigDecimal.valueOf(5.5)).tempo("3-0-1").rpeMin((short) 7).rpeMax((short) 9).build());
        exercises.add(Exercise.builder().exerciseName("Bodyweight Squat").exerciseNameVi("Ngồi Xổm Tự Trọng").description("Fundamental knee-dominant lower-body pattern for quads, glutes, and balance.")
                .exerciseType("SQUAT")
                .difficultyLevel(Exercise.DifficultyLevel.EASY).requiredEquipment("BODYWEIGHT")
                .movementPattern("SQUAT").primaryMuscle("Quadriceps").secondaryMuscles("Glutes,Hamstrings,Core").kneeDominant(true)
                .contraindicatedInjuries("acute knee pain,goi,hip")
                .defaultSets(3).defaultReps(15).defaultRestSeconds(75).status("ACTIVE").build());
        exercises.add(Exercise.builder().exerciseName("Goblet Squat").exerciseNameVi("Ngồi Xổm Tạ Trước Ngực").description("Loaded squat variation that encourages upright torso and depth control.")
                .exerciseType("SQUAT")
                .difficultyLevel(Exercise.DifficultyLevel.MEDIUM).requiredEquipment("DUMBBELL")
                .equipmentAlternatives("kettlebell,backpack").movementPattern("SQUAT").primaryMuscle("Quadriceps")
                .secondaryMuscles("Glutes,Adductors,Core").kneeDominant(true).spinalLoading(true)
                .contraindicatedInjuries("knee,goi,hip,back,lumbar")
                .defaultSets(3).defaultReps(10).defaultRestSeconds(90).status("ACTIVE").build());
        exercises.add(Exercise.builder().exerciseName("Reverse Lunge").exerciseNameVi("Bước Chân Lùi").description("Unilateral lower-body exercise with less forward knee travel than walking lunges.")
                .exerciseType("LUNGE")
                .difficultyLevel(Exercise.DifficultyLevel.MEDIUM).requiredEquipment("BODYWEIGHT")
                .movementPattern("LUNGE").primaryMuscle("Glutes").secondaryMuscles("Quadriceps,Hamstrings,Calves")
                .kneeDominant(true).contraindicatedInjuries("knee,goi,hip,balance disorder")
                .defaultSets(3).defaultReps(10).defaultRestSeconds(75).status("ACTIVE").build());
        exercises.add(Exercise.builder().exerciseName("Single-Leg Romanian Deadlift").exerciseNameVi("Deadlift Một Chân Tự Trọng").description("Bodyweight hip-hinge drill for hamstrings, glutes, and balance without external loading.")
                .exerciseType("DEADLIFT")
                .difficultyLevel(Exercise.DifficultyLevel.MEDIUM).requiredEquipment("BODYWEIGHT")
                .movementPattern("HINGE").primaryMuscle("Hamstrings").secondaryMuscles("Glutes,Core,Calves")
                .contraindicatedInjuries("acute hamstring strain,balance disorder")
                .defaultSets(3).defaultReps(10).defaultRestSeconds(75).status("ACTIVE")
                .forceType("LEGS").exerciseCategory("COMPOUND").metValue(BigDecimal.valueOf(4.5)).tempo("3-1-1").rpeMin((short) 5).rpeMax((short) 7).isBilateral(false).build());
        exercises.add(Exercise.builder().exerciseName("Glute Bridge").exerciseNameVi("Cầu Mông").description("Hip extension drill for glute strength with low spinal loading.")
                .exerciseType("GLUTE_BRIDGE")
                .difficultyLevel(Exercise.DifficultyLevel.EASY).requiredEquipment("BODYWEIGHT")
                .movementPattern("HINGE").primaryMuscle("Glutes").secondaryMuscles("Hamstrings,Core")
                .contraindicatedInjuries("acute hip pain")
                .defaultSets(3).defaultReps(15).defaultRestSeconds(60).status("ACTIVE").build());
        exercises.add(Exercise.builder().exerciseName("Hip Thrust").exerciseNameVi("Đẩy Hông").description("Loaded hip extension exercise for glutes and posterior-chain strength.")
                .exerciseType("HIP_THRUST")
                .difficultyLevel(Exercise.DifficultyLevel.MEDIUM).requiredEquipment("BARBELL")
                .equipmentAlternatives("dumbbell,band").movementPattern("HINGE").primaryMuscle("Glutes")
                .secondaryMuscles("Hamstrings,Core").spinalLoading(true)
                .contraindicatedInjuries("hip,lumbar,back")
                .defaultSets(3).defaultReps(10).defaultRestSeconds(90).status("ACTIVE").build());
        exercises.add(Exercise.builder().exerciseName("Dumbbell Romanian Deadlift").exerciseNameVi("Deadlift Romania Tạ Đơn").description("Hip-hinge strength exercise emphasizing hamstrings and posterior-chain control.")
                .exerciseType("DEADLIFT")
                .difficultyLevel(Exercise.DifficultyLevel.MEDIUM).requiredEquipment("DUMBBELL")
                .equipmentAlternatives("kettlebell,barbell,backpack").movementPattern("HINGE").primaryMuscle("Hamstrings")
                .secondaryMuscles("Glutes,Lower Back,Core").spinalLoading(true)
                .contraindicatedInjuries("back,spine,lumbar,disc,thoat vi,cot song")
                .defaultSets(3).defaultReps(10).defaultRestSeconds(90).status("ACTIVE").build());
        exercises.add(Exercise.builder().exerciseName("Bird Dog").exerciseNameVi("Chim Chó").description("Low-load anti-rotation core exercise for trunk control and hip-shoulder coordination.")
                .exerciseType("CORE")
                .difficultyLevel(Exercise.DifficultyLevel.EASY).requiredEquipment("BODYWEIGHT")
                .movementPattern("CORE").primaryMuscle("Core").secondaryMuscles("Glutes,Lower Back,Shoulders")
                .wristLoading(true).contraindicatedInjuries("wrist,knee,acute low back pain")
                .defaultSets(2).defaultReps(10).defaultRestSeconds(45).status("ACTIVE").build());
        exercises.add(Exercise.builder().exerciseName("Dead Bug").exerciseNameVi("Con Bọ Nằm Ngửa").description("Supine anti-extension core exercise with low joint impact.")
                .exerciseType("CORE")
                .difficultyLevel(Exercise.DifficultyLevel.EASY).requiredEquipment("BODYWEIGHT")
                .movementPattern("CORE").primaryMuscle("Core").secondaryMuscles("Hip Flexors")
                .contraindicatedInjuries("acute low back pain")
                .defaultSets(3).defaultReps(10).defaultRestSeconds(45).status("ACTIVE").build());
        exercises.add(Exercise.builder().exerciseName("Side Plank").exerciseNameVi("Plank Nghiêng").description("Lateral trunk stability exercise for obliques and shoulder endurance.")
                .exerciseType("PLANK")
                .difficultyLevel(Exercise.DifficultyLevel.MEDIUM).requiredEquipment("BODYWEIGHT")
                .movementPattern("CORE").primaryMuscle("Obliques").secondaryMuscles("Shoulders,Glutes")
                .wristLoading(false).contraindicatedInjuries("shoulder,vai,elbow,hip")
                .defaultSets(3).defaultReps(1).defaultRestSeconds(60).status("ACTIVE").build());
        exercises.add(Exercise.builder().exerciseName("Jumping Jacks").exerciseNameVi("Nhảy Dang Tay Chân").description("Moderate-to-vigorous full-body aerobic drill; choose low-impact option if needed.")
                .exerciseType("JUMP")
                .difficultyLevel(Exercise.DifficultyLevel.EASY).requiredEquipment("BODYWEIGHT")
                .movementPattern("CARDIO").primaryMuscle("Full Body").highImpact(true).kneeDominant(true)
                .contraindicatedInjuries("knee,goi,ankle,plantar fasciitis")
                .defaultSets(3).defaultReps(20).defaultRestSeconds(45).status("ACTIVE").build());
        exercises.add(Exercise.builder().exerciseName("Low Impact Step Jack").exerciseNameVi("Nhảy Dang Nhẹ Nhàng").description("Low-impact aerobic alternative to jumping jacks.")
                .exerciseType("CARDIO")
                .difficultyLevel(Exercise.DifficultyLevel.EASY).requiredEquipment("BODYWEIGHT")
                .movementPattern("CARDIO").primaryMuscle("Full Body").secondaryMuscles("Calves,Shoulders")
                .defaultSets(3).defaultReps(30).defaultRestSeconds(45).status("ACTIVE").build());
        exercises.add(Exercise.builder().exerciseName("Mountain Climber").exerciseNameVi("Leo Núi Tại Chỗ").description("Dynamic plank-based cardio and core exercise.")
                .exerciseType("CARDIO")
                .difficultyLevel(Exercise.DifficultyLevel.MEDIUM).requiredEquipment("BODYWEIGHT")
                .movementPattern("CARDIO").primaryMuscle("Core").secondaryMuscles("Shoulders,Hip Flexors,Chest")
                .wristLoading(true).highImpact(true).contraindicatedInjuries("wrist,shoulder,knee,low back")
                .defaultSets(3).defaultReps(30).defaultRestSeconds(60).status("ACTIVE").build());
        exercises.add(Exercise.builder().exerciseName("Burpee").exerciseNameVi("Burpee Toàn Thân").description("High-intensity full-body conditioning movement for advanced users.")
                .exerciseType("BURPEE")
                .difficultyLevel(Exercise.DifficultyLevel.HARD).requiredEquipment("BODYWEIGHT")
                .movementPattern("CARDIO").primaryMuscle("Full Body").secondaryMuscles("Chest,Quads,Core,Shoulders")
                .wristLoading(true).highImpact(true).kneeDominant(true).spinalLoading(true)
                .contraindicatedInjuries("heart symptoms,uncontrolled hypertension,wrist,shoulder,knee,back")
                .defaultSets(3).defaultReps(8).defaultRestSeconds(90).status("ACTIVE").build());
        exercises.add(Exercise.builder().exerciseName("Dumbbell Row").exerciseNameVi("Kéo Tạ Đơn").description("Horizontal pulling movement for back strength and posture.")
                .exerciseType("ROW")
                .difficultyLevel(Exercise.DifficultyLevel.MEDIUM).requiredEquipment("DUMBBELL")
                .equipmentAlternatives("kettlebell,band,backpack").movementPattern("PULL").primaryMuscle("Back")
                .secondaryMuscles("Biceps,Rear Delts,Core").spinalLoading(true)
                .contraindicatedInjuries("acute low back pain,shoulder")
                .defaultSets(3).defaultReps(10).defaultRestSeconds(75).status("ACTIVE").build());
        exercises.add(Exercise.builder().exerciseName("Resistance Band Row").exerciseNameVi("Kéo Dây Kháng Lực").description("Low-impact pulling movement useful for home training and posture work.")
                .exerciseType("ROW")
                .difficultyLevel(Exercise.DifficultyLevel.EASY).requiredEquipment("RESISTANCE_BAND")
                .equipmentAlternatives("cable machine").movementPattern("PULL").primaryMuscle("Back")
                .secondaryMuscles("Biceps,Rear Delts").contraindicatedInjuries("shoulder,vai")
                .defaultSets(3).defaultReps(12).defaultRestSeconds(60).status("ACTIVE").build());
        exercises.add(Exercise.builder().exerciseName("Prone Y Raise").exerciseNameVi("Nâng Tay Chữ Y Nằm Sấp").description("Bodyweight upper-back pull pattern for lower traps and shoulder blade control.")
                .exerciseType("PULL")
                .difficultyLevel(Exercise.DifficultyLevel.EASY).requiredEquipment("BODYWEIGHT")
                .movementPattern("PULL").primaryMuscle("Upper Back").secondaryMuscles("Rear Delts,Lower Traps")
                .contraindicatedInjuries("painful shoulder impingement")
                .defaultSets(3).defaultReps(12).defaultRestSeconds(45).status("ACTIVE")
                .forceType("PULL").exerciseCategory("ISOLATION").metValue(BigDecimal.valueOf(3.0)).tempo("2-1-2").rpeMin((short) 3).rpeMax((short) 5).build());
        exercises.add(Exercise.builder().exerciseName("Reverse Snow Angel").exerciseNameVi("Thiên Thần Tuyết Nằm Sấp").description("Bodyweight posterior-shoulder and upper-back endurance exercise.")
                .exerciseType("PULL")
                .difficultyLevel(Exercise.DifficultyLevel.EASY).requiredEquipment("BODYWEIGHT")
                .movementPattern("PULL").primaryMuscle("Upper Back").secondaryMuscles("Rear Delts,Rhomboids")
                .contraindicatedInjuries("painful shoulder impingement")
                .defaultSets(3).defaultReps(10).defaultRestSeconds(45).status("ACTIVE")
                .forceType("PULL").exerciseCategory("ISOLATION").metValue(BigDecimal.valueOf(3.0)).tempo("2-1-2").rpeMin((short) 3).rpeMax((short) 5).build());
        exercises.add(Exercise.builder().exerciseName("Floor Cobra").exerciseNameVi("Rắn Hổ Mang Nằm Sấp").description("Bodyweight scapular retraction drill for posture and upper-back endurance.")
                .exerciseType("PULL")
                .difficultyLevel(Exercise.DifficultyLevel.EASY).requiredEquipment("BODYWEIGHT")
                .movementPattern("PULL").primaryMuscle("Upper Back").secondaryMuscles("Rear Delts,Glutes")
                .contraindicatedInjuries("acute low back pain")
                .defaultSets(3).defaultReps(12).defaultRestSeconds(45).status("ACTIVE")
                .forceType("PULL").exerciseCategory("ISOLATION").metValue(BigDecimal.valueOf(3.0)).tempo("2-1-2").rpeMin((short) 3).rpeMax((short) 5).build());
        exercises.add(Exercise.builder().exerciseName("Superman Pull").exerciseNameVi("Kéo Superman").description("Bodyweight back-extension and pull pattern for posterior-chain endurance.")
                .exerciseType("PULL")
                .difficultyLevel(Exercise.DifficultyLevel.MEDIUM).requiredEquipment("BODYWEIGHT")
                .movementPattern("PULL").primaryMuscle("Back").secondaryMuscles("Rear Delts,Glutes,Core")
                .spinalLoading(false).contraindicatedInjuries("acute low back pain")
                .defaultSets(3).defaultReps(10).defaultRestSeconds(60).status("ACTIVE")
                .forceType("PULL").exerciseCategory("ISOLATION").metValue(BigDecimal.valueOf(3.5)).tempo("2-1-2").rpeMin((short) 4).rpeMax((short) 6).build());
        exercises.add(Exercise.builder().exerciseName("Pull Up").exerciseNameVi("Xà Đơn").description("Advanced vertical pull for lats, upper back, and grip strength.")
                .exerciseType("PULL_UP")
                .difficultyLevel(Exercise.DifficultyLevel.HARD).requiredEquipment("PULL_UP_BAR")
                .equipmentAlternatives("assisted pull-up machine,resistance band").movementPattern("PULL").primaryMuscle("Back")
                .secondaryMuscles("Biceps,Forearms,Core").shoulderOverhead(true)
                .contraindicatedInjuries("shoulder,elbow,wrist")
                .defaultSets(3).defaultReps(6).defaultRestSeconds(120).status("ACTIVE").build());
        exercises.add(Exercise.builder().exerciseName("Dumbbell Shoulder Press").exerciseNameVi("Đẩy Tạ Vai").description("Vertical press for deltoids and triceps; keep ribs down and avoid painful range.")
                .exerciseType("PRESS")
                .difficultyLevel(Exercise.DifficultyLevel.MEDIUM).requiredEquipment("DUMBBELL")
                .equipmentAlternatives("kettlebell,band").movementPattern("PUSH").primaryMuscle("Shoulders")
                .secondaryMuscles("Triceps,Upper Chest,Core").shoulderOverhead(true)
                .contraindicatedInjuries("shoulder,vai")
                .defaultSets(3).defaultReps(10).defaultRestSeconds(75).status("ACTIVE").build());
        exercises.add(Exercise.builder().exerciseName("Dumbbell Bench Press").exerciseNameVi("Đẩy Tạ Ngực").description("Loaded horizontal press for chest strength with adjustable range of motion.")
                .exerciseType("PRESS")
                .difficultyLevel(Exercise.DifficultyLevel.MEDIUM).requiredEquipment("DUMBBELL")
                .equipmentAlternatives("barbell,resistance band").movementPattern("PUSH").primaryMuscle("Chest")
                .secondaryMuscles("Shoulders,Triceps").contraindicatedInjuries("shoulder,elbow,wrist")
                .defaultSets(3).defaultReps(10).defaultRestSeconds(90).status("ACTIVE").build());
        exercises.add(Exercise.builder().exerciseName("Plank").exerciseNameVi("Plank").description("Anti-extension core exercise; stop if low-back pain replaces abdominal effort.")
                .exerciseType("PLANK")
                .difficultyLevel(Exercise.DifficultyLevel.EASY).requiredEquipment("BODYWEIGHT")
                .movementPattern("CORE").primaryMuscle("Core").secondaryMuscles("Shoulders,Glutes").wristLoading(true)
                .contraindicatedInjuries("wrist,shoulder,acute low back pain")
                .defaultSets(3).defaultReps(1).defaultRestSeconds(60).status("ACTIVE").build());
        exercises.add(Exercise.builder().exerciseName("Calf Raise").exerciseNameVi("Kiễng Gót Chân").description("Ankle plantar-flexion exercise for calf strength and tendon capacity.")
                .exerciseType("CALF_RAISE")
                .difficultyLevel(Exercise.DifficultyLevel.EASY).requiredEquipment("BODYWEIGHT")
                .equipmentAlternatives("dumbbell,step").movementPattern("LOWER_ACCESSORY").primaryMuscle("Calves")
                .contraindicatedInjuries("acute Achilles pain,ankle")
                .defaultSets(3).defaultReps(15).defaultRestSeconds(45).status("ACTIVE").build());
        exercises.add(Exercise.builder().exerciseName("Cat Cow Stretch").exerciseNameVi("Duỗi Lưng Mèo - Bò").description("Gentle spinal mobility drill; move slowly within comfortable range.")
                .exerciseType("STRETCH")
                .difficultyLevel(Exercise.DifficultyLevel.EASY).requiredEquipment("BODYWEIGHT")
                .movementPattern("MOBILITY").primaryMuscle("Mobility")
                .defaultSets(2).defaultReps(8).defaultRestSeconds(30).status("ACTIVE").build());
        exercises.add(Exercise.builder().exerciseName("Thoracic Rotation").exerciseNameVi("Xoay Cột Sống Ngực").description("Upper-back rotation mobility drill for desk workers and overhead athletes.")
                .exerciseType("MOBILITY")
                .difficultyLevel(Exercise.DifficultyLevel.EASY).requiredEquipment("BODYWEIGHT")
                .movementPattern("MOBILITY").primaryMuscle("Thoracic Spine").secondaryMuscles("Shoulders")
                .contraindicatedInjuries("acute rib pain,acute spine pain")
                .defaultSets(2).defaultReps(8).defaultRestSeconds(30).status("ACTIVE").build());
        exercises.add(Exercise.builder().exerciseName("Hip Flexor Stretch").exerciseNameVi("Duỗi Cơ Gấp Hông").description("Static mobility drill for hip extension range and anterior hip tightness.")
                .exerciseType("STRETCH")
                .difficultyLevel(Exercise.DifficultyLevel.EASY).requiredEquipment("BODYWEIGHT")
                .movementPattern("MOBILITY").primaryMuscle("Hip Flexors").secondaryMuscles("Quadriceps")
                .contraindicatedInjuries("acute hip pain,knee")
                .defaultSets(2).defaultReps(1).defaultRestSeconds(20).status("ACTIVE").build());
        exercises.add(Exercise.builder().exerciseName("Wall Slide").exerciseNameVi("Trượt Tường").description("Shoulder mobility and scapular control exercise with low load.")
                .exerciseType("MOBILITY")
                .difficultyLevel(Exercise.DifficultyLevel.EASY).requiredEquipment("BODYWEIGHT")
                .movementPattern("MOBILITY").primaryMuscle("Shoulders").secondaryMuscles("Upper Back")
                .shoulderOverhead(true).contraindicatedInjuries("painful shoulder impingement,vai")
                .defaultSets(2).defaultReps(10).defaultRestSeconds(30).status("ACTIVE").build());

        // ── GYM EQUIPMENT EXERCISES ───────────────────────────────────────────
        // Barbell compound lifts
        exercises.add(Exercise.builder().exerciseName("Barbell Back Squat").exerciseNameVi("Squat Tạ Đòn").description("King of leg exercises. Loads quads, glutes, and hamstrings under full-body tension.")
                .exerciseType("SQUAT").difficultyLevel(Exercise.DifficultyLevel.HARD).requiredEquipment("BARBELL")
                .equipmentAlternatives("dumbbell,goblet squat").movementPattern("SQUAT").primaryMuscle("Quadriceps")
                .secondaryMuscles("Glutes,Hamstrings,Core,Lower Back").kneeDominant(true).spinalLoading(true)
                .contraindicatedInjuries("knee,back,spine,lumbar,disc")
                .defaultSets(4).defaultReps(6).defaultRestSeconds(150).status("ACTIVE")
                .forceType("LEGS").exerciseCategory("COMPOUND").build());

        exercises.add(Exercise.builder().exerciseName("Barbell Deadlift").exerciseNameVi("Deadlift Tạ Đòn").description("Full-body posterior chain exercise for maximum strength and power.")
                .exerciseType("DEADLIFT").difficultyLevel(Exercise.DifficultyLevel.HARD).requiredEquipment("BARBELL")
                .movementPattern("HINGE").primaryMuscle("Hamstrings")
                .secondaryMuscles("Glutes,Lower Back,Traps,Forearms,Core").spinalLoading(true)
                .contraindicatedInjuries("back,spine,lumbar,disc,thoat vi")
                .defaultSets(4).defaultReps(5).defaultRestSeconds(180).status("ACTIVE")
                .forceType("LEGS").exerciseCategory("COMPOUND").build());

        exercises.add(Exercise.builder().exerciseName("Barbell Bench Press").exerciseNameVi("Đẩy Tạ Đòn Nằm").description("Primary horizontal push for maximum chest strength and hypertrophy.")
                .exerciseType("PRESS").difficultyLevel(Exercise.DifficultyLevel.HARD).requiredEquipment("BARBELL")
                .equipmentAlternatives("dumbbell,cable").movementPattern("PUSH").primaryMuscle("Chest")
                .secondaryMuscles("Shoulders,Triceps").contraindicatedInjuries("shoulder,elbow,wrist")
                .defaultSets(4).defaultReps(8).defaultRestSeconds(120).status("ACTIVE")
                .forceType("PUSH").exerciseCategory("COMPOUND").build());

        exercises.add(Exercise.builder().exerciseName("Barbell Bent-Over Row").exerciseNameVi("Kéo Tạ Đòn Cúi").description("Heavy horizontal pulling for maximum back thickness and strength.")
                .exerciseType("ROW").difficultyLevel(Exercise.DifficultyLevel.HARD).requiredEquipment("BARBELL")
                .movementPattern("PULL").primaryMuscle("Back")
                .secondaryMuscles("Biceps,Rear Delts,Core").spinalLoading(true)
                .contraindicatedInjuries("back,spine,lumbar,shoulder")
                .defaultSets(4).defaultReps(8).defaultRestSeconds(120).status("ACTIVE")
                .forceType("PULL").exerciseCategory("COMPOUND").build());

        exercises.add(Exercise.builder().exerciseName("Barbell Overhead Press").exerciseNameVi("Đẩy Tạ Đòn Trên Đầu").description("Strict vertical pressing for shoulder strength and overhead stability.")
                .exerciseType("PRESS").difficultyLevel(Exercise.DifficultyLevel.HARD).requiredEquipment("BARBELL")
                .movementPattern("PUSH").primaryMuscle("Shoulders")
                .secondaryMuscles("Triceps,Upper Chest,Core,Traps").shoulderOverhead(true).spinalLoading(true)
                .contraindicatedInjuries("shoulder,vai,neck,wrist")
                .defaultSets(3).defaultReps(6).defaultRestSeconds(150).status("ACTIVE")
                .forceType("PUSH").exerciseCategory("COMPOUND").build());

        // Dumbbell machine-style exercises
        exercises.add(Exercise.builder().exerciseName("Dumbbell Lateral Raise").exerciseNameVi("Nâng Tạ Đôi Sang Ngang").description("Isolation exercise for side deltoid width and shoulder definition.")
                .exerciseType("PRESS").difficultyLevel(Exercise.DifficultyLevel.EASY).requiredEquipment("DUMBBELL")
                .movementPattern("PUSH").primaryMuscle("Shoulders")
                .secondaryMuscles("Trapezius").contraindicatedInjuries("shoulder,vai,elbow")
                .defaultSets(3).defaultReps(15).defaultRestSeconds(60).status("ACTIVE")
                .forceType("PUSH").exerciseCategory("ISOLATION").build());

        exercises.add(Exercise.builder().exerciseName("Dumbbell Bicep Curl").exerciseNameVi("Cuộn Tạ Tay Trước").description("Classic bicep isolation for arm mass and peak.")
                .exerciseType("CURL").difficultyLevel(Exercise.DifficultyLevel.EASY).requiredEquipment("DUMBBELL")
                .movementPattern("PULL").primaryMuscle("Biceps")
                .secondaryMuscles("Forearms,Brachialis").contraindicatedInjuries("elbow,wrist")
                .defaultSets(3).defaultReps(12).defaultRestSeconds(60).status("ACTIVE")
                .forceType("PULL").exerciseCategory("ISOLATION").build());

        exercises.add(Exercise.builder().exerciseName("Dumbbell Tricep Extension").exerciseNameVi("Duỗi Tạ Tay Sau").description("Overhead tricep extension for full long-head development.")
                .exerciseType("EXTENSION").difficultyLevel(Exercise.DifficultyLevel.EASY).requiredEquipment("DUMBBELL")
                .movementPattern("PUSH").primaryMuscle("Triceps")
                .secondaryMuscles("Shoulders").contraindicatedInjuries("elbow,wrist,shoulder")
                .defaultSets(3).defaultReps(12).defaultRestSeconds(60).status("ACTIVE")
                .forceType("PUSH").exerciseCategory("ISOLATION").build());

        exercises.add(Exercise.builder().exerciseName("Dumbbell Fly").exerciseNameVi("Dang Tạ Đôi Nằm").description("Chest isolation with wide arc for full pec stretch and contraction.")
                .exerciseType("PRESS").difficultyLevel(Exercise.DifficultyLevel.MEDIUM).requiredEquipment("DUMBBELL")
                .movementPattern("PUSH").primaryMuscle("Chest")
                .secondaryMuscles("Front Deltoid,Biceps").contraindicatedInjuries("shoulder,elbow")
                .defaultSets(3).defaultReps(12).defaultRestSeconds(75).status("ACTIVE")
                .forceType("PUSH").exerciseCategory("ISOLATION").build());

        exercises.add(Exercise.builder().exerciseName("Dumbbell Lunges").exerciseNameVi("Bước Lùi Tạ Đôi").description("Weighted unilateral leg exercise for hypertrophy and balance.")
                .exerciseType("LUNGE").difficultyLevel(Exercise.DifficultyLevel.MEDIUM).requiredEquipment("DUMBBELL")
                .movementPattern("LUNGE").primaryMuscle("Quadriceps")
                .secondaryMuscles("Glutes,Hamstrings,Calves").kneeDominant(true)
                .contraindicatedInjuries("knee,goi,hip,ankle")
                .defaultSets(3).defaultReps(10).defaultRestSeconds(75).status("ACTIVE")
                .forceType("LEGS").exerciseCategory("COMPOUND").build());

        // Cable machine exercises
        exercises.add(Exercise.builder().exerciseName("Cable Lat Pulldown").exerciseNameVi("Kéo Xà Máy Cáp").description("Vertical pull targeting lat width. Great alternative to pull-ups.")
                .exerciseType("PULL_UP").difficultyLevel(Exercise.DifficultyLevel.MEDIUM).requiredEquipment("MACHINE")
                .equipmentAlternatives("resistance_band,pull_up_bar").movementPattern("PULL").primaryMuscle("Back")
                .secondaryMuscles("Biceps,Rear Delts").shoulderOverhead(true)
                .contraindicatedInjuries("shoulder,elbow,wrist")
                .defaultSets(3).defaultReps(12).defaultRestSeconds(90).status("ACTIVE")
                .forceType("PULL").exerciseCategory("COMPOUND").build());

        exercises.add(Exercise.builder().exerciseName("Cable Seated Row").exerciseNameVi("Kéo Dây Cáp Ngồi").description("Horizontal pull with constant cable tension for back thickness.")
                .exerciseType("ROW").difficultyLevel(Exercise.DifficultyLevel.EASY).requiredEquipment("MACHINE")
                .movementPattern("PULL").primaryMuscle("Back")
                .secondaryMuscles("Biceps,Rear Delts").contraindicatedInjuries("shoulder,elbow")
                .defaultSets(3).defaultReps(12).defaultRestSeconds(75).status("ACTIVE")
                .forceType("PULL").exerciseCategory("COMPOUND").build());

        exercises.add(Exercise.builder().exerciseName("Cable Tricep Pushdown").exerciseNameVi("Đẩy Dây Cáp Xuống").description("Cable tricep isolation for constant tension throughout the range.")
                .exerciseType("EXTENSION").difficultyLevel(Exercise.DifficultyLevel.EASY).requiredEquipment("MACHINE")
                .movementPattern("PUSH").primaryMuscle("Triceps")
                .secondaryMuscles("Forearms").contraindicatedInjuries("elbow,wrist")
                .defaultSets(3).defaultReps(15).defaultRestSeconds(60).status("ACTIVE")
                .forceType("PUSH").exerciseCategory("ISOLATION").build());

        exercises.add(Exercise.builder().exerciseName("Leg Press Machine").exerciseNameVi("Đẩy Chân Máy").description("Machine quad dominant exercise. Safe spinal alternative to barbell squat.")
                .exerciseType("SQUAT").difficultyLevel(Exercise.DifficultyLevel.MEDIUM).requiredEquipment("MACHINE")
                .movementPattern("SQUAT").primaryMuscle("Quadriceps")
                .secondaryMuscles("Glutes,Hamstrings").kneeDominant(true)
                .contraindicatedInjuries("acute knee pain,hip")
                .defaultSets(4).defaultReps(12).defaultRestSeconds(90).status("ACTIVE")
                .forceType("LEGS").exerciseCategory("COMPOUND").build());

        exercises.add(Exercise.builder().exerciseName("Leg Curl Machine").exerciseNameVi("Cuộn Đùi Sau Máy").description("Hamstring isolation on lying or seated leg curl machine.")
                .exerciseType("CURL").difficultyLevel(Exercise.DifficultyLevel.EASY).requiredEquipment("MACHINE")
                .movementPattern("HINGE").primaryMuscle("Hamstrings")
                .secondaryMuscles("Calves").contraindicatedInjuries("knee,goi")
                .defaultSets(3).defaultReps(12).defaultRestSeconds(75).status("ACTIVE")
                .forceType("LEGS").exerciseCategory("ISOLATION").build());

        exercises.add(Exercise.builder().exerciseName("Leg Extension Machine").exerciseNameVi("Duỗi Đùi Trước Máy").description("Quad isolation via knee extension. Common in gym programs.")
                .exerciseType("EXTENSION").difficultyLevel(Exercise.DifficultyLevel.EASY).requiredEquipment("MACHINE")
                .movementPattern("SQUAT").primaryMuscle("Quadriceps")
                .kneeDominant(true).contraindicatedInjuries("acute knee pain,patella,goi")
                .defaultSets(3).defaultReps(15).defaultRestSeconds(60).status("ACTIVE")
                .forceType("LEGS").exerciseCategory("ISOLATION").build());

        exercises.add(Exercise.builder().exerciseName("Chest Press Machine").exerciseNameVi("Đẩy Ngực Máy").description("Guided chest press for beginners or high-rep burnout sets.")
                .exerciseType("PRESS").difficultyLevel(Exercise.DifficultyLevel.EASY).requiredEquipment("MACHINE")
                .movementPattern("PUSH").primaryMuscle("Chest")
                .secondaryMuscles("Shoulders,Triceps").contraindicatedInjuries("shoulder,elbow")
                .defaultSets(3).defaultReps(12).defaultRestSeconds(75).status("ACTIVE")
                .forceType("PUSH").exerciseCategory("COMPOUND").build());

        exercises.add(Exercise.builder().exerciseName("Shoulder Press Machine").exerciseNameVi("Đẩy Vai Máy").description("Guided overhead press for shoulder mass with reduced stabiliser demand.")
                .exerciseType("PRESS").difficultyLevel(Exercise.DifficultyLevel.EASY).requiredEquipment("MACHINE")
                .movementPattern("PUSH").primaryMuscle("Shoulders")
                .secondaryMuscles("Triceps,Traps").shoulderOverhead(true)
                .contraindicatedInjuries("shoulder,vai,neck")
                .defaultSets(3).defaultReps(12).defaultRestSeconds(75).status("ACTIVE")
                .forceType("PUSH").exerciseCategory("ISOLATION").build());

        exercises.add(Exercise.builder().exerciseName("Smith Machine Squat").exerciseNameVi("Squat Máy Smith").description("Guided squat for beginners learning bar path or rehab.")
                .exerciseType("SQUAT").difficultyLevel(Exercise.DifficultyLevel.MEDIUM).requiredEquipment("MACHINE")
                .movementPattern("SQUAT").primaryMuscle("Quadriceps")
                .secondaryMuscles("Glutes,Hamstrings,Core").kneeDominant(true).spinalLoading(true)
                .contraindicatedInjuries("knee,back,lumbar")
                .defaultSets(4).defaultReps(10).defaultRestSeconds(120).status("ACTIVE")
                .forceType("LEGS").exerciseCategory("COMPOUND").build());

        List<Exercise> missing = exercises.stream()
                .filter(exercise -> exercise.getExerciseName() != null)
                .filter(exercise -> !existingNames.contains(exercise.getExerciseName().toLowerCase(Locale.ROOT)))
                .peek(this::completeExerciseMetadata)
                .collect(Collectors.toList());

        int updated = backfillExistingExerciseMetadata(existingExercises);
        if (updated > 0) {
            log.info("Backfilled AI metadata for {} existing exercises", updated);
        }

        exerciseRepository.saveAll(missing);
        return missing.size();
    }

    private int backfillExistingExerciseMetadata(List<Exercise> existingExercises) {
        List<Exercise> updated = existingExercises.stream()
                .filter(this::completeExerciseMetadata)
                .collect(Collectors.toList());
        if (!updated.isEmpty()) {
            exerciseRepository.saveAll(updated);
        }
        return updated.size();
    }

    private boolean completeExerciseMetadata(Exercise exercise) {
        boolean changed = false;
        String name = lower(exercise.getExerciseName());
        String type = lower(exercise.getExerciseType());
        String pattern = lower(exercise.getMovementPattern());
        String primary = lower(exercise.getPrimaryMuscle());
        String haystack = (name + " " + type + " " + pattern + " " + primary).trim();

        if (isBlank(exercise.getStatus())) {
            exercise.setStatus("ACTIVE");
            changed = true;
        }
        if (isBlank(exercise.getRequiredEquipment())) {
            exercise.setRequiredEquipment("BODYWEIGHT");
            changed = true;
        }
        if (isBlank(exercise.getExerciseType())) {
            exercise.setExerciseType(defaultExerciseType(haystack));
            changed = true;
        }
        if (isBlank(exercise.getMovementPattern())) {
            exercise.setMovementPattern(defaultMovementPattern(haystack));
            changed = true;
        }
        if (isBlank(exercise.getPrimaryMuscle())) {
            exercise.setPrimaryMuscle(defaultPrimaryMuscle(haystack));
            changed = true;
        }
        if (isBlank(exercise.getSecondaryMuscles())) {
            exercise.setSecondaryMuscles(defaultSecondaryMuscles(inferForceType(exercise)));
            changed = true;
        }
        if (isBlank(exercise.getForceType())) {
            exercise.setForceType(inferForceType(exercise));
            changed = true;
        }
        if (isBlank(exercise.getExerciseCategory())) {
            exercise.setExerciseCategory(inferExerciseCategory(exercise));
            changed = true;
        }
        if (exercise.getMetValue() == null || exercise.getMetValue().compareTo(BigDecimal.ZERO) <= 0) {
            exercise.setMetValue(BigDecimal.valueOf(inferMetValue(exercise)).setScale(1, RoundingMode.HALF_UP));
            changed = true;
        }
        if (exercise.getEstimatedMet() == null || exercise.getEstimatedMet() <= 0) {
            exercise.setEstimatedMet(exercise.getMetValue() != null
                    ? Math.max(1, exercise.getMetValue().setScale(0, RoundingMode.HALF_UP).intValue())
                    : 5);
            changed = true;
        }
        if (isBlank(exercise.getTempo())) {
            exercise.setTempo(inferTempo(exercise));
            changed = true;
        }
        if (exercise.getRpeMin() == null || exercise.getRpeMax() == null
                || exercise.getRpeMin() < 1 || exercise.getRpeMax() > 10
                || exercise.getRpeMin() > exercise.getRpeMax()) {
            short[] rpe = inferRpeRange(exercise);
            exercise.setRpeMin(rpe[0]);
            exercise.setRpeMax(rpe[1]);
            changed = true;
        }

        changed |= setIfNull(() -> exercise.getSpinalLoading(), exercise::setSpinalLoading, inferSpinalLoading(exercise));
        changed |= setIfNull(() -> exercise.getKneeDominant(), exercise::setKneeDominant, inferKneeDominant(exercise));
        changed |= setIfNull(() -> exercise.getShoulderOverhead(), exercise::setShoulderOverhead, inferShoulderOverhead(exercise));
        changed |= setIfNull(() -> exercise.getHighImpact(), exercise::setHighImpact, inferHighImpact(exercise));
        changed |= setIfNull(() -> exercise.getWristLoading(), exercise::setWristLoading, inferWristLoading(exercise));
        changed |= setIfNull(() -> exercise.getIsBilateral(), exercise::setIsBilateral, inferBilateral(exercise));
        changed |= setIfNull(() -> exercise.getSuitableForSenior(), exercise::setSuitableForSenior, inferSuitableForSenior(exercise));
        changed |= setIfNull(() -> exercise.getSuitableForOverweight(), exercise::setSuitableForOverweight, inferSuitableForOverweight(exercise));

        return changed;
    }

    private boolean setIfNull(java.util.function.Supplier<Boolean> getter,
                              java.util.function.Consumer<Boolean> setter,
                              boolean value) {
        if (getter.get() != null) {
            return false;
        }
        setter.accept(value);
        return true;
    }

    private String inferForceType(Exercise exercise) {
        String text = exerciseText(exercise);
        if (containsAny(text, "stretch", "mobility", "cat cow", "thoracic", "wall slide", "hip flexor")) return "MOBILITY";
        if (containsAny(text, "jumping jack", "step jack", "burpee", "mountain climber", "cardio", "run", "jog")) return "CARDIO";
        if (containsAny(text, "plank", "dead bug", "bird dog", "core", "oblique", "abdominal")) return "CORE";
        if (containsAny(text, "row", "pull up", "pulldown", "bicep", "curl") && !containsAny(text, "leg curl")) return "PULL";
        if (containsAny(text, "squat", "lunge", "deadlift", "glute", "thrust", "hamstring", "quadriceps", "calf", "leg press", "leg curl", "leg extension")) return "LEGS";
        if (containsAny(text, "push", "press", "bench", "fly", "tricep", "shoulder", "chest", "lateral raise")) return "PUSH";
        return "CORE";
    }

    private String inferExerciseCategory(Exercise exercise) {
        String text = exerciseText(exercise);
        String forceType = exercise.getForceType() != null ? exercise.getForceType() : inferForceType(exercise);
        if ("MOBILITY".equalsIgnoreCase(forceType)) return "MOBILITY";
        if (containsAny(text, "curl", "extension", "fly", "lateral raise", "calf raise", "plank", "dead bug", "stretch")) {
            return "ISOLATION";
        }
        return "COMPOUND";
    }

    private double inferMetValue(Exercise exercise) {
        String text = exerciseText(exercise);
        String forceType = exercise.getForceType() != null ? exercise.getForceType() : inferForceType(exercise);
        if (containsAny(text, "burpee")) return 10.0;
        if (containsAny(text, "jumping jack", "mountain climber")) return 8.0;
        if ("CARDIO".equalsIgnoreCase(forceType)) return 7.0;
        if ("MOBILITY".equalsIgnoreCase(forceType)) return 2.5;
        if ("CORE".equalsIgnoreCase(forceType)) return 3.0;
        if (containsAny(text, "deadlift")) return 6.5;
        if ("LEGS".equalsIgnoreCase(forceType)) return 5.5;
        if ("PUSH".equalsIgnoreCase(forceType) || "PULL".equalsIgnoreCase(forceType)) {
            return "ISOLATION".equalsIgnoreCase(exercise.getExerciseCategory()) ? 3.5 : 5.0;
        }
        return 5.0;
    }

    private String inferTempo(Exercise exercise) {
        String text = exerciseText(exercise);
        String forceType = exercise.getForceType() != null ? exercise.getForceType() : inferForceType(exercise);
        if ("CARDIO".equalsIgnoreCase(forceType)) return "N/A";
        if ("MOBILITY".equalsIgnoreCase(forceType)) return "2-1-2";
        if (containsAny(text, "plank")) return "0-0-0";
        if (containsAny(text, "squat", "deadlift", "row")) return "3-1-1";
        if (containsAny(text, "glute bridge", "hip thrust")) return "2-2-1";
        return "3-0-1";
    }

    private short[] inferRpeRange(Exercise exercise) {
        String forceType = exercise.getForceType() != null ? exercise.getForceType() : inferForceType(exercise);
        if ("MOBILITY".equalsIgnoreCase(forceType)) return new short[]{2, 4};
        if (exercise.getDifficultyLevel() == Exercise.DifficultyLevel.HARD) return new short[]{7, 9};
        if (exercise.getDifficultyLevel() == Exercise.DifficultyLevel.MEDIUM) return new short[]{5, 8};
        return new short[]{4, 6};
    }

    private String defaultExerciseType(String text) {
        if (containsAny(text, "squat")) return "SQUAT";
        if (containsAny(text, "lunge")) return "LUNGE";
        if (containsAny(text, "deadlift", "hinge")) return "DEADLIFT";
        if (containsAny(text, "row")) return "ROW";
        if (containsAny(text, "pull")) return "PULL_UP";
        if (containsAny(text, "press", "push")) return "PRESS";
        if (containsAny(text, "stretch")) return "STRETCH";
        if (containsAny(text, "mobility")) return "MOBILITY";
        if (containsAny(text, "cardio", "jump", "burpee")) return "CARDIO";
        return "CORE";
    }

    private String defaultMovementPattern(String text) {
        if (containsAny(text, "squat", "leg press", "leg extension")) return "SQUAT";
        if (containsAny(text, "lunge")) return "LUNGE";
        if (containsAny(text, "deadlift", "hinge", "glute", "thrust", "leg curl")) return "HINGE";
        if (containsAny(text, "row", "pull", "pulldown", "curl")) return "PULL";
        if (containsAny(text, "press", "push", "fly", "tricep", "lateral raise")) return "PUSH";
        if (containsAny(text, "stretch", "mobility", "cat cow", "rotation", "wall slide")) return "MOBILITY";
        if (containsAny(text, "jump", "burpee", "cardio", "mountain climber")) return "CARDIO";
        return "CORE";
    }

    private String defaultPrimaryMuscle(String text) {
        if (containsAny(text, "chest", "bench", "push up", "fly")) return "Chest";
        if (containsAny(text, "shoulder", "lateral raise", "overhead")) return "Shoulders";
        if (containsAny(text, "back", "row", "pull", "pulldown")) return "Back";
        if (containsAny(text, "bicep")) return "Biceps";
        if (containsAny(text, "tricep")) return "Triceps";
        if (containsAny(text, "squat", "leg press", "leg extension", "quadriceps")) return "Quadriceps";
        if (containsAny(text, "deadlift", "hamstring", "leg curl")) return "Hamstrings";
        if (containsAny(text, "glute", "thrust", "bridge")) return "Glutes";
        if (containsAny(text, "calf")) return "Calves";
        if (containsAny(text, "stretch", "mobility")) return "Mobility";
        if (containsAny(text, "cardio", "jump", "burpee")) return "Full Body";
        return "Core";
    }

    private String defaultSecondaryMuscles(String forceType) {
        return switch (forceType) {
            case "PUSH" -> "Shoulders,Triceps,Core";
            case "PULL" -> "Biceps,Rear Delts,Core";
            case "LEGS" -> "Glutes,Hamstrings,Core";
            case "CARDIO" -> "Core,Calves,Shoulders";
            case "MOBILITY" -> "Stabilizers";
            default -> "Hip Flexors,Glutes";
        };
    }

    private boolean inferSpinalLoading(Exercise exercise) {
        String text = exerciseText(exercise);
        return containsAny(text, "barbell back squat", "deadlift", "bent-over row", "overhead press", "goblet squat", "smith machine squat");
    }

    private boolean inferKneeDominant(Exercise exercise) {
        String text = exerciseText(exercise);
        return containsAny(text, "squat", "lunge", "jump", "leg press", "leg extension", "mountain climber");
    }

    private boolean inferShoulderOverhead(Exercise exercise) {
        String text = exerciseText(exercise);
        return containsAny(text, "overhead", "shoulder press", "pike push", "wall slide", "pull up", "pulldown");
    }

    private boolean inferHighImpact(Exercise exercise) {
        String text = exerciseText(exercise);
        return containsAny(text, "jumping jack", "burpee", "jump squat");
    }

    private boolean inferWristLoading(Exercise exercise) {
        String text = exerciseText(exercise);
        return containsAny(text, "push up", "plank", "bird dog", "mountain climber", "burpee");
    }

    private boolean inferBilateral(Exercise exercise) {
        String text = exerciseText(exercise);
        return !containsAny(text, "lunge", "single", "one-arm", "one arm", "unilateral");
    }

    private boolean inferSuitableForSenior(Exercise exercise) {
        String text = exerciseText(exercise);
        return !inferHighImpact(exercise)
                && !containsAny(text, "pull up", "burpee", "deadlift", "barbell back squat", "overhead press");
    }

    private boolean inferSuitableForOverweight(Exercise exercise) {
        String text = exerciseText(exercise);
        return !inferHighImpact(exercise)
                && !containsAny(text, "pull up", "burpee", "lunge", "mountain climber");
    }

    private String exerciseText(Exercise exercise) {
        return lower(exercise.getExerciseName()) + " "
                + lower(exercise.getExerciseType()) + " "
                + lower(exercise.getMovementPattern()) + " "
                + lower(exercise.getPrimaryMuscle()) + " "
                + lower(exercise.getSecondaryMuscles());
    }

    private boolean containsAny(String value, String... needles) {
        for (String needle : needles) {
            if (value.contains(needle)) {
                return true;
            }
        }
        return false;
    }

    private String lower(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    @Override
    @Transactional
    public int importDailyTrainingLogs(int count) {
        List<User> users = userRepository.findAll();
        List<TrainingPlan> plans = trainingPlanRepository.findAll();
        
        if (users.isEmpty() || plans.isEmpty()) {
            log.debug("⚠️ Không có users hoặc training plans. Bỏ qua import daily logs.");
            return 0;
        }
        
        Random random = new Random();
        List<DailyTrainingLog> logs = new ArrayList<>();
        
        DailyTrainingLog.DailyTrainingStatus[] statuses = {
            DailyTrainingLog.DailyTrainingStatus.COMPLETED,
            DailyTrainingLog.DailyTrainingStatus.IN_PROGRESS,
            DailyTrainingLog.DailyTrainingStatus.NOT_STARTED,
            DailyTrainingLog.DailyTrainingStatus.COMPLETED,
            DailyTrainingLog.DailyTrainingStatus.COMPLETED
        };
        
        for (int i = 0; i < count; i++) {
            User user = users.get(random.nextInt(users.size()));
            TrainingPlan plan = plans.get(random.nextInt(plans.size()));
            
            // Get challenges for this plan
            List<TrainingPlanDetail> details = trainingPlanDetailRepository.findByTrainingPlan_TpId(plan.getTpId());
            if (details.isEmpty()) {
                continue;
            }
            
            TrainingPlanDetail detail = details.get(random.nextInt(details.size()));
            Exercise exercise = detail.getExercise();
            DailyTrainingLog.DailyTrainingStatus status = statuses[random.nextInt(statuses.length)];
            
            LocalDate trainingDate = LocalDate.now().minusDays(random.nextInt(30)); // Last 30 days
            ZonedDateTime completedAt = null;
            
            if (status == DailyTrainingLog.DailyTrainingStatus.COMPLETED) {
                completedAt = ZonedDateTime.now().minusDays(random.nextInt(30));
            }
            
            DailyTrainingLog log = new DailyTrainingLog();
            log.setUser(user);
            log.setTrainingPlan(plan);
            log.setTrainingDate(trainingDate);
            log.setDayNumber(detail.getDayNumber());
            log.setExercise(exercise);
            log.setStatus(status);
            log.setActualDurationMinutes(random.nextInt(60) + 15); // 15-75 minutes
            log.setCaloriesBurned(random.nextInt(500) + 100); // 100-600 calories
            log.setSetsCompleted(status == DailyTrainingLog.DailyTrainingStatus.COMPLETED ? detail.getSets() : random.nextInt(detail.getSets()));
            log.setRepsCompleted(status == DailyTrainingLog.DailyTrainingStatus.COMPLETED ? detail.getReps() : random.nextInt(detail.getReps()));
            log.setScore(status == DailyTrainingLog.DailyTrainingStatus.COMPLETED ? random.nextInt(40) + 60 : null); // 60-100
            log.setConfidence(status == DailyTrainingLog.DailyTrainingStatus.COMPLETED ? 0.7 + random.nextDouble() * 0.3 : null); // 0.7-1.0
            log.setStartedAt(completedAt != null ? completedAt.minusMinutes(random.nextInt(60) + 15) : null);
            log.setCompletedAt(completedAt);
            log.setCreatedAt(ZonedDateTime.now().minusDays(random.nextInt(30)));
            
            logs.add(log);
        }
        
        dailyTrainingLogRepository.saveAll(logs);
        return logs.size();
    }

    @Override
    @Transactional
    public int importUserChallenges(int count) {
        List<User> users = userRepository.findAll();
        List<Challenges> challenges = challengeRepository.findAll();
        
        if (users.isEmpty() || challenges.isEmpty()) {
            log.debug("⚠️ Không có users hoặc challenges. Bỏ qua import user challenges.");
            return 0;
        }
        
        Random random = new Random();
        List<UserChallenge> userChallenges = new ArrayList<>();
        
        UserChallenge.UserChallengeStatus[] statuses = {
            UserChallenge.UserChallengeStatus.SUCCESS,
            UserChallenge.UserChallengeStatus.PENDING,
            UserChallenge.UserChallengeStatus.FAILED,
            UserChallenge.UserChallengeStatus.SUCCESS,
            UserChallenge.UserChallengeStatus.SUCCESS
        };
        
        for (int i = 0; i < count; i++) {
            User user = users.get(random.nextInt(users.size()));
            Challenges challenge = challenges.get(random.nextInt(challenges.size()));
            
            UserChallenge.UserChallengeStatus status = statuses[random.nextInt(statuses.length)];
            ZonedDateTime submittedAt = ZonedDateTime.now().minusDays(random.nextInt(60));
            ZonedDateTime completedAt = null;
            
            if (status == UserChallenge.UserChallengeStatus.SUCCESS) {
                completedAt = submittedAt.plusHours(random.nextInt(24) + 1);
            }
            
            UserChallenge userChallenge = new UserChallenge();
            userChallenge.setUser(user);
            userChallenge.setChallenge(challenge);
            userChallenge.setStatus(status);
            userChallenge.setVideoUrl("https://example.com/video" + i + ".mp4");
            userChallenge.setScore(status == UserChallenge.UserChallengeStatus.SUCCESS ? random.nextInt(40) + 60 : null);
            userChallenge.setConfidence(status == UserChallenge.UserChallengeStatus.SUCCESS ? 0.7 + random.nextDouble() * 0.3 : null);
            userChallenge.setSubmittedAt(submittedAt);
            userChallenge.setCompletedAt(completedAt);
            
            userChallenges.add(userChallenge);
        }
        
        userChallengeRepository.saveAll(userChallenges);
        
        // Update user points based on completed challenges
        updateUserPoints();
        
        return userChallenges.size();
    }

    private void importRoles() {
        log.debug("📝 Creating default roles...");

        if (roleRepository.findByRoleName("USER").isEmpty()) {
            Role userRole = new Role();
            userRole.setRoleName("USER");
            roleRepository.save(userRole);
        }

        if (roleRepository.findByRoleName("ADMIN").isEmpty()) {
            Role adminRole = new Role();
            adminRole.setRoleName("ADMIN");
            roleRepository.save(adminRole);
        }

        log.debug("✅ Created 2 roles: USER, ADMIN");
    }

    private void importGoals() {
        String[] goalNames = {
            "Lose Weight", "Build Muscle", "Improve Endurance",
            "Increase Flexibility", "General Fitness", "Athletic Performance",
            "Improve Cardiometabolic Health", "Beginner Habit Building", "Posture And Mobility",
            "Healthy Weight Maintenance", "Reduce Body Fat", "Increase Daily Steps",
            "Core Stability", "Senior Functional Fitness", "Low Impact Fitness",
            "Return To Training"
        };
        
        String[] descriptions = {
            "Achieve gradual weight loss through calorie-aware nutrition and progressive activity.",
            "Build lean muscle mass and strength with progressive resistance training.",
            "Improve cardiovascular endurance and stamina with aerobic work spread across the week.",
            "Enhance flexibility and joint mobility through controlled range-of-motion practice.",
            "Maintain overall health with balanced strength, cardio, mobility, and recovery.",
            "Reach peak athletic performance with strength, power, conditioning, and recovery habits.",
            "Support blood pressure, glucose control, and lipid health with regular aerobic and resistance work.",
            "Create a sustainable routine for users new to exercise, focusing on consistency first.",
            "Improve posture, trunk control, shoulder mobility, and hip mobility for desk-heavy lifestyles.",
            "Maintain healthy body weight with balanced nutrition, resistance training, and daily movement.",
            "Reduce body-fat percentage while preserving lean mass through protein intake and strength work.",
            "Increase non-exercise activity and walking volume with a safe, measurable progression.",
            "Build trunk stability for safer lifting, better balance, and lower-back resilience.",
            "Improve strength, balance, mobility, and daily functional capacity with low-risk exercise choices.",
            "Build fitness with joint-friendly low-impact cardio and resistance exercises.",
            "Resume training after a break using gradual volume, low pain, and technique-first progression."
        };
        
        List<Goals> goals = new ArrayList<>();
        for (int i = 0; i < goalNames.length; i++) {
            if (goalRepository.existsByName(goalNames[i])) {
                continue;
            }
            Goals goal = new Goals();
            goal.setName(goalNames[i]);
            goal.setDescription(descriptions[i]);
            goal.setImageLink("https://example.com/goal" + i + ".jpg");
            goals.add(goal);
        }
        
        goalRepository.saveAll(goals);
    }

    @Override
    @Transactional
    public int importHealthProfiles() {
        List<User> users = userRepository.findAll();
        List<Goals> goals = goalRepository.findAll();
        Random random = new Random();
        int count = 0;

        for (User user : users) {
            boolean alreadyHadHealthProfile = healthProfileRepository.findByUser_Id(user.getId()).isPresent();

            Goals goal = goals.isEmpty() ? null : goals.get(random.nextInt(goals.size()));
            BigDecimal weight = new BigDecimal(60 + random.nextInt(40));
            BigDecimal height = new BigDecimal(150 + random.nextInt(40));
            int age = 18 + random.nextInt(30);
            String gender = random.nextBoolean() ? "MALE" : "FEMALE";
            String activityLevel = new String[]{"sedentary", "lightly active", "moderately active", "very active"}[random.nextInt(4)];
            BigDecimal bmi = calculateBmi(height, weight);
            BigDecimal bmr = calculateBmr(height, weight, age, gender);
            BigDecimal recommendedCalories = calculateRecommendedCalories(bmr, activityLevel);

            if (!userBodyProfileRepository.existsByUser_Id(user.getId())) {
                UserBodyProfile ubp = new UserBodyProfile();
                ubp.setUser(user);
                ubp.setHeight(height);
                ubp.setWeight(weight);
                ubp.setAge(age);
                ubp.setGender(gender);
                ubp.setBmi(bmi);
                ubp.setBmr(bmr);
                ubp.setRecommendedCalories(recommendedCalories);
                ubp.setActivityLevel(activityLevel);
                ubp.setExperienceLevel(new String[]{"beginner", "intermediate", "advanced"}[random.nextInt(3)]);
                ubp.setGoalRef(goal);
                ubp.setGoal(goal != null ? normalizeGoalLabel(goal.getName()) : "maintain");
                ubp.setTargetBudgetPerDay(70000);
                userBodyProfileRepository.save(ubp);
            }

            if (!alreadyHadHealthProfile) {
                HealthProfile hp = new HealthProfile();
                hp.setUser(user);
                hp.setDailyActivityLevel(activityLevel);
                hp.setWorkoutFrequencyPerWeek(random.nextInt(5) + 1);
                hp.setFavoriteExerciseType("Mixed");
                hp.setCurrentDietType("balanced");
                hp.setSleepHoursPerDay(6 + random.nextInt(3));
                hp.setStressLevel(new String[]{"low", "medium", "high"}[random.nextInt(3)]);
                hp.setPrimaryGoal(goal != null ? normalizeGoalLabel(goal.getName()) : "maintain");
                hp.setGoalWeightKg(weight.subtract(BigDecimal.valueOf(random.nextInt(6))));
                hp.setGoalTimelineDays(90);
                hp.setMobilityLevel("good");
                hp.setAvailableEquipment("bodyweight_only");
                hp.setMealsPerDay(3);
                hp.setWaterIntakeLitersPerDay(BigDecimal.valueOf(2.0));
                hp.setAlcoholConsumption("occasional");
                hp.setSmokingStatus("none");
                healthProfileRepository.save(hp);
            }

            // Create InformationBodyUser (for redundancy/other parts of system)
            if (informationBodyUserRepository.findByUserId(user.getId()).isEmpty()) {
                InformationBodyUser ibu = new InformationBodyUser();
                ibu.setUser(user);
                ibu.setHeightCm(height);
                ibu.setWeightKg(weight);
                ibu.setAge(age);
                ibu.setGender(gender);
                ibu.setBmi(bmi);
                ibu.setActivityLevel(activityLevel);
                ibu.setBmr(bmr);
                ibu.setRecommendedCalories(recommendedCalories);
                ibu.setGoals(goal);
                ibu.setCreatedAt(ZonedDateTime.now());
                informationBodyUserRepository.save(ibu);
            }

            count++;
        }
        return count;
    }

    private BigDecimal calculateBmi(BigDecimal heightCm, BigDecimal weightKg) {
        BigDecimal heightM = heightCm.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        return weightKg.divide(heightM.multiply(heightM), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateBmr(BigDecimal heightCm, BigDecimal weightKg, int age, String gender) {
        BigDecimal bmr = weightKg.multiply(BigDecimal.TEN)
                .add(heightCm.multiply(BigDecimal.valueOf(6.25)))
                .subtract(BigDecimal.valueOf(age).multiply(BigDecimal.valueOf(5)));
        return "MALE".equalsIgnoreCase(gender)
                ? bmr.add(BigDecimal.valueOf(5))
                : bmr.subtract(BigDecimal.valueOf(161));
    }

    private BigDecimal calculateRecommendedCalories(BigDecimal bmr, String activityLevel) {
        BigDecimal multiplier = switch (activityLevel.toLowerCase(Locale.ROOT)) {
            case "lightly active" -> BigDecimal.valueOf(1.375);
            case "moderately active" -> BigDecimal.valueOf(1.55);
            case "very active" -> BigDecimal.valueOf(1.725);
            default -> BigDecimal.valueOf(1.2);
        };
        return bmr.multiply(multiplier).setScale(0, RoundingMode.HALF_UP);
    }

    private String normalizeGoalLabel(String goalName) {
        if (goalName == null) return "maintain";
        String lower = goalName.toLowerCase(Locale.ROOT);
        if (lower.contains("lose")) return "lose_weight";
        if (lower.contains("muscle")) return "build_muscle";
        if (lower.contains("endurance")) return "improve_endurance";
        if (lower.contains("flexibility")) return "increase_flexibility";
        if (lower.contains("athletic")) return "athletic_performance";
        return "maintain";
    }

    @Override
    @Transactional
    public int importBudgetTracking(int count) {
        List<User> users = userRepository.findAll();
        if (users.isEmpty()) return 0;

        Random random = new Random();
        List<BudgetTracking> records = new ArrayList<>();

        for (int i = 0; i < count; i++) {
            User user = users.get(random.nextInt(users.size()));
            LocalDate date = LocalDate.now().minusDays(random.nextInt(30));
            
            BudgetTracking bt = new BudgetTracking();
            bt.setUser(user);
            bt.setTrackingDate(date);
            bt.setDailyBudget(50000 + random.nextInt(100000));
            bt.setActualSpent(30000 + random.nextInt(bt.getDailyBudget() + 20000));
            bt.calculateVariance();
            bt.setCreatedAt(ZonedDateTime.now().minusDays(random.nextInt(30)));
            
            records.add(bt);
        }

        budgetTrackingRepository.saveAll(records);
        return records.size();
    }

    @Override
    @Transactional
    public int importRewards() {
        String[][] rewardData = {
            {"Gym Water Bottle", "High quality 1L water bottle", "500", "50"},
            {"Training Towel", "Microfiber fast-dry towel", "300", "100"},
            {"Premium T-shirt", "Fitnit Challenge limited edition", "1500", "20"},
            {"1 Month Premium", "Unlock all AI coaching features", "2000", "999"},
            {"Dumbbell Set", "5kg rubber coated dumbbells", "5000", "5"}
        };

        Random random = new Random();
        List<Reward> rewards = new ArrayList<>();
        Set<String> existingRewardNames = rewardRepository.findAll().stream()
                .map(Reward::getName)
                .filter(Objects::nonNull)
                .map(name -> name.toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());
        
        for (String[] data : rewardData) {
            if (existingRewardNames.contains(data[0].toLowerCase(Locale.ROOT))) {
                continue;
            }
            Reward r = new Reward();
            r.setName(data[0]);
            r.setDescription(data[1]);
            r.setCostPoints(Integer.parseInt(data[2]));
            r.setStock(Integer.parseInt(data[3]));
            r.setLinkImage("https://api.dicebear.com/7.x/shapes/svg?seed=" + data[0]);
            r.setCreatedAt(java.time.OffsetDateTime.now());
            r.setStatus("active");
            rewards.add(r);
        }

        rewardRepository.saveAll(rewards);
        return rewards.size();
    }

    private void updateUserPoints() {
        List<User> users = userRepository.findAll();
        for (User user : users) {
            long completedChallenges = userChallengeRepository.findAll().stream()
                .filter(uc -> uc.getUser().getId().equals(user.getId()) && 
                             (uc.getStatus() == UserChallenge.UserChallengeStatus.SUCCESS || 
                              "success".equalsIgnoreCase(uc.getStatus().toString())))
                .count();
            user.setPoints((int) (completedChallenges * 100));
            userRepository.save(user);
        }
    }

    // ======= FOODS =======
    @Override
    @Transactional
    public int importFoods() {
        String[][] data = {
            // name, category, kcal, price/100g, protein, carbs, fat
            {"Gạo tẻ", "CARB", "360", "1500", "6.8", "78.9", "0.6"},
            {"Gạo lứt", "CARB", "111", "2500", "2.6", "23.0", "0.9"},
            {"Cơm trắng chín", "CARB", "130", "1200", "2.7", "28.2", "0.3"},
            {"Thịt gà", "PROTEIN", "239", "8500", "27.3", "0", "13.6"},
            {"Ức gà chín", "PROTEIN", "165", "11000", "31.0", "0", "3.6"},
            {"Đùi gà bỏ da", "PROTEIN", "209", "8500", "26.0", "0", "10.9"},
            {"Cá hồi", "PROTEIN", "208", "18000", "20.4", "0", "13.4"},
            {"Cá thu", "PROTEIN", "205", "9000", "19", "0", "14"},
            {"Cá ngừ", "PROTEIN", "132", "11000", "28.0", "0", "1.3"},
            {"Cá basa", "PROTEIN", "158", "5500", "22.5", "0", "7.0"},
            {"Trứng gà", "PROTEIN", "155", "3000", "13", "1.1", "11"},
            {"Lòng trắng trứng", "PROTEIN", "52", "2500", "10.9", "0.7", "0.2"},
            {"Bông cải xanh", "FIBER", "34", "3500", "2.8", "6.6", "0.4"},
            {"Bông cải trắng", "FIBER", "25", "3200", "1.9", "5.0", "0.3"},
            {"Cà rốt", "FIBER", "41", "2000", "0.9", "9.6", "0.2"},
            {"Rau cải ngọt", "FIBER", "20", "1800", "1.7", "3.2", "0.2"},
            {"Cải bó xôi", "FIBER", "23", "4500", "2.9", "3.6", "0.4"},
            {"Rau muống", "FIBER", "19", "1500", "2.6", "3.1", "0.2"},
            {"Cải thìa", "FIBER", "13", "2200", "1.5", "2.2", "0.2"},
            {"Bí đỏ", "CARB", "26", "2200", "1", "6.5", "0.1"},
            {"Khoai lang", "CARB", "86", "2500", "1.6", "20.1", "0.1"},
            {"Khoai tây", "CARB", "87", "2000", "1.9", "20.1", "0.1"},
            {"Ngô ngọt", "CARB", "96", "2500", "3.4", "21.0", "1.5"},
            {"Chuối", "CARB", "89", "2500", "1.1", "22.8", "0.3"},
            {"Táo", "CARB", "52", "4500", "0.3", "13.8", "0.2"},
            {"Cam", "CARB", "47", "3000", "0.9", "11.8", "0.1"},
            {"Ổi", "CARB", "68", "2500", "2.6", "14.3", "1.0"},
            {"Thanh long", "CARB", "57", "2800", "1.2", "13.0", "0.1"},
            {"Dâu tây", "CARB", "32", "12000", "0.7", "7.7", "0.3"},
            {"Yến mạch", "CARB", "389", "8500", "16.9", "66.3", "6.9"},
            {"Bánh mì nguyên cám", "CARB", "247", "4500", "13.0", "41.0", "4.2"},
            {"Mì soba", "CARB", "99", "6500", "5.1", "21.4", "0.1"},
            {"Quinoa chín", "CARB", "120", "12000", "4.4", "21.3", "1.9"},
            {"Bún gạo", "CARB", "109", "1800", "1.8", "25", "0.2"},
            {"Phở tươi", "CARB", "143", "2000", "2.5", "31", "0.4"},
            {"Sữa tươi", "PROTEIN", "65", "2200", "3.2", "4.8", "3.6"},
            {"Sữa chua không đường", "PROTEIN", "61", "3500", "3.5", "4.7", "3.3"},
            {"Sữa Hy Lạp không đường", "PROTEIN", "97", "9000", "9.0", "3.6", "5.0"},
            {"Phô mai tươi cottage", "PROTEIN", "98", "12000", "11.1", "3.4", "4.3"},
            {"Đậu phụ", "PROTEIN", "76", "1500", "8.1", "1.9", "4.8"},
            {"Đậu xanh", "CARB", "105", "3500", "7", "19", "0.4"},
            {"Đậu đen chín", "CARB", "132", "3500", "8.9", "23.7", "0.5"},
            {"Đậu đỏ chín", "CARB", "127", "3800", "8.7", "22.8", "0.5"},
            {"Đậu nành chín", "PROTEIN", "172", "4200", "18.2", "8.4", "9.0"},
            {"Tempeh", "PROTEIN", "192", "8500", "20.3", "7.6", "10.8"},
            {"Thịt bò", "PROTEIN", "250", "12000", "26", "0", "15"},
            {"Bò nạc thăn", "PROTEIN", "190", "16000", "29.0", "0", "8.0"},
            {"Thịt heo nạc", "PROTEIN", "242", "8500", "27", "0", "14"},
            {"Thịt heo thăn", "PROTEIN", "143", "9500", "26.0", "0", "3.5"},
            {"Tôm", "PROTEIN", "99", "14000", "24", "0.2", "0.3"},
            {"Mực", "PROTEIN", "92", "12000", "15.6", "3.1", "1.4"},
            {"Ngao", "PROTEIN", "86", "8000", "14.7", "3.6", "1.0"},
            {"Cà chua", "FIBER", "18", "2200", "0.9", "3.9", "0.2"},
            {"Dưa leo", "FIBER", "15", "1800", "0.7", "3.6", "0.1"},
            {"Nấm hương", "FIBER", "34", "7000", "2.2", "6.8", "0.5"},
            {"Nấm đùi gà", "FIBER", "35", "6500", "2.5", "7.0", "0.3"},
            {"Ớt chuông", "FIBER", "31", "5500", "1.0", "6.0", "0.3"},
            {"Hành tây", "FIBER", "40", "1800", "1.1", "9.3", "0.1"},
            {"Rong biển", "FIBER", "45", "9000", "3.0", "9.0", "0.6"},
            {"Hạt điều", "FAT", "553", "18000", "18", "30", "44"},
            {"Hạnh nhân", "FAT", "579", "22000", "21.2", "21.6", "49.9"},
            {"Hạt óc chó", "FAT", "654", "26000", "15.2", "13.7", "65.2"},
            {"Hạt chia", "FAT", "486", "18000", "16.5", "42.1", "30.7"},
            {"Hạt lanh", "FAT", "534", "12000", "18.3", "28.9", "42.2"},
            {"Đậu phộng", "FAT", "567", "7000", "25.8", "16.1", "49.2"},
            {"Bơ", "FAT", "160", "6000", "2", "8.5", "14.7"},
            {"Dầu olive", "FAT", "884", "16000", "0", "0", "100"},
            {"Dầu đậu nành", "FAT", "884", "4500", "0", "0", "100"},
            {"Ức vịt bỏ da", "PROTEIN", "201", "13000", "23.5", "0", "11.2"},
            {"Gan gà", "PROTEIN", "167", "6000", "24.5", "0.9", "6.5"},
            {"Sữa đậu nành không đường", "PROTEIN", "33", "1800", "2.9", "1.7", "1.6"}
        };
        Set<String> existingNames = foodRepository.findAll().stream()
                .map(Food::getName)
                .filter(Objects::nonNull)
                .map(name -> name.toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());
        List<Food> foods = new ArrayList<>();
        for (String[] d : data) {
            if (existingNames.contains(d[0].toLowerCase(Locale.ROOT))) {
                continue;
            }
            Food f = new Food();
            f.setName(d[0]);
            f.setCategory(d[1]);
            f.setCaloriesPer100g(Integer.parseInt(d[2]));
            f.setAverageMarketPriceVnd(Integer.parseInt(d[3]));
            f.setProteinPer100g(new BigDecimal(d[4]));
            f.setCarbsPer100g(new BigDecimal(d[5]));
            f.setFatPer100g(new BigDecimal(d[6]));
            f.setServingUnit(Food.ServingUnit.GRAM);
            f.setPrepState(Food.PrepState.COOKED);
            f.setIsVegan(!"PROTEIN".equals(d[1]) || d[0].contains("Đậu") || d[0].contains("Tempeh") || d[0].contains("Sữa đậu"));
            f.setNotes("Nutrition per 100g, approximate standard-reference values; market price is VN estimate.");
            foods.add(f);
        }
        foodRepository.saveAll(foods);
        return foods.size();
    }

    @Override
    @Transactional
    public int importHybridMealCatalog() {
        if (foodRepository.count() == 0) {
            importFoods();
        }
        seedMissingHybridFoods();
        normalizeFoodForHybridSolver();

        Map<String, Food> foods = foodRepository.findAll().stream()
                .collect(Collectors.toMap(Food::getName, f -> f, (a, b) -> a));

        int created = 0;
        created += createDishIfMissing(foods, "Cháo yến mạch trứng", Dish.DishRole.ONE_POT, "BREAKFAST",
                "Yến mạch", "Trứng gà", "Sữa tươi");
        created += createDishIfMissing(foods, "Phở gà tinh gọn", Dish.DishRole.ONE_POT, "BREAKFAST",
                "Phở tươi", "Thịt gà", "Rau cải ngọt");
        created += createDishIfMissing(foods, "Bún tôm rau cải", Dish.DishRole.ONE_POT, "BREAKFAST",
                "Bún gạo", "Tôm", "Rau cải ngọt");
        created += createDishIfMissing(foods, "Cháo đậu xanh trứng", Dish.DishRole.ONE_POT, "BREAKFAST",
                "Đậu xanh", "Trứng gà", "Sữa tươi");

        created += createDishIfMissing(foods, "Cơm trắng", Dish.DishRole.CARB_BASE, "MAIN_COURSE", "Gạo tẻ");
        created += createDishIfMissing(foods, "Cơm yến mạch", Dish.DishRole.CARB_BASE, "MAIN_COURSE", "Yến mạch");
        created += createDishIfMissing(foods, "Khoai lang luộc", Dish.DishRole.CARB_BASE, "MAIN_COURSE", "Khoai lang");
        created += createDishIfMissing(foods, "Bún gạo", Dish.DishRole.CARB_BASE, "MAIN_COURSE", "Bún gạo");
        created += createDishIfMissing(foods, "Bí đỏ hấp", Dish.DishRole.CARB_BASE, "MAIN_COURSE", "Bí đỏ");

        created += createDishIfMissing(foods, "Ức gà áp chảo", Dish.DishRole.MAIN_PROTEIN, "MAIN_COURSE",
                "Thịt gà", "Dầu olive");
        created += createDishIfMissing(foods, "Cá hồi áp chảo", Dish.DishRole.MAIN_PROTEIN, "MAIN_COURSE",
                "Cá hồi", "Dầu olive");
        created += createDishIfMissing(foods, "Cá thu sốt cà chua", Dish.DishRole.MAIN_PROTEIN, "MAIN_COURSE",
                "Cá thu", "Cà chua", "Dầu olive");
        created += createDishIfMissing(foods, "Bò xào cà chua", Dish.DishRole.MAIN_PROTEIN, "MAIN_COURSE",
                "Thịt bò", "Cà chua", "Dầu olive");
        created += createDishIfMissing(foods, "Heo nạc áp chảo", Dish.DishRole.MAIN_PROTEIN, "MAIN_COURSE",
                "Thịt heo nạc", "Dầu olive");
        created += createDishIfMissing(foods, "Tôm hấp rau củ", Dish.DishRole.MAIN_PROTEIN, "MAIN_COURSE",
                "Tôm", "Cà rốt");
        created += createDishIfMissing(foods, "Đậu phụ sốt cà chua", Dish.DishRole.MAIN_PROTEIN, "MAIN_COURSE",
                "Đậu phụ", "Cà chua", "Dầu olive");

        created += createDishIfMissing(foods, "Canh bông cải cà rốt", Dish.DishRole.SOUP, "MAIN_COURSE",
                "Bông cải xanh", "Cà rốt");
        created += createDishIfMissing(foods, "Canh cải nấm", Dish.DishRole.SOUP, "MAIN_COURSE",
                "Rau cải ngọt", "Nấm hương");
        created += createDishIfMissing(foods, "Canh bí đỏ tôm", Dish.DishRole.SOUP, "MAIN_COURSE",
                "Bí đỏ", "Tôm");

        created += createDishIfMissing(foods, "Rau củ luộc", Dish.DishRole.VEGETABLE, "MAIN_COURSE",
                "Bông cải xanh", "Cà rốt", "Cà chua");
        created += createDishIfMissing(foods, "Salad dưa leo cà chua", Dish.DishRole.VEGETABLE, "MAIN_COURSE",
                "Dưa leo", "Cà chua", "Dầu olive");
        created += createDishIfMissing(foods, "Nấm hương xào cải", Dish.DishRole.VEGETABLE, "MAIN_COURSE",
                "Nấm hương", "Rau cải ngọt", "Dầu olive");
        created += createDishIfMissing(foods, "Bông cải xanh hấp", Dish.DishRole.VEGETABLE, "MAIN_COURSE",
                "Bông cải xanh");

        return created;
    }

    private void normalizeFoodForHybridSolver() {
        Map<String, String[]> defaults = Map.ofEntries(
                Map.entry("Gạo tẻ", new String[]{"CARB", "360", "6.8", "78.9", "0.6", "1500"}),
                Map.entry("Thịt gà", new String[]{"PROTEIN", "239", "27.3", "0", "13.6", "8500"}),
                Map.entry("Cá hồi", new String[]{"PROTEIN", "208", "20.4", "0", "13.4", "18000"}),
                Map.entry("Cá thu", new String[]{"PROTEIN", "205", "19", "0", "14", "9000"}),
                Map.entry("Trứng gà", new String[]{"PROTEIN", "155", "13", "1.1", "11", "3000"}),
                Map.entry("Bông cải xanh", new String[]{"FIBER", "34", "2.8", "6.6", "0.4", "3500"}),
                Map.entry("Cà rốt", new String[]{"FIBER", "41", "0.9", "9.6", "0.2", "2000"}),
                Map.entry("Rau cải ngọt", new String[]{"FIBER", "20", "1.7", "3.2", "0.2", "1800"}),
                Map.entry("Bí đỏ", new String[]{"CARB", "26", "1", "6.5", "0.1", "2200"}),
                Map.entry("Khoai lang", new String[]{"CARB", "86", "1.6", "20.1", "0.1", "2500"}),
                Map.entry("Bún gạo", new String[]{"CARB", "109", "1.8", "25", "0.2", "1800"}),
                Map.entry("Phở tươi", new String[]{"CARB", "143", "2.5", "31", "0.4", "2000"}),
                Map.entry("Yến mạch", new String[]{"CARB", "389", "16.9", "66.3", "6.9", "8500"}),
                Map.entry("Sữa tươi", new String[]{"PROTEIN", "65", "3.2", "4.8", "3.6", "2200"}),
                Map.entry("Đậu phụ", new String[]{"PROTEIN", "76", "8.1", "1.9", "4.8", "1500"}),
                Map.entry("Đậu xanh", new String[]{"CARB", "105", "7", "19", "0.4", "3500"}),
                Map.entry("Thịt bò", new String[]{"PROTEIN", "250", "26", "0", "15", "12000"}),
                Map.entry("Thịt heo nạc", new String[]{"PROTEIN", "242", "27", "0", "14", "8500"}),
                Map.entry("Tôm", new String[]{"PROTEIN", "99", "24", "0.2", "0.3", "14000"}),
                Map.entry("Cà chua", new String[]{"FIBER", "18", "0.9", "3.9", "0.2", "2200"}),
                Map.entry("Dưa leo", new String[]{"FIBER", "15", "0.7", "3.6", "0.1", "1800"}),
                Map.entry("Nấm hương", new String[]{"FIBER", "34", "2.2", "6.8", "0.5", "7000"}),
                Map.entry("Hạt điều", new String[]{"FAT", "553", "18", "30", "44", "18000"}),
                Map.entry("Bơ", new String[]{"FAT", "160", "2", "8.5", "14.7", "6000"}),
                Map.entry("Dầu olive", new String[]{"FAT", "884", "0", "0", "100", "16000"})
        );
        List<Food> foods = foodRepository.findAll();
        for (Food food : foods) {
            String[] data = defaults.get(food.getName());
            if (data == null) continue;
            food.setCategory(data[0]);
            food.setCaloriesPer100g(Integer.parseInt(data[1]));
            food.setProteinPer100g(new BigDecimal(data[2]));
            food.setCarbsPer100g(new BigDecimal(data[3]));
            food.setFatPer100g(new BigDecimal(data[4]));
            food.setAverageMarketPriceVnd(Integer.parseInt(data[5]));
            food.setServingUnit(Food.ServingUnit.GRAM);
            food.setPrepState(Food.PrepState.COOKED);
        }
        foodRepository.saveAll(foods);
    }

    private void seedMissingHybridFoods() {
        Map<String, String[]> defaults = Map.ofEntries(
                Map.entry("Cá thu", new String[]{"PROTEIN", "205", "19", "0", "14", "9000"}),
                Map.entry("Rau cải ngọt", new String[]{"FIBER", "20", "1.7", "3.2", "0.2", "1800"}),
                Map.entry("Bí đỏ", new String[]{"CARB", "26", "1", "6.5", "0.1", "2200"}),
                Map.entry("Khoai lang", new String[]{"CARB", "86", "1.6", "20.1", "0.1", "2500"}),
                Map.entry("Bún gạo", new String[]{"CARB", "109", "1.8", "25", "0.2", "1800"}),
                Map.entry("Phở tươi", new String[]{"CARB", "143", "2.5", "31", "0.4", "2000"}),
                Map.entry("Đậu xanh", new String[]{"CARB", "105", "7", "19", "0.4", "3500"}),
                Map.entry("Thịt heo nạc", new String[]{"PROTEIN", "242", "27", "0", "14", "8500"}),
                Map.entry("Dưa leo", new String[]{"FIBER", "15", "0.7", "3.6", "0.1", "1800"}),
                Map.entry("Nấm hương", new String[]{"FIBER", "34", "2.2", "6.8", "0.5", "7000"}),
                Map.entry("Hạt điều", new String[]{"FAT", "553", "18", "30", "44", "18000"}),
                Map.entry("Bơ", new String[]{"FAT", "160", "2", "8.5", "14.7", "6000"}),
                Map.entry("Dầu olive", new String[]{"FAT", "884", "0", "0", "100", "16000"})
        );
        Set<String> existing = foodRepository.findAll().stream()
                .map(Food::getName)
                .collect(Collectors.toSet());
        List<Food> missing = new ArrayList<>();
        for (Map.Entry<String, String[]> entry : defaults.entrySet()) {
            if (existing.contains(entry.getKey())) continue;
            String[] d = entry.getValue();
            Food food = new Food();
            food.setName(entry.getKey());
            food.setCategory(d[0]);
            food.setCaloriesPer100g(Integer.parseInt(d[1]));
            food.setProteinPer100g(new BigDecimal(d[2]));
            food.setCarbsPer100g(new BigDecimal(d[3]));
            food.setFatPer100g(new BigDecimal(d[4]));
            food.setAverageMarketPriceVnd(Integer.parseInt(d[5]));
            food.setServingUnit(Food.ServingUnit.GRAM);
            food.setPrepState(Food.PrepState.COOKED);
            food.setIsVegan(!"PROTEIN".equals(d[0]) || entry.getKey().contains("Đậu"));
            missing.add(food);
        }
        foodRepository.saveAll(missing);
    }

    private int createDishIfMissing(Map<String, Food> foods, String dishName, Dish.DishRole role, String mealTypes, String... foodNames) {
        boolean exists = dishRepository.findAll().stream()
                .anyMatch(dish -> dishName.equalsIgnoreCase(dish.getDishName()));
        if (exists) return 0;
        Dish dish = new Dish();
        dish.setDishName(dishName);
        dish.setDishRole(role);
        dish.setSuitableMealTypes(mealTypes);
        dish.setImageUrl("https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400");
        dish.setIsActive(true);
        Dish savedDish = dishRepository.save(dish);

        List<DishIngredient> ingredients = new ArrayList<>();
        for (String foodName : foodNames) {
            Food food = foods.get(foodName);
            if (food == null) continue;
            DishIngredient ingredient = new DishIngredient();
            ingredient.setDish(savedDish);
            ingredient.setFood(food);
            ingredient.setIsCoreIngredient(true);
            ingredients.add(ingredient);
        }
        dishIngredientRepository.saveAll(ingredients);
        return 1 + ingredients.size();
    }

    // ======= EXTRA DATA: Inventory, Notifications, BodyMetrics, Preferences =======
    @Transactional
    public int importExtraData() {
        List<User> users = userRepository.findAll();
        if (users.isEmpty()) return 0;
        Random random = new Random();
        int count = 0;

        // UserInventory for first 5 users
        List<Food> foods = foodRepository.findAll();
        for (int i = 0; i < Math.min(5, users.size()); i++) {
            User user = users.get(i);
            for (int j = 0; j < Math.min(3, foods.size()); j++) {
                Food food = foods.get(j);
                UserInventory inv = new UserInventory();
                inv.setUser(user);
                inv.setFood(food);
                inv.setFoodName(food.getName());
                inv.setQuantityGrams(100.0 + random.nextInt(500));
                inv.setUnit("g");
                inv.setStatus(UserInventory.InventoryStatus.AVAILABLE);
                inv.setExpiryDate(LocalDate.now().plusDays(5 + random.nextInt(20)));
                inv.setAddedAt(ZonedDateTime.now());
                userInventoryRepository.save(inv);
                count++;
            }
        }

        // BodyMetricHistory for first 5 users
        for (int i = 0; i < Math.min(5, users.size()); i++) {
            User user = users.get(i);
            for (int w = 0; w < 4; w++) {
                BodyMetricHistory bm = new BodyMetricHistory();
                bm.setUser(user);
                bm.setWeightKg(BigDecimal.valueOf(65 + random.nextInt(20) - w * 0.5));
                bm.setHeightCm(BigDecimal.valueOf(165 + random.nextInt(20)));
                bm.setBodyFatPct(BigDecimal.valueOf(15 + random.nextInt(10)));
                bm.setMuscleMassKg(BigDecimal.valueOf(30 + random.nextInt(10)));
                bm.setWaistCm(BigDecimal.valueOf(75 + random.nextInt(15)));
                bm.setRecordedAt(ZonedDateTime.now().minusWeeks(w));
                bm.setCreatedAt(ZonedDateTime.now().minusWeeks(w));
                bm.setSource("manual");
                bodyMetricHistoryRepository.save(bm);
                count++;
            }
        }

        // Notifications for first 5 users
        String[][] notifData = {
            {"Thực đơn tuần mới!", "AI đã tạo thực đơn tuần này cho bạn.", "MEAL_PLAN"},
            {"Chúc mừng!", "Bạn đã hoàn thành Challenge hôm nay.", "CHALLENGE"},
            {"Nhắc nhở tập luyện", "Đến giờ tập rồi, đừng quên nhé!", "REMINDER"},
        };
        for (int i = 0; i < Math.min(5, users.size()); i++) {
            for (String[] nd : notifData) {
                Notification n = new Notification();
                n.setUser(users.get(i));
                n.setTitle(nd[0]);
                n.setContent(nd[1]);
                n.setType(nd[2]);
                n.setIsRead(random.nextBoolean());
                n.setSendStatus(Notification.SendStatus.SENT);
                n.setSentViaInApp(true);
                n.setCreatedAt(ZonedDateTime.now().minusHours(random.nextInt(48)));
                n.setUpdatedAt(ZonedDateTime.now());
                notificationRepository.save(n);
                count++;
            }
        }

        // UserPreference for first 5 users
        for (int i = 0; i < Math.min(5, users.size()); i++) {
            UserPreference pref = new UserPreference();
            pref.setUser(users.get(i));
            pref.setPreferenceType(UserPreference.PreferenceType.DISLIKED_FOOD);
            pref.setItemName("Mực");
            pref.setPreferenceValue("avoid");
            pref.setPriority(1);
            pref.setIsActive(true);
            pref.setCreatedAt(ZonedDateTime.now());
            userPreferenceRepository.save(pref);
            count++;
        }

        return count;
    }

    // ======= REMAINING ENTITIES =======
    @Transactional
    public int importRemainingEntities() {
        List<User> users = userRepository.findAll();
        if (users.isEmpty()) return 0;
        Random random = new Random();
        int count = 0;

        // 1. UserBodyProfile for first 10 users
        for (int i = 0; i < Math.min(10, users.size()); i++) {
            User user = users.get(i);
            if (userBodyProfileRepository.existsByUser_Id(user.getId())) continue;
            UserBodyProfile ubp = new UserBodyProfile();
            ubp.setUser(user);
            BigDecimal h = BigDecimal.valueOf(165.0 + random.nextInt(25));
            BigDecimal w = BigDecimal.valueOf(55.0 + random.nextInt(35));
            ubp.setHeight(h);
            ubp.setWeight(w);
            ubp.setBodyFat(BigDecimal.valueOf(12.0 + random.nextInt(15)));
            ubp.setMuscleMass(BigDecimal.valueOf(25.0 + random.nextInt(15)));
            ubp.setAge(18 + random.nextInt(30));
            ubp.setGender(random.nextBoolean() ? "MALE" : "FEMALE");
            ubp.setExperienceLevel(new String[]{"beginner", "intermediate", "advanced"}[random.nextInt(3)]);
            // 1. Chuẩn bị danh sách các Goal (Giả sử bạn đã lấy list goals từ Database)
            List<Goals> allGoals = goalsRepository.findAll();
// Hoặc tạo nhanh một mảng ID/Code nếu bạn muốn test
            String[] goalLabels = {"lose_weight", "build_muscle", "maintain"};
            // Chọn ngẫu nhiên một Goal từ danh sách đã có
            if (!allGoals.isEmpty()) {
                ubp.setGoalRef(allGoals.get(random.nextInt(allGoals.size())));
            } ubp.setActivityLevel("moderately active");
            userBodyProfileRepository.save(ubp);
            count++;
        }

        // 2. Transactions
        String[] txTypes = {"POINT_EARN", "POINT_SPEND", "REWARD_REDEEM", "CHALLENGE_BONUS"};
        for (int i = 0; i < Math.min(10, users.size()); i++) {
            for (int j = 0; j < 3; j++) {
                Transaction tx = new Transaction();
                tx.setUser(users.get(i));
                tx.setType(txTypes[random.nextInt(txTypes.length)]);
                tx.setAmount(BigDecimal.valueOf(random.nextInt(500) + 50));
                tx.setPoints(random.nextInt(200) + 10);
                tx.setReference("REF-" + System.currentTimeMillis() + "-" + i + j);
                tx.setStatus(Transaction.TransactionStatus.COMPLETED);
                tx.setDescription("Giao dịch tự động #" + (i * 3 + j + 1));
                tx.setCreatedAt(ZonedDateTime.now().minusDays(random.nextInt(30)));
                transactionRepository.save(tx);
                count++;
            }
        }

        // 3. RewardRedemption
        List<Reward> rewards = rewardRepository.findAll();
        if (!rewards.isEmpty()) {
            for (int i = 0; i < Math.min(5, users.size()); i++) {
                Reward reward = rewards.get(random.nextInt(rewards.size()));
                RewardRedemption rr = new RewardRedemption();
                rr.setUser(users.get(i));
                rr.setReward(reward);
                rr.setStatus(RewardRedemption.RedemptionStatus.FULFILLED);
                rr.setCreatedAt(ZonedDateTime.now().minusDays(random.nextInt(14)));
                rr.setFulfilledAt(ZonedDateTime.now().minusDays(random.nextInt(7)));
                rewardRedemptionRepository.save(rr);
                count++;
            }
        }

        // 4. AiModelEvent + AiEvaluationLog (từ UserChallenges)
        List<UserChallenge> ucs = userChallengeRepository.findAll();
        for (int i = 0; i < Math.min(10, ucs.size()); i++) {
            UserChallenge uc = ucs.get(i);
            // AiModelEvent
            AiModelEvent ame = new AiModelEvent();
            ame.setUserChallenge(uc);
            ame.setUser(uc.getUser());
            ame.setChallenge(uc.getChallenge());
            Exercise challengeExercise = uc.getChallenge() != null && uc.getChallenge().getExercises() != null
                    && !uc.getChallenge().getExercises().isEmpty()
                    ? uc.getChallenge().getExercises().iterator().next()
                    : null;
            ame.setExercise(challengeExercise);
            ame.setReps(10 + random.nextInt(20));
            ame.setQualityScore(0.6 + random.nextDouble() * 0.4);
            ame.setConfidence(0.7 + random.nextDouble() * 0.3);
            ame.setPassed(ame.getQualityScore() > 0.7);
            ame.setExerciseType(challengeExercise != null ? challengeExercise.getExerciseType() : null);
            ame.setModelName("pose-estimation-v3");
            ame.setModelVersion("3.1.0");
            ame.setResultJson("{\"score\": " + String.format("%.2f", ame.getQualityScore()) + "}");
            ame.setCreatedAt(ZonedDateTime.now().minusDays(random.nextInt(30)));
            aiModelEventRepository.save(ame);
            count++;

            // AiEvaluationLog
            AiEvaluationLog ael = new AiEvaluationLog();
            ael.setUser(uc.getUser());
            ael.setChallenge(uc.getChallenge());
            ael.setUserChallenge(uc);
            ael.setModelName("pose-estimation-v3");
            ael.setModelVersion("3.1.0");
            ael.setInputVideoUrl(uc.getVideoUrl());
            ael.setStatus(AiEvaluationLog.AiEvaluationStatus.COMPLETED);
            ael.setScore(60 + random.nextInt(40));
            ael.setConfidence(0.7 + random.nextDouble() * 0.3);
            ael.setProcessingTimeMs((long)(500 + random.nextInt(3000)));
            ael.setStartedAt(ZonedDateTime.now().minusDays(random.nextInt(30)));
            ael.setCompletedAt(ael.getStartedAt().plusSeconds(ael.getProcessingTimeMs() / 1000));
            ael.setCreatedAt(ael.getStartedAt());
            aiEvaluationLogRepository.save(ael);
            count++;
        }

        // 5. Report (vài báo cáo mẫu)
        for (int i = 0; i < Math.min(3, ucs.size()); i++) {
            UserChallenge uc = ucs.get(i);
            Report report = new Report();
            report.setUser(uc.getUser());
            report.setChallenge(uc.getChallenge());
            report.setUserChallenge(uc);
            report.setReportType("SCORE_DISPUTE");
            report.setTitle("Điểm AI chưa chính xác - Challenge #" + uc.getChallenge().getId());
            report.setDescription("Tôi nghĩ AI đánh giá sai form tập của tôi.");
            report.setEvidenceUrl(uc.getVideoUrl());
            report.setStatus(i == 0 ? Report.ReportStatus.RESOLVED : Report.ReportStatus.PENDING);
            report.setCreatedAt(ZonedDateTime.now().minusDays(random.nextInt(14)));
            if (i == 0) {
                report.setAdminResponse("Đã xem lại video, điểm đã được điều chỉnh.");
                report.setResolutionAction("SCORE_ADJUSTED");
                report.setAdjustedScore(85);
                report.setResolvedAt(ZonedDateTime.now().minusDays(1));
            }
            reportRepository.save(report);
            count++;
        }

        // 6. PlanVersionHistory
        List<PersonalizedNutritionPlan> pnps = personalizedNutritionPlanRepository.findAll();
        for (int i = 0; i < Math.min(3, pnps.size()); i++) {
            PersonalizedNutritionPlan pnp = pnps.get(i);
            PlanVersionHistory pvh = new PlanVersionHistory();
            pvh.setUser(pnp.getUser());
            pvh.setPlanType(PlanVersionHistory.PlanType.NUTRITION);
            pvh.setPlanId(pnp.getPnpId());
            pvh.setVersionNumber(1);
            pvh.setAiVersionId(pnp.getAiPlanId());
            pvh.setChangeSummary("Initial plan creation");
            pvh.setEstimatedCost(pnp.getEstimatedTotalCost());
            pvh.setStatus(PlanVersionHistory.VersionStatus.ACTIVE);
            pvh.setIsCurrent(true);
            pvh.setIsDeleted(false);
            pvh.setCreatedAt(ZonedDateTime.now());
            planVersionHistoryRepository.save(pvh);
            count++;
        }

        log.debug("   - Remaining entities: {}", count);
        return count;
    }
}
