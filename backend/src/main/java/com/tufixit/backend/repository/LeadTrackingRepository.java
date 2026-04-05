package com.tufixit.backend.repository;

import com.tufixit.backend.entity.LeadTracking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LeadTrackingRepository extends JpaRepository<LeadTracking, Long> {

    long countByArtisanIdAndLeadType(Long artisanId, LeadTracking.LeadType leadType);

    @Query("SELECT COUNT(l) FROM LeadTracking l WHERE l.artisan.id = :artisanId AND l.leadType = :leadType AND l.createdAt >= :since")
    long countByArtisanIdAndLeadTypeSince(
            @Param("artisanId") Long artisanId,
            @Param("leadType") LeadTracking.LeadType leadType,
            @Param("since") LocalDateTime since);

    @Query("SELECT l.leadType, COUNT(l) FROM LeadTracking l WHERE l.artisan.id = :artisanId AND l.createdAt >= :since GROUP BY l.leadType")
    List<Object[]> getLeadStatsByArtisanIdSince(
            @Param("artisanId") Long artisanId,
            @Param("since") LocalDateTime since);

    List<LeadTracking> findByArtisanIdOrderByCreatedAtDesc(Long artisanId);
}
