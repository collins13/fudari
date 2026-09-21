package com.tufixit.backend.controller;

import com.tufixit.backend.dto.BookingDTO;
import com.tufixit.backend.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Artisan job-management endpoints — login required (WORKER role).
 * Base path: /api/artisan/jobs
 *
 * Note: /api/artisan/** is declared permitAll in SecurityConfig for public GET
 * profile lookups.  These job endpoints all require a valid JWT — Spring Security
 * will reject requests without a token because @AuthenticationPrincipal will be null
 * and the service will throw.  A future refactor could add explicit @PreAuthorize.
 */
@RestController
@RequestMapping("/api/artisan/jobs")
@RequiredArgsConstructor
public class ArtisanJobController {

    private final BookingService bookingService;

    // ── List views ────────────────────────────────────────────────────────────

    /** GET /api/artisan/jobs/pending — new job requests inbox */
    @GetMapping("/pending")
    public ResponseEntity<List<BookingDTO.ArtisanJobSummary>> getPendingJobs(
            @AuthenticationPrincipal UserDetails userDetails) {
        requireAuth(userDetails);
        return ResponseEntity.ok(bookingService.getPendingJobs(userDetails.getUsername()));
    }

    /** GET /api/artisan/jobs/active — currently active jobs */
    @GetMapping("/active")
    public ResponseEntity<List<BookingDTO.ArtisanJobSummary>> getActiveJobs(
            @AuthenticationPrincipal UserDetails userDetails) {
        requireAuth(userDetails);
        return ResponseEntity.ok(bookingService.getActiveJobs(userDetails.getUsername()));
    }

    /** GET /api/artisan/jobs/history — completed/declined/cancelled */
    @GetMapping("/history")
    public ResponseEntity<List<BookingDTO.ArtisanJobSummary>> getJobHistory(
            @AuthenticationPrincipal UserDetails userDetails) {
        requireAuth(userDetails);
        return ResponseEntity.ok(bookingService.getJobHistory(userDetails.getUsername()));
    }

    /** GET /api/artisan/jobs/payments — payment records */
    @GetMapping("/payments")
    public ResponseEntity<List<BookingDTO.PaymentRecord>> getPayments(
            @AuthenticationPrincipal UserDetails userDetails) {
        requireAuth(userDetails);
        return ResponseEntity.ok(bookingService.getPaymentRecords(userDetails.getUsername()));
    }

    /** GET /api/artisan/jobs/{id} — full job detail */
    @GetMapping("/{id}")
    public ResponseEntity<BookingDTO.ArtisanJobDetail> getJobDetail(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        requireAuth(userDetails);
        return ResponseEntity.ok(bookingService.getJobDetail(id, userDetails.getUsername()));
    }

    // ── Job lifecycle actions ─────────────────────────────────────────────────

    /** POST /api/artisan/jobs/{id}/accept */
    @PostMapping("/{id}/accept")
    public ResponseEntity<BookingDTO.BookingResponse> acceptJob(
            @PathVariable Long id,
            @Valid @RequestBody BookingDTO.AcceptJobRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        requireAuth(userDetails);
        return ResponseEntity.ok(bookingService.acceptJob(id, request, userDetails.getUsername()));
    }

    /** POST /api/artisan/jobs/{id}/decline */
    @PostMapping("/{id}/decline")
    public ResponseEntity<BookingDTO.BookingResponse> declineJob(
            @PathVariable Long id,
            @Valid @RequestBody BookingDTO.DeclineJobRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        requireAuth(userDetails);
        return ResponseEntity.ok(bookingService.declineJob(id, request, userDetails.getUsername()));
    }

    /** POST /api/artisan/jobs/{id}/counter */
    @PostMapping("/{id}/counter")
    public ResponseEntity<BookingDTO.BookingResponse> counterOffer(
            @PathVariable Long id,
            @Valid @RequestBody BookingDTO.CounterOfferRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        requireAuth(userDetails);
        return ResponseEntity.ok(bookingService.counterOffer(id, request, userDetails.getUsername()));
    }

    /** POST /api/artisan/jobs/{id}/arrived */
    @PostMapping("/{id}/arrived")
    public ResponseEntity<BookingDTO.BookingResponse> markArrived(
            @PathVariable Long id,
            @RequestBody(required = false) BookingDTO.ArriveRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        requireAuth(userDetails);
        if (request == null) request = new BookingDTO.ArriveRequest();
        return ResponseEntity.ok(bookingService.markArrived(id, request, userDetails.getUsername()));
    }

    /** POST /api/artisan/jobs/{id}/start — enter START PIN */
    @PostMapping("/{id}/start")
    public ResponseEntity<BookingDTO.BookingResponse> startJob(
            @PathVariable Long id,
            @Valid @RequestBody BookingDTO.StartJobRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        requireAuth(userDetails);
        return ResponseEntity.ok(bookingService.startJob(id, request, userDetails.getUsername()));
    }

    /** POST /api/artisan/jobs/{id}/complete — enter COMPLETION PIN + record payment */
    @PostMapping("/{id}/complete")
    public ResponseEntity<BookingDTO.BookingResponse> completeJob(
            @PathVariable Long id,
            @Valid @RequestBody BookingDTO.CompleteJobRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        requireAuth(userDetails);
        return ResponseEntity.ok(bookingService.completeJob(id, request, userDetails.getUsername()));
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private void requireAuth(UserDetails userDetails) {
        if (userDetails == null) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Authentication required");
        }
    }
}
