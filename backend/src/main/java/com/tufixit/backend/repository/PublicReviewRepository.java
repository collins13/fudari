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

    /** Only verified reviews feed the public rating and trust score. */
    @Query("SELECT AVG(r.rating) FROM PublicReview r WHERE r.artisan.id = :artisanId AND r.isVerified = true")
    Double getVerifiedAverageRatingByArtisanId(@Param("artisanId") Long artisanId);

    @Query("SELECT COUNT(r) FROM PublicReview r WHERE r.artisan.id = :artisanId AND r.isVerified = true")
    Integer getVerifiedReviewCountByArtisanId(@Param("artisanId") Long artisanId);

    boolean existsByBookingCode(String bookingCode);
    
    boolean existsByArtisanIdAndReviewerPhone(Long artisanId, String reviewerPhone);
    
    boolean existsByArtisanIdAndReviewerEmail(Long artisanId, String reviewerEmail);

    /** Trust Score AI: public reviews with comments for sentiment analysis */
    @Query("SELECT r FROM PublicReview r WHERE r.artisan.id = :artisanId AND r.comment IS NOT NULL ORDER BY r.createdAt DESC")
    List<PublicReview> findReviewsWithComments(@Param("artisanId") Long artisanId);

    /** Trust Score AI: rating distribution for public reviews */
    @Query("SELECT r.rating, COUNT(r) FROM PublicReview r WHERE r.artisan.id = :artisanId GROUP BY r.rating")
    List<Object[]> getRatingDistribution(@Param("artisanId") Long artisanId);
}
