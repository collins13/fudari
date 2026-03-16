package com.tufixit.backend.repository;

import com.tufixit.backend.entity.Job;
import com.tufixit.backend.entity.WorkerSkill;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JobRepository extends JpaRepository<Job, Long> {
    
    List<Job> findByClientId(Long clientId);
    
    Page<Job> findByClientId(Long clientId, Pageable pageable);
    
    List<Job> findByAssignedWorkerId(Long workerId);
    
    Page<Job> findByAssignedWorkerId(Long workerId, Pageable pageable);
    
    @Query("SELECT j FROM Job j WHERE j.status = :status AND j.allowBidding = true")
    Page<Job> findOpenJobs(@Param("status") Job.JobStatus status, Pageable pageable);
    
    @Query("SELECT j FROM Job j WHERE j.skillType = :skillType AND j.status IN ('PENDING', 'BIDDING')")
    List<Job> findBySkillTypeAndStatus(@Param("skillType") WorkerSkill.SkillType skillType);
    
    @Query(value = "SELECT * FROM jobs j WHERE j.status IN ('PENDING', 'BIDDING') " +
           "AND (6371 * acos(cos(radians(:latitude)) * cos(radians(j.latitude)) * " +
           "cos(radians(j.longitude) - radians(:longitude)) + sin(radians(:latitude)) * " +
           "sin(radians(j.latitude)))) < :radiusKm", nativeQuery = true)
    List<Job> findNearbyJobs(@Param("latitude") Double latitude, 
                              @Param("longitude") Double longitude, 
                              @Param("radiusKm") Double radiusKm);
    
    @Query("SELECT j FROM Job j WHERE j.status = :status")
    Page<Job> findByStatus(@Param("status") Job.JobStatus status, Pageable pageable);
}
