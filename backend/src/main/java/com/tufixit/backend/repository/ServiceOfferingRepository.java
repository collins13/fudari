package com.tufixit.backend.repository;

import com.tufixit.backend.entity.ServiceOffering;
import com.tufixit.backend.entity.WorkerSkill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceOfferingRepository extends JpaRepository<ServiceOffering, Long> {

    Optional<ServiceOffering> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<ServiceOffering> findByIsActiveTrueOrderBySortOrderAscNameAsc();

    List<ServiceOffering> findBySkillTypeAndIsActiveTrueOrderBySortOrderAscNameAsc(WorkerSkill.SkillType skillType);

    List<ServiceOffering> findAllByOrderBySortOrderAscNameAsc();

    /** Worker counts per service offering, for supply gating on landing pages. */
    @Query("""
            SELECT s.id, COUNT(DISTINCT ws.worker.id)
            FROM WorkerSkill ws JOIN ws.services s
            WHERE ws.worker.isActive = true AND ws.worker.isApproved = true
            GROUP BY s.id
            """)
    List<Object[]> countWorkersPerService();
}
