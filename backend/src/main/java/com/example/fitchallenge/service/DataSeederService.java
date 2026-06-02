package com.example.fitchallenge.service;

/**
 * Service để import dữ liệu mẫu vào database
 */
public interface DataSeederService {
    
    /**
     * Import toàn bộ dữ liệu mẫu
     * @return Số lượng records đã tạo
     */
    DataSeederResult importAllData();
    
    /**
     * Import chỉ users
     */
    int importUsers(int count);
    
    /**
     * Import chỉ challenges
     */
    int importChallenges(int count);
    
    /**
     * Import chỉ training plans
     */
    int importTrainingPlans(int count);
    
    /**
     * Import daily training logs
     */
    int importDailyTrainingLogs(int count);
    
    /**
     * Import user challenges
     */
    int importUserChallenges(int count);

    /**
     * Import health profiles and body info
     */
    int importHealthProfiles();

    /**
     * Import budget tracking data
     */
    int importBudgetTracking(int count);

    /**
     * Import rewards and redemptions
     */
    int importRewards();

    /**
     * Import or complete exercise master data.
     */
    int importExercises();

    /**
     * Import or complete food master data.
     */
    int importFoods();

    /**
     * Import Hybrid Smart Meal catalog: normalize food macros/categories,
     * create dishes, and create dish ingredients.
     */
    int importHybridMealCatalog();

    /**
     * Result class cho import operation
     */
    class DataSeederResult {
        private int usersCreated;
        private int challengesCreated;
        private int trainingPlansCreated;
        private int dailyLogsCreated;
        private int userChallengesCreated;
        private int healthProfilesCreated;
        private int budgetRecordsCreated;
        private int rewardsCreated;
        private int exercisesCreated;
        private int foodsCreated;
        private int hybridMealRecordsCreated;
        private int totalRecords;
        
        // Getters and setters
        public int getUsersCreated() { return usersCreated; }
        public void setUsersCreated(int usersCreated) { this.usersCreated = usersCreated; }
        
        public int getChallengesCreated() { return challengesCreated; }
        public void setChallengesCreated(int challengesCreated) { this.challengesCreated = challengesCreated; }
        
        public int getTrainingPlansCreated() { return trainingPlansCreated; }
        public void setTrainingPlansCreated(int trainingPlansCreated) { this.trainingPlansCreated = trainingPlansCreated; }
        
        public int getDailyLogsCreated() { return dailyLogsCreated; }
        public void setDailyLogsCreated(int dailyLogsCreated) { this.dailyLogsCreated = dailyLogsCreated; }
        
        public int getUserChallengesCreated() { return userChallengesCreated; }
        public void setUserChallengesCreated(int userChallengesCreated) { this.userChallengesCreated = userChallengesCreated; }

        public int getHealthProfilesCreated() { return healthProfilesCreated; }
        public void setHealthProfilesCreated(int healthProfilesCreated) { this.healthProfilesCreated = healthProfilesCreated; }

        public int getBudgetRecordsCreated() { return budgetRecordsCreated; }
        public void setBudgetRecordsCreated(int budgetRecordsCreated) { this.budgetRecordsCreated = budgetRecordsCreated; }

        public int getRewardsCreated() { return rewardsCreated; }
        public void setRewardsCreated(int rewardsCreated) { this.rewardsCreated = rewardsCreated; }

        public int getExercisesCreated() { return exercisesCreated; }
        public void setExercisesCreated(int exercisesCreated) { this.exercisesCreated = exercisesCreated; }

        public int getFoodsCreated() { return foodsCreated; }
        public void setFoodsCreated(int foodsCreated) { this.foodsCreated = foodsCreated; }

        public int getHybridMealRecordsCreated() { return hybridMealRecordsCreated; }
        public void setHybridMealRecordsCreated(int hybridMealRecordsCreated) { this.hybridMealRecordsCreated = hybridMealRecordsCreated; }
        
        public int getTotalRecords() { return totalRecords; }
        public void setTotalRecords(int totalRecords) { this.totalRecords = totalRecords; }
    }
}

