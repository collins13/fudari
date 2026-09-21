package com.tufixit.backend.repository;

import com.tufixit.backend.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    
    List<Review> findByJobId(Long jobId);
    
    List<Review> findByReviewedUserId(Long userId);
    
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.reviewedUser.id = :userId")
    Double getAverageRatingByUserId(@Param("userId") Long userId);
    
    @Query("SELECT COUNT(r) FROM Review r WHERE r.reviewedUser.id = :userId")
    Integer getReviewCountByUserId(@Param("userId") Long userId);

    /** Trust Score AI: all reviews for an artisan with comments, sorted newest first */
    @Query("SELECT r FROM Review r WHERE r.reviewedUser.id = :userId AND r.comment IS NOT NULL ORDER BY r.createdAt DESC")
    List<Review> findReviewsWithComments(@Param("userId") Long userId);

    /** Trust Score AI: rating distribution */
    @Query("SELECT r.rating, COUNT(r) FROM Review r WHERE r.reviewedUser.id = :userId GROUP BY r.rating")
    List<Object[]> getRatingDistribution(@Param("userId") Long userId);
}
