package com.tufixit.backend.repository;

import com.tufixit.backend.entity.Bid;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BidRepository extends JpaRepository<Bid, Long> {
    
    List<Bid> findByJobId(Long jobId);
    
    List<Bid> findByWorkerId(Long workerId);
    
    @Query("SELECT b FROM Bid b WHERE b.job.id = :jobId AND b.status = 'PENDING' ORDER BY b.bidAmount ASC")
    List<Bid> findWinningBids(@Param("jobId") Long jobId);
    
    boolean existsByJobIdAndWorkerId(Long jobId, Long workerId);
}
