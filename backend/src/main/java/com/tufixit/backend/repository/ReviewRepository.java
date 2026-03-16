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
}
