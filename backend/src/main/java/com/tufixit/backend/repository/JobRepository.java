package com.tufixit.backend.repository;

import com.tufixit.backend.entity.Job;
import com.tufixit.backend.entity.WorkerSkill;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

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

    // ── Booking-specific queries ──────────────────────────────────────────────

    Optional<Job> findByBookingCode(String bookingCode);

    boolean existsByBookingCode(String bookingCode);

    /** Jobs assigned to artisan ordered newest first */
    @Query("SELECT j FROM Job j WHERE j.assignedWorker.id = :workerId ORDER BY j.createdAt DESC")
    List<Job> findByAssignedWorkerIdOrderByCreatedAtDesc(@Param("workerId") Long workerId);

    /** Pending (unassigned) booking requests directed at an artisan via bookingCode search
     *  — artisan sees PENDING jobs where they are the assignedWorker */
    @Query("SELECT j FROM Job j WHERE j.assignedWorker.id = :workerId AND j.status = 'PENDING' ORDER BY j.createdAt DESC")
    List<Job> findPendingJobsForArtisan(@Param("workerId") Long workerId);

    /** Active jobs for artisan: ACCEPTED, ARRIVED, IN_PROGRESS */
    @Query("SELECT j FROM Job j WHERE j.assignedWorker.id = :workerId AND j.status IN ('ACCEPTED','ARRIVED','IN_PROGRESS') ORDER BY j.createdAt DESC")
    List<Job> findActiveJobsForArtisan(@Param("workerId") Long workerId);

    /** Completed/closed jobs for artisan */
    @Query("SELECT j FROM Job j WHERE j.assignedWorker.id = :workerId AND j.status IN ('COMPLETED','CANCELLED','DECLINED','DISPUTED') ORDER BY j.completionTime DESC")
    List<Job> findHistoryJobsForArtisan(@Param("workerId") Long workerId);

    /** Jobs completed but payment NOT yet recorded, completed more than N hours ago */
    @Query("SELECT j FROM Job j WHERE j.status = 'COMPLETED' AND j.paymentRecorded = false AND j.completionTime < :threshold ORDER BY j.completionTime ASC")
    List<Job> findCompletedWithoutPayment(@Param("threshold") LocalDateTime threshold);

    /** Detect duplicate booking: same customer phone + same artisan + recent open job */
    @Query("SELECT j FROM Job j WHERE j.customerPhone = :phone AND j.assignedWorker.id = :artisanId AND j.status IN ('PENDING','ACCEPTED','ARRIVED','IN_PROGRESS') AND j.createdAt > :since")
    List<Job> findRecentBookingsByCustomerAndArtisan(@Param("phone") String phone,
                                                      @Param("artisanId") Long artisanId,
                                                      @Param("since") LocalDateTime since);

    /** Admin: all jobs with optional status filter, newest first */
    @Query("SELECT j FROM Job j WHERE (:status IS NULL OR j.status = :status) ORDER BY j.createdAt DESC")
    Page<Job> findAllWithOptionalStatus(@Param("status") Job.JobStatus status, Pageable pageable);

    /** Admin: completed payment records for artisan */
    @Query("SELECT j FROM Job j WHERE j.assignedWorker.id = :workerId AND j.status = 'COMPLETED' AND j.paymentRecorded = true ORDER BY j.completionTime DESC")
    List<Job> findCompletedPaymentsForArtisan(@Param("workerId") Long workerId);
}
