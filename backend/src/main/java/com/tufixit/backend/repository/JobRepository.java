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

    /** Count jobs by status — used for platform stats */
    long countByStatus(Job.JobStatus status);

    long countByStatusIn(java.util.List<Job.JobStatus> statuses);

    // ── AI Feature queries ──────────────────────────────────────────────────

    /** Smart Pricing: completed jobs for a skill type + location-area, most recent first */
    @Query("SELECT j FROM Job j WHERE j.status = 'COMPLETED' AND j.skillType = :skillType " +
           "AND j.agreedPrice IS NOT NULL AND j.completionTime >= :since ORDER BY j.completionTime DESC")
    List<Job> findCompletedJobsForPricing(@Param("skillType") WorkerSkill.SkillType skillType,
                                           @Param("since") LocalDateTime since);

    /** Smart Pricing: completed jobs by urgency for surge analysis */
    @Query("SELECT j.urgency, COUNT(j) FROM Job j WHERE j.status = 'COMPLETED' AND j.skillType = :skillType " +
           "AND j.completionTime >= :since GROUP BY j.urgency")
    List<Object[]> countCompletedByUrgency(@Param("skillType") WorkerSkill.SkillType skillType,
                                            @Param("since") LocalDateTime since);

    /** Demand Forecasting: jobs created in a date range for a skill type */
    @Query("SELECT j FROM Job j WHERE j.skillType = :skillType AND j.createdAt >= :start AND j.createdAt < :end")
    List<Job> findJobsInDateRange(@Param("skillType") WorkerSkill.SkillType skillType,
                                   @Param("start") LocalDateTime start,
                                   @Param("end") LocalDateTime end);

    /** Demand Forecasting: count jobs by skill type for date range */
    @Query("SELECT j.skillType, COUNT(j) FROM Job j WHERE j.createdAt >= :start AND j.createdAt < :end GROUP BY j.skillType")
    List<Object[]> countJobsBySkillTypeInRange(@Param("start") LocalDateTime start,
                                                @Param("end") LocalDateTime end);

    /** Trust Score: dispute rate for a worker */
    @Query("SELECT COUNT(j) FROM Job j WHERE j.assignedWorker.id = :workerId AND j.status = 'DISPUTED'")
    long countDisputedJobsForWorker(@Param("workerId") Long workerId);

    /** Trust Score: total assigned jobs for a worker */
    @Query("SELECT COUNT(j) FROM Job j WHERE j.assignedWorker.id = :workerId AND j.status IN ('COMPLETED','DISPUTED','CANCELLED')")
    long countTotalAssignedJobs(@Param("workerId") Long workerId);

    /** Trust Score: on-time completion rate (arrived within estimate) */
    @Query("SELECT COUNT(j) FROM Job j WHERE j.assignedWorker.id = :workerId AND j.status = 'COMPLETED' " +
           "AND j.arrivedAt IS NOT NULL AND j.acceptedAt IS NOT NULL")
    long countJobsWithArrivalTracking(@Param("workerId") Long workerId);

    /** Quality Verification: find job with images */
    @Query("SELECT j FROM Job j WHERE j.id = :jobId AND j.beforeImages IS NOT NULL AND j.afterImages IS NOT NULL")
    Optional<Job> findJobWithImages(@Param("jobId") Long jobId);

    /** Demand: location-based job count */
    @Query("SELECT j.locationName, COUNT(j) FROM Job j WHERE j.skillType = :skillType " +
           "AND j.createdAt >= :since GROUP BY j.locationName ORDER BY COUNT(j) DESC")
    List<Object[]> countJobsByLocationForSkill(@Param("skillType") WorkerSkill.SkillType skillType,
                                                @Param("since") LocalDateTime since);

    /** Average agreed price for skill type in recent window */
    @Query("SELECT AVG(CAST(j.agreedPrice AS int)) FROM Job j WHERE j.status = 'COMPLETED' " +
           "AND j.skillType = :skillType AND j.agreedPrice IS NOT NULL AND j.completionTime >= :since")
    Double getAverageAgreedPrice(@Param("skillType") WorkerSkill.SkillType skillType,
                                  @Param("since") LocalDateTime since);

    // ── Estate analytics queries ─────────────────────────────────────────────

    long countByEstateIdAndStatus(Long estateId, Job.JobStatus status);

    long countByEstateId(Long estateId);

    @Query("SELECT j FROM Job j WHERE j.estateId = :estateId AND j.status = 'COMPLETED' ORDER BY j.completionTime DESC")
    List<Job> findCompletedByEstateId(@Param("estateId") Long estateId);

    /** Active (in-progress) jobs for an estate — Service Health view. */
    @Query("SELECT j FROM Job j WHERE j.estateId = :estateId AND j.status IN ('PENDING','ACCEPTED','ARRIVED','IN_PROGRESS') ORDER BY j.createdAt DESC")
    List<Job> findActiveJobsByEstateId(@Param("estateId") Long estateId);

    /** Sum of agreed prices for completed estate jobs (for commission calculation). */
    @Query("SELECT COALESCE(SUM(CAST(j.agreedPrice AS int)), 0) FROM Job j WHERE j.estateId = :estateId AND j.status = 'COMPLETED' AND j.agreedPrice IS NOT NULL")
    long sumAgreedPriceByEstateId(@Param("estateId") Long estateId);
}
