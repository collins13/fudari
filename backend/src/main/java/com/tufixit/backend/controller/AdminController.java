package com.tufixit.backend.controller;

import com.tufixit.backend.dto.BookingDTO;
import com.tufixit.backend.dto.ListingDTO;
import com.tufixit.backend.dto.AuthDTO;
import com.tufixit.backend.entity.Job;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.repository.UserRepository;
import com.tufixit.backend.service.BookingService;
import com.tufixit.backend.service.ListingService;
import com.tufixit.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final ListingService listingService;
    private final AuthService authService;
    private final UserRepository userRepository;
    private final BookingService bookingService;

    /** Admin - get pending listings for approval */
    @GetMapping("/listings/pending")
    public ResponseEntity<Page<ListingDTO.ListingResponse>> getPendingListings(
            @PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(listingService.getPendingListings(pageable));
    }

    /** Admin - get all listings */
    @GetMapping("/listings/all")
    public ResponseEntity<Page<ListingDTO.ListingResponse>> getAllListings(
            @PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(listingService.getAllListingsAdmin(pageable));
    }

    /** Admin - approve listing */
    @PutMapping("/listings/{id}/approve")
    public ResponseEntity<ListingDTO.ListingResponse> approveListing(@PathVariable Long id) {
        return ResponseEntity.ok(listingService.approveListing(id));
    }

    /** Admin - reject listing */
    @PutMapping("/listings/{id}/reject")
    public ResponseEntity<ListingDTO.ListingResponse> rejectListing(@PathVariable Long id) {
        return ResponseEntity.ok(listingService.rejectListing(id));
    }

    /** Admin - get artisan by ID */
    @GetMapping("/artisans/{id}")
    public ResponseEntity<AuthDTO.UserDTO> getArtisanById(@PathVariable Long id) {
        return ResponseEntity.ok(authService.getUserById(id));
    }

    /** Admin - list all users */
    @GetMapping("/users")
    public ResponseEntity<List<AuthDTO.UserDTO>> getAllUsers() {
        List<AuthDTO.UserDTO> users = userRepository.findAll().stream()
                .map(u -> authService.getUserById(u.getId()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }

    /** Admin - update user role */
    @PutMapping("/users/{id:[0-9]+}/role")
    public ResponseEntity<AuthDTO.UserDTO> updateUserRole(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setRole(User.UserRole.valueOf(body.get("role").toUpperCase()));
        userRepository.save(user);
        return ResponseEntity.ok(authService.getUserById(id));
    }

    /** Admin - activate/deactivate user */
    @PutMapping("/users/{id:[0-9]+}/status")
    public ResponseEntity<AuthDTO.UserDTO> updateUserStatus(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> body) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setIsActive(body.get("isActive"));
        userRepository.save(user);
        return ResponseEntity.ok(authService.getUserById(id));
    }

    // ── Booking / Jobs management ─────────────────────────────────────────────

    /** Admin - list all jobs with optional status filter */
    @GetMapping("/jobs")
    public ResponseEntity<Page<BookingDTO.AdminJobView>> getAllJobs(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Job.JobStatus jobStatus = null;
        if (status != null && !status.isBlank() && !status.equalsIgnoreCase("ALL")) {
            try { jobStatus = Job.JobStatus.valueOf(status.toUpperCase()); }
            catch (IllegalArgumentException ignored) {}
        }
        return ResponseEntity.ok(bookingService.adminListJobs(jobStatus, page, size));
    }

    /** Admin - get single job details */
    @GetMapping("/jobs/{id}")
    public ResponseEntity<BookingDTO.AdminJobView> getJobDetail(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.adminGetJob(id));
    }

    /** Admin - resolve a dispute */
    @PostMapping("/jobs/{id}/resolve")
    public ResponseEntity<BookingDTO.BookingResponse> resolveDispute(
            @PathVariable Long id,
            @Valid @RequestBody BookingDTO.ResolveDisputeRequest request) {
        return ResponseEntity.ok(bookingService.adminResolveDispute(id, request));
    }

    /** Admin - jobs completed > 24h ago without payment recorded */
    @GetMapping("/payments/missing")
    public ResponseEntity<List<BookingDTO.AdminJobView>> getMissingPayments() {
        return ResponseEntity.ok(bookingService.getMissingPayments());
    }

    /** Admin - platform statistics */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getPlatformStats() {
        return ResponseEntity.ok(Map.of(
            "message", "Use dashboard for stats"
        ));
    }
}
