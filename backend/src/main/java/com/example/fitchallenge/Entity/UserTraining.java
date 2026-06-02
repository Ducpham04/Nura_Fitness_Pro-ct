package com.example.fitchallenge.Entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
@Data
@Setter
@Getter
@Entity
@Table(name = "user_training")
public class UserTraining {

    // 🧩 Getters và Setters
    // 🆔 Mã bản ghi người dùng - kế hoạch
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ut_id")
    private Long utId;

    // 👤 Người dùng tham gia kế hoạch
    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 🏋️‍♂️ Kế hoạch tập mà người dùng đang theo
    @ManyToOne(optional = false)
    @JoinColumn(name = "tp_id", nullable = false)
    private TrainingPlan trainingPlan;

    // 📅 Ngày bắt đầu kế hoạch
    @Column(name = "start_date")
    private LocalDate startDate;

    // 📆 Ngày kết thúc kế hoạch (có thể null)
    @Column(name = "end_date")
    private LocalDate endDate;
    // ❌ THIẾU: Số ngày đã hoàn thành
    @Column(name = "completed_days")
    private Integer completedDays = 0;

    // ❌ THIẾU: Ngày hiện tại đang ở (để tracking)
    @Column(name = "current_day")
    private Integer currentDay = 1;

    // ❌ THIẾU: Tỷ lệ hoàn thành (%)
    @Column(name = "completion_percentage")
    private Double completionPercentage = 0.0;

    // ⚙️ Trạng thái kế hoạch: active / completed / cancelled
    @Column(name = "status", length = 20, columnDefinition = "VARCHAR(20) DEFAULT 'active'")
    private String status = "active";

    // ─── Phase 2 Fields ────────────────────────────────────────────────────

    // Tuần hiện tại của chương trình (1-12)
    @Column(name = "week_number")
    private Integer weekNumber = 1;

    // Tổng số tuần của chương trình (vd: 8, 10, 12)
    @Column(name = "total_weeks")
    private Integer totalWeeks = 1;

    // ID chương trình đã chọn (vd: "8W", "12W")
    @Column(name = "program_id", length = 20)
    private String programId;

    // 🧱 Constructors
    public UserTraining() {}

    public UserTraining(User user, TrainingPlan trainingPlan, LocalDate startDate, LocalDate endDate, String status) {
        this.user = user;
        this.trainingPlan = trainingPlan;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = status;
    }
    
    // Manual getters/setters for Lombok compatibility
    public Long getUtId() {
        return utId;
    }
    
    public void setUtId(Long utId) {
        this.utId = utId;
    }
    
    public User getUser() {
        return user;
    }
    
    public void setUser(User user) {
        this.user = user;
    }
    
    public TrainingPlan getTrainingPlan() {
        return trainingPlan;
    }
    
    public void setTrainingPlan(TrainingPlan trainingPlan) {
        this.trainingPlan = trainingPlan;
    }
    
    public LocalDate getStartDate() {
        return startDate;
    }
    
    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }
    
    public LocalDate getEndDate() {
        return endDate;
    }
    
    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }
    
    public Integer getCompletedDays() {
        return completedDays;
    }
    
    public void setCompletedDays(Integer completedDays) {
        this.completedDays = completedDays;
    }
    
    public Integer getCurrentDay() {
        return currentDay;
    }
    
    public void setCurrentDay(Integer currentDay) {
        this.currentDay = currentDay;
    }
    
    public Double getCompletionPercentage() {
        return completionPercentage;
    }
    
    public void setCompletionPercentage(Double completionPercentage) {
        this.completionPercentage = completionPercentage;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getWeekNumber() {
        return weekNumber;
    }

    public void setWeekNumber(Integer weekNumber) {
        this.weekNumber = weekNumber;
    }

    public Integer getTotalWeeks() {
        return totalWeeks;
    }

    public void setTotalWeeks(Integer totalWeeks) {
        this.totalWeeks = totalWeeks;
    }

    public String getProgramId() {
        return programId;
    }

    public void setProgramId(String programId) {
        this.programId = programId;
    }
}
