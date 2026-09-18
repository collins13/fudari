package com.tufixit.backend.repository;

import com.tufixit.backend.entity.WorkerSkill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkerSkillRepository extends JpaRepository<WorkerSkill, Long> {
    
    List<WorkerSkill> findByWorkerId(Long workerId);
    
    List<WorkerSkill> findBySkillType(WorkerSkill.SkillType skillType);
    
    boolean existsByWorkerIdAndSkillType(Long workerId, WorkerSkill.SkillType skillType);

    /** Fetch-joined so DTO mapping outside a transaction never triggers a lazy load. */
    @Query("SELECT DISTINCT ws FROM WorkerSkill ws LEFT JOIN FETCH ws.services WHERE ws.worker.id = :workerId")
    List<WorkerSkill> findByWorkerIdWithServices(@Param("workerId") Long workerId);

    @Query("SELECT DISTINCT ws.worker.id FROM WorkerSkill ws JOIN ws.services s WHERE s.slug = :slug")
    List<Long> findWorkerIdsByServiceSlug(@Param("slug") String slug);
}
