package com.tufixit.backend.controller;

import com.tufixit.backend.dto.ReportDTO;
import com.tufixit.backend.service.ReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @PostMapping
    public ResponseEntity<ReportDTO.ReportResponse> createReport(
            @Valid @RequestBody ReportDTO.CreateReportRequest request) {
        return ResponseEntity.ok(reportService.createReport(request));
    }

    @GetMapping("/admin/all")
    public ResponseEntity<List<ReportDTO.ReportResponse>> getAllReports() {
        return ResponseEntity.ok(reportService.getAllReports());
    }

    @GetMapping("/admin/pending")
    public ResponseEntity<List<ReportDTO.ReportResponse>> getPendingReports() {
        return ResponseEntity.ok(reportService.getPendingReports());
    }

    @GetMapping("/artisan/{artisanId}")
    public ResponseEntity<List<ReportDTO.ReportResponse>> getReportsForArtisan(
            @PathVariable Long artisanId) {
        return ResponseEntity.ok(reportService.getReportsForArtisan(artisanId));
    }

    @PutMapping("/admin/{reportId}/action")
    public ResponseEntity<ReportDTO.ReportResponse> takeAdminAction(
            @PathVariable Long reportId,
            @Valid @RequestBody ReportDTO.AdminActionRequest request) {
        return ResponseEntity.ok(reportService.takeAdminAction(reportId, request));
    }
}
