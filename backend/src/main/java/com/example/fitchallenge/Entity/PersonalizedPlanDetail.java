package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Entity: PersonalizedPlanDetail
 * 👉 Chức năng: Lưu trữ bài tập đã được cá nhân hóa cho từng user
 * Dựa trên thông tin từ Health Profile, hệ thống sẽ chọn template phù hợp
 * và tạo plan cá nhân hóa với các bài tập từ training plan
 * 
 * Video và metadata an toàn sẽ được lấy từ Exercise master data.
 */
@Entity
@Table(name = "personalized_plan_detail")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PersonalizedPlanDetail {

    /**
     * 🔑 Mã bản ghi (Primary Key, tự tăng)
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ppd_id")
    private Long id;

    /**
     * 🔗 Reference đến TrainingPlanDetail template (nullable, optional)
     * Dùng để track xem personalized detail này được tạo từ template nào
     * 
     * ⚠️ QUAN TRỌNG: Field này KHÔNG phải auto increment
     * Giá trị được set từ template.getTpdId() khi tạo PersonalizedPlanDetail
     * Dùng để UI hiển thị đúng challenge gốc và map với template
     */
    @Column(name = "tpd_id", nullable = true)
    private Long tpdId;

    /**
     * 🔗 Reference đến UserTraining (ut_id)
     * Dùng để track xem personalized detail này thuộc UserTraining nào
     * 
     * ⚠️ QUAN TRỌNG: Field này KHÔNG phải auto increment
     * Giá trị được set từ userTraining.getUtId() khi tạo PersonalizedPlanDetail
     */
    @Column(name = "ut_id", nullable = true)
    private Long utId;

    /**
     * 👤 Người dùng (khóa ngoại → users.user_id)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * 📅 Số ngày trong kế hoạch (Day 1, Day 2, ...)
     */
    @Column(name = "day_number", nullable = false)
    private Integer dayNumber;

    /**
     * 🏋️ Bài tập master data (khóa ngoại → exercises.exercise_id)
     * Dùng để lấy metadata y khoa, video và exercise_type cho AI.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exercise_id")
    private Exercise exercise;

    /**
     * 🏋️ Tên bài tập
     * Ví dụ: "Push Up", "Squat", "Pull Up"
     */
    @Column(name = "exercise_name", nullable = false, length = 200)
    private String exerciseName;

    /**
     * 🔁 Số hiệp (sets)
     */
    @Column(name = "sets", nullable = false)
    private Integer sets;

    /**
     * 🔂 Số lần lặp trong mỗi hiệp (reps)
     */
    @Column(name = "reps", nullable = false)
    private Integer reps;

    @Column(name = "rest_time")
    private Integer restTime;

    /**
     * 📊 Độ khó
     * Ví dụ: "EASY", "MEDIUM", "HARD"
     */
    @Column(name = "difficulty", length = 50, nullable = false)
    private String difficulty;

    /**
     * 💪 Nhóm cơ mục tiêu
     * Ví dụ: "Chest", "Legs", "Back", "Arms", "Core"
     */
    @Column(name = "target_muscle", length = 100)
    private String targetMuscle;

    /**
     * 🔥 Calories ước tính cho bài tập này (dựa trên sets, reps, duration)
     * Được tính tự động khi tạo personalized plan
     */
    @Column(name = "estimated_calories")
    private Integer estimatedCalories;

    /**
     * 📝 Hướng dẫn / ghi chú cho bài tập.
     * Chứa: nhóm cơ, phase tập luyện, mục tiêu, số tạ gợi ý, tempo.
     * Ví dụ: "[Chest] Foundation phase. Trains chest for fat burning. Tempo: 3-0-1."
     */
    @Column(name = "notes", length = 500)
    private String notes;

    /**
     * 🏋️ Số tạ gợi ý (nếu bài tập dùng thiết bị).
     * Ví dụ: "~15kg dumbbell", "~40kg barbell". Null cho bài tập bodyweight.
     */
    @Column(name = "recommended_weight", length = 50)
    private String recommendedWeight;

    // Manual Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTpdId() { return tpdId; }
    public void setTpdId(Long tpdId) { this.tpdId = tpdId; }
    public Long getUtId() { return utId; }
    public void setUtId(Long utId) { this.utId = utId; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public Integer getDayNumber() { return dayNumber; }
    public void setDayNumber(Integer dayNumber) { this.dayNumber = dayNumber; }
    public Exercise getExercise() { return exercise; }
    public void setExercise(Exercise exercise) { this.exercise = exercise; }
    public String getExerciseName() { return exerciseName; }
    public void setExerciseName(String exerciseName) { this.exerciseName = exerciseName; }
    public Integer getSets() { return sets; }
    public void setSets(Integer sets) { this.sets = sets; }
    public Integer getReps() { return reps; }
    public void setReps(Integer reps) { this.reps = reps; }
    public Integer getRestTime() { return restTime; }
    public void setRestTime(Integer restTime) { this.restTime = restTime; }
    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }
    public String getTargetMuscle() { return targetMuscle; }
    public void setTargetMuscle(String targetMuscle) { this.targetMuscle = targetMuscle; }
    public Integer getEstimatedCalories() { return estimatedCalories; }
    public void setEstimatedCalories(Integer estimatedCalories) { this.estimatedCalories = estimatedCalories; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getRecommendedWeight() { return recommendedWeight; }
    public void setRecommendedWeight(String recommendedWeight) { this.recommendedWeight = recommendedWeight; }

    // Manual Builder
    public static PersonalizedPlanDetailBuilder builder() {
        return new PersonalizedPlanDetailBuilder();
    }

    public static class PersonalizedPlanDetailBuilder {
        private final PersonalizedPlanDetail instance = new PersonalizedPlanDetail();
        public PersonalizedPlanDetailBuilder id(Long id) { instance.setId(id); return this; }
        public PersonalizedPlanDetailBuilder tpdId(Long tpdId) { instance.setTpdId(tpdId); return this; }
        public PersonalizedPlanDetailBuilder utId(Long utId) { instance.setUtId(utId); return this; }
        public PersonalizedPlanDetailBuilder user(User user) { instance.setUser(user); return this; }
        public PersonalizedPlanDetailBuilder dayNumber(Integer dayNumber) { instance.setDayNumber(dayNumber); return this; }
        public PersonalizedPlanDetailBuilder exercise(Exercise exercise) { instance.setExercise(exercise); return this; }
        public PersonalizedPlanDetailBuilder exerciseName(String exerciseName) { instance.setExerciseName(exerciseName); return this; }
        public PersonalizedPlanDetailBuilder sets(Integer sets) { instance.setSets(sets); return this; }
        public PersonalizedPlanDetailBuilder reps(Integer reps) { instance.setReps(reps); return this; }
        public PersonalizedPlanDetailBuilder restTime(Integer restTime) { instance.setRestTime(restTime); return this; }
        public PersonalizedPlanDetailBuilder difficulty(String difficulty) { instance.setDifficulty(difficulty); return this; }
        public PersonalizedPlanDetailBuilder targetMuscle(String targetMuscle) { instance.setTargetMuscle(targetMuscle); return this; }
        public PersonalizedPlanDetailBuilder estimatedCalories(Integer estimatedCalories) { instance.setEstimatedCalories(estimatedCalories); return this; }
        public PersonalizedPlanDetailBuilder notes(String notes) { instance.setNotes(notes); return this; }
        public PersonalizedPlanDetailBuilder recommendedWeight(String recommendedWeight) { instance.setRecommendedWeight(recommendedWeight); return this; }
        public PersonalizedPlanDetail build() { return instance; }
    }
}
