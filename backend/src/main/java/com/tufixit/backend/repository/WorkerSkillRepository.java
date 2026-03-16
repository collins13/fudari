package com.tufixit.backend.repository;

import com.tufixit.backend.entity.WorkerSkill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkerSkillRepository extends JpaRepository<WorkerSkill, Long> {
    
    List<WorkerSkill> findByWorkerId(Long workerId);
    
    List<WorkerSkill> findBySkillType(WorkerSkill.SkillType skillType);
    
    boolean existsByWorkerIdAndSkillType(Long workerId, WorkerSkill.SkillType skillType);
}
