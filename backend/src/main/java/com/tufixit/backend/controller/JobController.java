package com.tufixit.backend.controller;

import com.tufixit.backend.dto.JobDTO;
import com.tufixit.backend.service.JobService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;

    @PostMapping
    public ResponseEntity<JobDTO.JobResponse> createJob(@Valid @RequestBody JobDTO.CreateJobRequest request) {
        return ResponseEntity.ok(jobService.createJob(request));
    }

    @GetMapping("/{jobId}")
    public ResponseEntity<JobDTO.JobResponse> getJob(@PathVariable Long jobId) {
        return ResponseEntity.ok(jobService.getJobById(jobId));
    }

    @GetMapping("/my-jobs")
    public ResponseEntity<Page<JobDTO.JobResponse>> getClientJobs(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(jobService.getClientJobs(pageable));
    }

    @GetMapping("/worker/jobs")
    public ResponseEntity<Page<JobDTO.JobResponse>> getWorkerJobs(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(jobService.getWorkerJobs(pageable));
    }

    @GetMapping("/open")
    public ResponseEntity<Page<JobDTO.JobResponse>> getOpenJobs(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(jobService.getOpenJobs(pageable));
    }

    @GetMapping("/nearby")
    public ResponseEntity<List<JobDTO.JobResponse>> getNearbyJobs(
            @RequestParam Double latitude,
            @RequestParam Double longitude,
            @RequestParam(defaultValue = "25") Double radiusKm) {
        return ResponseEntity.ok(jobService.getNearbyJobs(latitude, longitude, radiusKm));
    }

    @PostMapping("/{jobId}/bids")
    public ResponseEntity<JobDTO.BidResponse> placeBid(
            @PathVariable Long jobId,
            @Valid @RequestBody JobDTO.BidRequest request) {
        return ResponseEntity.ok(jobService.placeBid(jobId, request));
    }

    @GetMapping("/{jobId}/bids")
    public ResponseEntity<List<JobDTO.BidResponse>> getJobBids(@PathVariable Long jobId) {
        return ResponseEntity.ok(jobService.getJobBids(jobId));
    }

    @PostMapping("/{jobId}/bids/{bidId}/accept")
    public ResponseEntity<JobDTO.JobResponse> acceptBid(
            @PathVariable Long jobId,
            @PathVariable Long bidId,
            @Valid @RequestBody JobDTO.AcceptBidRequest request) {
        return ResponseEntity.ok(jobService.acceptBid(jobId, bidId, request));
    }

    @PostMapping("/{jobId}/start")
    public ResponseEntity<JobDTO.JobResponse> startJob(
            @PathVariable Long jobId,
            @Valid @RequestBody JobDTO.StartJobRequest request) {
        return ResponseEntity.ok(jobService.startJob(jobId, request));
    }

    @PostMapping("/{jobId}/complete")
    public ResponseEntity<JobDTO.JobResponse> completeJob(
            @PathVariable Long jobId,
            @Valid @RequestBody JobDTO.CompleteJobRequest request) {
        return ResponseEntity.ok(jobService.completeJob(jobId, request));
    }

    @PostMapping("/{jobId}/review")
    public ResponseEntity<JobDTO.JobResponse> addReview(
            @PathVariable Long jobId,
            @Valid @RequestBody JobDTO.ReviewRequest request) {
        return ResponseEntity.ok(jobService.addReview(jobId, request));
    }

    @PatchMapping("/{jobId}/status")
    public ResponseEntity<JobDTO.JobResponse> updateJobStatus(
            @PathVariable Long jobId,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        return ResponseEntity.ok(jobService.updateJobStatus(jobId, status));
    }

    @GetMapping("/admin/pending")
    public ResponseEntity<Page<JobDTO.JobResponse>> getAdminPendingJobs(
            @PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(jobService.getAdminPendingJobs(pageable));
    }

    @GetMapping("/admin/all")
    public ResponseEntity<Page<JobDTO.JobResponse>> getAllJobsAdmin(
            @PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(jobService.getAllJobsAdmin(pageable));
    }
}
