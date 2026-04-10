package com.tufixit.backend.repository;

import com.tufixit.backend.entity.Listing;
import com.tufixit.backend.entity.WorkerSkill;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ListingRepository extends JpaRepository<Listing, Long> {

    Page<Listing> findByArtisanIdOrderByCreatedAtDesc(Long artisanId, Pageable pageable);

    List<Listing> findByArtisanIdOrderByCreatedAtDesc(Long artisanId);

    long countByArtisanIdAndStatus(Long artisanId, Listing.ListingStatus status);

    long countByArtisanId(Long artisanId);

    Page<Listing> findByStatus(Listing.ListingStatus status, Pageable pageable);

    // Ranked: PRO first, then VERIFIED, then STANDARD — uses native SQL for reliability
    @Query(value = "SELECT l.* FROM listings l " +
           "JOIN users u ON l.artisan_id = u.id " +
           "WHERE l.status = 'APPROVED' AND l.is_active = true " +
           "ORDER BY " +
           "CASE u.vetting_level WHEN 'PRO' THEN 0 WHEN 'VERIFIED' THEN 1 ELSE 2 END ASC, " +
           "l.created_at DESC",
           countQuery = "SELECT COUNT(*) FROM listings l JOIN users u ON l.artisan_id = u.id " +
                        "WHERE l.status = 'APPROVED' AND l.is_active = true",
           nativeQuery = true)
    Page<Listing> findAllApprovedRanked(Pageable pageable);

    long countByStatus(Listing.ListingStatus status);

    /** Atomic view count increment — avoids read-modify-write race condition */
    @Modifying
    @Query("UPDATE Listing l SET l.viewCount = l.viewCount + 1 WHERE l.id = :id")
    void incrementViewCount(@Param("id") Long id);

    /** Count artisans per skill type for category stats */
    @Query(value = "SELECT CAST(w.skill_type AS VARCHAR), COUNT(DISTINCT w.user_id) " +
                   "FROM worker_skills w JOIN users u ON w.user_id = u.id " +
                   "WHERE u.is_active = true AND u.role = 'WORKER' " +
                   "GROUP BY w.skill_type", nativeQuery = true)
    List<Object[]> countArtisansPerSkillType();

    // Ranked search with filters
    @Query(value = "SELECT l.* FROM listings l " +
           "JOIN users u ON l.artisan_id = u.id " +
           "WHERE l.status = 'APPROVED' AND l.is_active = true " +
           "AND (:skillType IS NULL OR CAST(l.skill_type AS VARCHAR) = :skillType) " +
           "AND (:categoryId IS NULL OR l.category_id = :categoryId) " +
           "AND (:location IS NULL OR LOWER(l.location) LIKE LOWER(CONCAT('%', :location, '%'))) " +
           "ORDER BY " +
           "CASE u.vetting_level WHEN 'PRO' THEN 0 WHEN 'VERIFIED' THEN 1 ELSE 2 END ASC, " +
           "l.created_at DESC",
           countQuery = "SELECT COUNT(*) FROM listings l JOIN users u ON l.artisan_id = u.id " +
                        "WHERE l.status = 'APPROVED' AND l.is_active = true " +
                        "AND (:skillType IS NULL OR CAST(l.skill_type AS VARCHAR) = :skillType) " +
                        "AND (:categoryId IS NULL OR l.category_id = :categoryId) " +
                        "AND (:location IS NULL OR LOWER(l.location) LIKE LOWER(CONCAT('%', :location, '%')))",
           nativeQuery = true)
    Page<Listing> searchListingsRanked(
            @Param("skillType") String skillType,
            @Param("categoryId") Long categoryId,
            @Param("location") String location,
            Pageable pageable);
}
