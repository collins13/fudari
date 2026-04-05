package com.tufixit.backend.repository;

import com.tufixit.backend.entity.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {
    
    List<Report> findByStatusOrderByCreatedAtDesc(Report.ReportStatus status);
    
    List<Report> findByReportedArtisanIdOrderByCreatedAtDesc(Long artisanId);
    
    List<Report> findAllByOrderByCreatedAtDesc();
    
    long countByReportedArtisanIdAndStatus(Long artisanId, Report.ReportStatus status);
}
