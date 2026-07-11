package com.example.fitchallenge.DTO.UserBodyProfileDTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserBodyProfileRequest {
    private Double height;
    private Double weight;
    private Double bodyFat;
    private Double muscleMass;
    private Integer age;
    private String gender;
    private String experienceLevel; // beginner, intermediate, advanced
    /** Mức vận động THẬT user chọn: sedentary | light | moderate | very (ActivityLevelUtil normalize). */
    private String activityLevel;
    private String goal; // lose_weight, build_muscle, maintain_fitness
    private String injuryNotes;
    private Integer targetBudgetPerDay;

   
}






