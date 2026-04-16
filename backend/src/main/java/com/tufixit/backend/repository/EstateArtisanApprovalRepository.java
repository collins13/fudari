package com.tufixit.backend.repository;

import com.tufixit.backend.entity.EstateArtisanApproval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EstateArtisanApprovalRepository extends JpaRepository<EstateArtisanApproval, Long> {

    List<EstateArtisanApproval> findByEstateId(Long estateId);

    List<EstateArtisanApproval> findByArtisanId(Long artisanId);

    Optional<EstateArtisanApproval> findByEstateIdAndArtisanId(Long estateId, Long artisanId);

    boolean existsByEstateIdAndArtisanId(Long estateId, Long artisanId);

    void deleteByEstateIdAndArtisanId(Long estateId, Long artisanId);

    /** Count approved artisans per estate — used in estate analytics. */
    long countByEstateId(Long estateId);

    /** Get all artisan IDs approved for a given estate — used by RankingService. */
    @Query("SELECT ea.artisan.id FROM EstateArtisanApproval ea WHERE ea.estate.id = :estateId")
    List<Long> findArtisanIdsByEstateId(Long estateId);
}
