package com.example.fitchallenge.service;

import com.example.fitchallenge.Entity.User;
import com.example.fitchallenge.Entity.UserPreference;
import com.example.fitchallenge.repository.UserPreferenceRepository;
import com.example.fitchallenge.repository.User.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Service: UserPreference
 * 👉 Chức năng: Quản lý preferences và feedback của user cho AI
 * 💡 Tích hợp với AI Service để cải thiện plan theo thời gian
 */
@Service
public class UserPreferenceService {

    @Autowired
    private UserPreferenceRepository preferenceRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ObjectMapper objectMapper;

    /**
     * ➕ Thêm preference mới hoặc tăng occurrence nếu đã tồn tại
     */
    @Transactional
    public UserPreference addPreference(Long userId, UserPreference.PreferenceType type,
                                         String itemName, String value, Integer priority,
                                         String contextJson, ZonedDateTime expiresAt) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        // Check nếu đã tồn tại
        Optional<UserPreference> existing = preferenceRepository.findSpecificPreference(user, type, itemName);

        if (existing.isPresent()) {
            UserPreference pref = existing.get();
            pref.setOccurrenceCount(pref.getOccurrenceCount() + 1);
            pref.setUpdatedAt(ZonedDateTime.now());
            if (priority != null) pref.setPriority(priority);
            if (value != null) pref.setPreferenceValue(value);
            return preferenceRepository.save(pref);
        } else {
            UserPreference pref = new UserPreference();
            pref.setUser(user);
            pref.setPreferenceType(type);
            pref.setItemName(itemName);
            pref.setPreferenceValue(value);
            pref.setPriority(priority != null ? priority : 5);
            pref.setOccurrenceCount(1);
            pref.setContextJson(contextJson);
            pref.setExpiresAt(expiresAt);
            pref.setIsActive(true);
            return preferenceRepository.save(pref);
        }
    }

    /**
     * 📝 Ghi nhận thực phẩm không thích
     */
    @Transactional
    public void recordDislikedFood(Long userId, String foodName, String reason) {
        addPreference(userId, UserPreference.PreferenceType.DISLIKED_FOOD,
            foodName, reason, 8, "{\"reason\": \"" + reason + "\"}", null);
    }

    /**
     * 📝 Ghi nhận thực phẩm yêu thích
     */
    @Transactional
    public void recordLikedFood(Long userId, String foodName, String reason) {
        addPreference(userId, UserPreference.PreferenceType.LIKED_FOOD,
            foodName, reason, 7, "{\"reason\": \"" + reason + "\"}", null);
    }

    /**
     * 📝 Ghi nhận bài tập bị skip
     */
    @Transactional
    public void recordSkippedExercise(Long userId, String exerciseName, String reason, Long challengeId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        UserPreference pref = new UserPreference();
        pref.setUser(user);
        pref.setPreferenceType(UserPreference.PreferenceType.SKIPPED_EXERCISE);
        pref.setItemName(exerciseName);
        pref.setPreferenceValue(reason);
        pref.setPriority(8);
        pref.setOccurrenceCount(1);
        pref.setContextJson("{\"challenge_id\": " + challengeId + ", \"reason\": \"" + reason + "\"}");
        pref.setIsActive(true);

        preferenceRepository.save(pref);
    }

    /**
     * 🍳 Cập nhật cooking equipment
     */
    @Transactional
    public void updateCookingEquipment(Long userId, List<String> equipment) {
        try {
            String equipmentJson = objectMapper.writeValueAsString(equipment);

            // Deactivate existing
            List<UserPreference> existing = preferenceRepository.findByUserAndType(
                userRepository.findById(userId).orElseThrow(),
                UserPreference.PreferenceType.COOKING_EQUIPMENT
            );
            existing.forEach(e -> preferenceRepository.deactivate(e.getUpId()));

            // Add new
            addPreference(userId, UserPreference.PreferenceType.COOKING_EQUIPMENT,
                "equipment_list", equipmentJson, 6, null, null);

        } catch (Exception e) {
            throw new RuntimeException("Failed to update cooking equipment", e);
        }
    }

    /**
     * ⏱️ Cập nhật meal prep time preference
     */
    @Transactional
    public void updateMealPrepTime(Long userId, int maxPrepTimeMinutes) {
        // Deactivate existing
        List<UserPreference> existing = preferenceRepository.findByUserAndType(
            userRepository.findById(userId).orElseThrow(),
            UserPreference.PreferenceType.MEAL_PREP_TIME
        );
        existing.forEach(e -> preferenceRepository.deactivate(e.getUpId()));

        // Add new
        addPreference(userId, UserPreference.PreferenceType.MEAL_PREP_TIME,
            "max_prep_time", String.valueOf(maxPrepTimeMinutes), 7, null, null);
    }

    /**
     * 💼 Cập nhật work schedule
     */
    @Transactional
    public void updateWorkSchedule(Long userId, String schedule) {
        // Deactivate existing
        List<UserPreference> existing = preferenceRepository.findByUserAndType(
            userRepository.findById(userId).orElseThrow(),
            UserPreference.PreferenceType.WORK_SCHEDULE
        );
        existing.forEach(e -> preferenceRepository.deactivate(e.getUpId()));

        // Add new
        addPreference(userId, UserPreference.PreferenceType.WORK_SCHEDULE,
            "schedule", schedule, 6, null, null);
    }

    /**
     * 📋 Lấy tất cả active preferences của user
     */
    public List<UserPreference> getUserPreferences(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return preferenceRepository.findAllActiveByUser(user);
    }

    /**
     * 📋 Lấy preferences theo type
     */
    public List<UserPreference> getPreferencesByType(Long userId, UserPreference.PreferenceType type) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return preferenceRepository.findByUserAndType(user, type);
    }

    /**
     * 🍽️ Lấy danh sách thực phẩm nên tránh (cho AI prompt)
     */
    public List<String> getFoodsToAvoid(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return preferenceRepository.findDislikedFoods(user);
    }

    /**
     * 🍽️ Lấy danh sách thực phẩm nên ưu tiên (cho AI prompt)
     */
    public List<String> getFoodsToPrioritize(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        List<UserPreference> liked = preferenceRepository.findTopLikedFoods(user);
        return liked.stream().map(UserPreference::getItemName).collect(Collectors.toList());
    }

    /**
     * 🏋️ Lấy danh sách bài tập hay bị skip (để AI điều chỉnh)
     */
    public List<UserPreference> getSkippedExercises(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return preferenceRepository.findSkippedExercises(user);
    }

    /**
     * 🤖 Tạo AI prompt context từ preferences
     */
    public Map<String, Object> buildAiPromptContext(Long userId) {
        Map<String, Object> context = new HashMap<>();

        List<UserPreference> allPrefs = getUserPreferences(userId);

        // Group by type
        Map<UserPreference.PreferenceType, List<UserPreference>> grouped = allPrefs.stream()
            .collect(Collectors.groupingBy(UserPreference::getPreferenceType));

        // Disliked foods
        if (grouped.containsKey(UserPreference.PreferenceType.DISLIKED_FOOD)) {
            context.put("disliked_foods", grouped.get(UserPreference.PreferenceType.DISLIKED_FOOD)
                .stream().map(UserPreference::getItemName).collect(Collectors.toList()));
        }

        // Liked foods
        if (grouped.containsKey(UserPreference.PreferenceType.LIKED_FOOD)) {
            context.put("liked_foods", grouped.get(UserPreference.PreferenceType.LIKED_FOOD)
                .stream().map(UserPreference::getItemName).collect(Collectors.toList()));
        }

        // Skipped exercises
        if (grouped.containsKey(UserPreference.PreferenceType.SKIPPED_EXERCISE)) {
            context.put("skipped_exercises", grouped.get(UserPreference.PreferenceType.SKIPPED_EXERCISE)
                .stream().map(pref -> {
                    Map<String, String> ex = new HashMap<>();
                    ex.put("name", pref.getItemName());
                    ex.put("reason", pref.getPreferenceValue());
                    return ex;
                }).collect(Collectors.toList()));
        }

        // Cooking equipment
        if (grouped.containsKey(UserPreference.PreferenceType.COOKING_EQUIPMENT)) {
            UserPreference equip = grouped.get(UserPreference.PreferenceType.COOKING_EQUIPMENT).get(0);
            try {
                List<String> equipment = objectMapper.readValue(equip.getPreferenceValue(),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
                context.put("cooking_equipment", equipment);
            } catch (Exception e) {
                context.put("cooking_equipment", new ArrayList<>());
            }
        }

        // Meal prep time
        if (grouped.containsKey(UserPreference.PreferenceType.MEAL_PREP_TIME)) {
            UserPreference time = grouped.get(UserPreference.PreferenceType.MEAL_PREP_TIME).get(0);
            context.put("meal_prep_time_minutes", Integer.parseInt(time.getPreferenceValue()));
        }

        // Work schedule
        if (grouped.containsKey(UserPreference.PreferenceType.WORK_SCHEDULE)) {
            UserPreference schedule = grouped.get(UserPreference.PreferenceType.WORK_SCHEDULE).get(0);
            context.put("work_schedule", schedule.getPreferenceValue());
        }

        return context;
    }

    /**
     * 🗑️ Deactivate preference
     */
    @Transactional
    public void deactivatePreference(Long preferenceId, Long userId) {
        UserPreference pref = preferenceRepository.findById(preferenceId)
            .orElseThrow(() -> new RuntimeException("Preference not found"));
        if (pref.getUser() == null || !pref.getUser().getId().equals(userId)) {
            throw new SecurityException("Forbidden: Preference does not belong to user");
        }
        preferenceRepository.deactivate(preferenceId);
    }

    /**
     * 🧹 Clean up expired preferences
     */
    @Transactional
    public void cleanupExpiredPreferences() {
        preferenceRepository.deleteExpiredPreferences(ZonedDateTime.now());
    }

    /**
     * 📊 Thống kê preferences của user
     */
    public PreferenceStats getPreferenceStats(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        List<UserPreference> allPrefs = preferenceRepository.findAllActiveByUser(user);

        long dislikedFoods = allPrefs.stream().filter(p -> p.getPreferenceType() == UserPreference.PreferenceType.DISLIKED_FOOD).count();
        long likedFoods = allPrefs.stream().filter(p -> p.getPreferenceType() == UserPreference.PreferenceType.LIKED_FOOD).count();
        long skippedExercises = allPrefs.stream().filter(p -> p.getPreferenceType() == UserPreference.PreferenceType.SKIPPED_EXERCISE).count();

        return new PreferenceStats(dislikedFoods, likedFoods, skippedExercises, allPrefs.size());
    }

    // 📦 Stats class
    public static class PreferenceStats {
        public final long dislikedFoods;
        public final long likedFoods;
        public final long skippedExercises;
        public final long totalPreferences;

        public PreferenceStats(long dislikedFoods, long likedFoods, long skippedExercises, long totalPreferences) {
            this.dislikedFoods = dislikedFoods;
            this.likedFoods = likedFoods;
            this.skippedExercises = skippedExercises;
            this.totalPreferences = totalPreferences;
        }
    }
}
