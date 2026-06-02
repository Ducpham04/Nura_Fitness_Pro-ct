package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.TrainingPlanDetail;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import org.springframework.stereotype.Repository;

@Repository
public interface TrainingPlanDetailRepository extends JpaRepository<TrainingPlanDetail, Long> {
    List<TrainingPlanDetail> findByTrainingPlan_TpId(Long tpId);
    List<TrainingPlanDetail> findByTrainingPlan_TpIdAndDayNumber(Long tpId, Integer dayNumber);
    void deleteByTrainingPlan_TpIdAndDayNumberBetween(Long tpId, Integer startDay, Integer endDay);
    
    java.util.Optional<TrainingPlanDetail> findByTrainingPlan_TpIdAndExercise_Id(Long tpId, Long exerciseId);
}
