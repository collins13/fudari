package com.tufixit.backend.service;

import com.tufixit.backend.dto.ReportDTO;
import com.tufixit.backend.entity.Report;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.repository.ReportRepository;
import com.tufixit.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final ReportRepository reportRepository;
    private final UserRepository userRepository;

    @Transactional
    public ReportDTO.ReportResponse createReport(ReportDTO.CreateReportRequest request) {
        User reportedArtisan = userRepository.findById(request.getReportedArtisanId())
                .orElseThrow(() -> new RuntimeException("Artisan not found"));

        if (reportedArtisan.getRole() != User.UserRole.WORKER) {
            throw new RuntimeException("Can only report workers/artisans");
        }

        // Try to get authenticated user, allow anonymous reports
        User reporter = null;
        try {
            reporter = getCurrentUser();
        } catch (Exception e) {
            log.info("Anonymous report submitted");
        }

        Report report = Report.builder()
                .reportedArtisan(reportedArtisan)
                .reporter(reporter)
                .reporterPhone(request.getReporterPhone())
                .reporterEmail(request.getReporterEmail())
                .reason(Report.ReportReason.valueOf(request.getReason().toUpperCase()))
                .description(request.getDescription())
                .status(Report.ReportStatus.PENDING)
                .adminAction(Report.AdminAction.NONE)
                .build();

        report = reportRepository.save(report);
        return mapToResponse(report);
    }

    public List<ReportDTO.ReportResponse> getAllReports() {
        return reportRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<ReportDTO.ReportResponse> getPendingReports() {
        return reportRepository.findByStatusOrderByCreatedAtDesc(Report.ReportStatus.PENDING)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<ReportDTO.ReportResponse> getReportsForArtisan(Long artisanId) {
        return reportRepository.findByReportedArtisanIdOrderByCreatedAtDesc(artisanId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ReportDTO.ReportResponse takeAdminAction(Long reportId, ReportDTO.AdminActionRequest request) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found"));

        String action = request.getAction().toUpperCase();
        switch (action) {
            case "WARNING" -> {
                report.setStatus(Report.ReportStatus.WARNING_ISSUED);
                report.setAdminAction(Report.AdminAction.WARNING);
            }
            case "SUSPENSION" -> {
                report.setStatus(Report.ReportStatus.ARTISAN_SUSPENDED);
                report.setAdminAction(Report.AdminAction.SUSPENSION);
                User artisan = report.getReportedArtisan();
                artisan.setIsActive(false);
                userRepository.save(artisan);
            }
            case "BAN" -> {
                report.setStatus(Report.ReportStatus.ARTISAN_BANNED);
                report.setAdminAction(Report.AdminAction.BAN);
                User artisan = report.getReportedArtisan();
                artisan.setIsActive(false);
                userRepository.save(artisan);
            }
            case "DISMISS" -> {
                report.setStatus(Report.ReportStatus.DISMISSED);
                report.setAdminAction(Report.AdminAction.NONE);
            }
            default -> throw new RuntimeException("Invalid action: " + action);
        }

        report.setAdminNotes(request.getAdminNotes());
        report.setResolvedAt(LocalDateTime.now());
        report = reportRepository.save(report);

        return mapToResponse(report);
    }

    private ReportDTO.ReportResponse mapToResponse(Report report) {
        return ReportDTO.ReportResponse.builder()
                .id(report.getId())
                .reportedArtisanId(report.getReportedArtisan().getId())
                .reportedArtisanName(report.getReportedArtisan().getFirstName() + " " + report.getReportedArtisan().getLastName())
                .reason(report.getReason().name())
                .description(report.getDescription())
                .status(report.getStatus().name())
                .adminAction(report.getAdminAction() != null ? report.getAdminAction().name() : null)
                .adminNotes(report.getAdminNotes())
                .createdAt(report.getCreatedAt())
                .resolvedAt(report.getResolvedAt())
                .build();
    }

    private User getCurrentUser() {
        String emailOrPhone = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(emailOrPhone)
                .or(() -> userRepository.findByPhoneNumber(emailOrPhone))
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
