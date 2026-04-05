package com.tufixit.backend.repository;

import com.tufixit.backend.entity.PublicReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PublicReviewRepository extends JpaRepository<PublicReview, Long> {
    
    List<PublicReview> findByArtisanIdOrderByCreatedAtDesc(Long artisanId);
    
    List<PublicReview> findByArtisanIdAndIsVerifiedOrderByCreatedAtDesc(Long artisanId, Boolean isVerified);
    
    @Query("SELECT AVG(r.rating) FROM PublicReview r WHERE r.artisan.id = :artisanId")
    Double getAverageRatingByArtisanId(@Param("artisanId") Long artisanId);
    
    @Query("SELECT COUNT(r) FROM PublicReview r WHERE r.artisan.id = :artisanId")
    Integer getReviewCountByArtisanId(@Param("artisanId") Long artisanId);
    
    boolean existsByArtisanIdAndReviewerPhone(Long artisanId, String reviewerPhone);
    
    boolean existsByArtisanIdAndReviewerEmail(Long artisanId, String reviewerEmail);
}
