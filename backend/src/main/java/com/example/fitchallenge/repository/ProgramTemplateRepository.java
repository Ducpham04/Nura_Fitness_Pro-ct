package com.example.fitchallenge.repository;

import com.example.fitchallenge.Entity.ProgramTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Optional;

@Repository
public interface ProgramTemplateRepository extends JpaRepository<ProgramTemplate, Long> {
    Optional<ProgramTemplate> findTopByUserTrainingIdAndStatusOrderByVersionNumberDesc(Long userTrainingId, String status);
    void deleteByUserTrainingIdIn(Collection<Long> userTrainingIds);
}
