package com.tufixit.backend.controller;

import com.tufixit.backend.dto.BookingDTO;
import com.tufixit.backend.dto.ListingDTO;
import com.tufixit.backend.dto.AuthDTO;
import com.tufixit.backend.entity.Job;
import com.tufixit.backend.entity.Listing;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.entity.WhatsAppSession;
import com.tufixit.backend.repository.UserRepository;
import com.tufixit.backend.repository.JobRepository;
import com.tufixit.backend.repository.ListingRepository;
import com.tufixit.backend.repository.EscrowTransactionRepository;
import com.tufixit.backend.repository.WhatsAppSessionRepository;
import com.tufixit.backend.entity.AdminAuditLog;
import com.tufixit.backend.service.BookingService;
import com.tufixit.backend.service.ListingService;
import com.tufixit.backend.service.AuthService;
import com.tufixit.backend.service.PublicReviewService;
import com.tufixit.backend.service.AuditService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final ListingService listingService;
    private final AuthService authService;
    private final UserRepository userRepository;
    private final BookingService bookingService;
    private final JobRepository jobRepository;
    private final ListingRepository listingRepository;
    private final EscrowTransactionRepository escrowRepository;
    private final PublicReviewService publicReviewService;
    private final PasswordEncoder passwordEncoder;
    private final WhatsAppSessionRepository whatsAppSessionRepository;
    private final AuditService auditService;

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
        ListingDTO.ListingResponse response = listingService.approveListing(id);
        auditService.logAction(AdminAuditLog.AuditAction.LISTING_APPROVED, "LISTING", id, "Approved listing: " + response.getTitle());
        return ResponseEntity.ok(response);
    }

    /** Admin - reject listing */
    @PutMapping("/listings/{id}/reject")
    public ResponseEntity<ListingDTO.ListingResponse> rejectListing(@PathVariable Long id) {
        ListingDTO.ListingResponse response = listingService.rejectListing(id);
        auditService.logAction(AdminAuditLog.AuditAction.LISTING_REJECTED, "LISTING", id, "Rejected listing: " + response.getTitle());
        return ResponseEntity.ok(response);
    }

    /** Admin - get artisan by ID */
    @GetMapping("/artisans/{id}")
    public ResponseEntity<AuthDTO.UserDTO> getArtisanById(@PathVariable Long id) {
        return ResponseEntity.ok(authService.getUserById(id));
    }

    /** Admin - list all users (excluding soft-deleted) */
    @GetMapping("/users")
    public ResponseEntity<List<AuthDTO.UserDTO>> getAllUsers() {
        List<AuthDTO.UserDTO> users = userRepository.findAllExcludingDeleted().stream()
                .map(u -> authService.getUserById(u.getId()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }

    /** Admin - create a new user */
    @PostMapping("/users")
    public ResponseEntity<AuthDTO.UserDTO> createUser(@Valid @RequestBody AuthDTO.AdminCreateUserRequest request) {
        if (request.getPhoneNumber() != null && userRepository.existsByPhoneNumber(request.getPhoneNumber())) {
            return ResponseEntity.badRequest().build();
        }
        if (request.getEmail() != null && !request.getEmail().isBlank()
                && userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().build();
        }

        User.UserRole role = request.getRole() != null ? request.getRole() : User.UserRole.CLIENT;
        User user = User.builder()
                .phoneNumber(request.getPhoneNumber())
                .email(request.getEmail())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .vettingLevel(User.VettingLevel.STANDARD)
                .accountStatus(User.AccountStatus.ACTIVE)
                .trustScore(0.0)
                .totalJobsCompleted(0)
                .totalReviews(0)
                .isActive(true)
                .isVerified(false)
                // Admin-created users are auto-approved
                .isApproved(true)
                .build();
        user = userRepository.save(user);
        return ResponseEntity.ok(authService.getUserById(user.getId()));
    }

    /** Admin - update user role */
    @PutMapping("/users/{id:[0-9]+}/role")
    public ResponseEntity<AuthDTO.UserDTO> updateUserRole(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String roleStr = body.get("role");
        if (roleStr == null || roleStr.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        User.UserRole newRole;
        try {
            newRole = User.UserRole.valueOf(roleStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        User.UserRole oldRole = user.getRole();
        user.setRole(newRole);
        userRepository.save(user);
        auditService.logAction(AdminAuditLog.AuditAction.USER_ROLE_CHANGED, "USER", id,
                "Changed role from " + oldRole + " to " + newRole);
        return ResponseEntity.ok(authService.getUserById(id));
    }

    /** Admin - activate/deactivate user (legacy toggle) */
    @PutMapping("/users/{id:[0-9]+}/status")
    public ResponseEntity<AuthDTO.UserDTO> updateUserStatus(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> body) {
        Boolean isActive = body.get("isActive");
        if (isActive == null) {
            return ResponseEntity.badRequest().build();
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setIsActive(isActive);
        user.setAccountStatus(isActive ? User.AccountStatus.ACTIVE : User.AccountStatus.SUSPENDED);
        userRepository.save(user);
        auditService.logAction(isActive ? AdminAuditLog.AuditAction.USER_ACTIVATED : AdminAuditLog.AuditAction.USER_SUSPENDED,
                "USER", id, (isActive ? "Activated" : "Suspended") + " user: " + user.getFirstName() + " " + user.getLastName());
        return ResponseEntity.ok(authService.getUserById(id));
    }

    /** Admin - set account status (ACTIVE, SUSPENDED, LOCKED, DISABLED, SOFT_DELETED) */
    @PutMapping("/users/{id:[0-9]+}/account-status")
    public ResponseEntity<AuthDTO.UserDTO> updateAccountStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String statusStr = body.get("accountStatus");
        if (statusStr == null || statusStr.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        User.AccountStatus newStatus;
        try {
            newStatus = User.AccountStatus.valueOf(statusStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        User.AccountStatus oldStatus = user.getAccountStatus();
        user.setAccountStatus(newStatus);
        user.setIsActive(newStatus == User.AccountStatus.ACTIVE);
        userRepository.save(user);
        auditService.logAction(AdminAuditLog.AuditAction.USER_SUSPENDED, "USER", id,
                "Changed account status from " + oldStatus + " to " + newStatus);
        return ResponseEntity.ok(authService.getUserById(id));
    }

    /** Admin - approve an artisan (makes them visible to customers) */
    @PutMapping("/users/{id:[0-9]+}/approve")
    public ResponseEntity<AuthDTO.UserDTO> approveUser(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setIsApproved(true);
        userRepository.save(user);
        auditService.logAction(AdminAuditLog.AuditAction.USER_APPROVED, "USER", id,
                "Approved artisan: " + user.getFirstName() + " " + user.getLastName());
        return ResponseEntity.ok(authService.getUserById(id));
    }

    /** Admin - revoke approval from an artisan */
    @PutMapping("/users/{id:[0-9]+}/revoke-approval")
    public ResponseEntity<AuthDTO.UserDTO> revokeApproval(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setIsApproved(false);
        userRepository.save(user);
        auditService.logAction(AdminAuditLog.AuditAction.USER_APPROVAL_REVOKED, "USER", id,
                "Revoked approval for: " + user.getFirstName() + " " + user.getLastName());
        return ResponseEntity.ok(authService.getUserById(id));
    }

    /** Admin - soft delete a user */
    @DeleteMapping("/users/{id:[0-9]+}")
    public ResponseEntity<Map<String, String>> softDeleteUser(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setAccountStatus(User.AccountStatus.SOFT_DELETED);
        user.setIsActive(false);
        userRepository.save(user);
        // Also deactivate all their listings
        listingRepository.findByArtisanIdOrderByCreatedAtDesc(id, Pageable.unpaged())
                .forEach(listing -> {
                    listing.setIsActive(false);
                    listing.setStatus(Listing.ListingStatus.REVOKED);
                    listingRepository.save(listing);
                });
        auditService.logAction(AdminAuditLog.AuditAction.USER_DELETED, "USER", id,
                "Soft-deleted user: " + user.getFirstName() + " " + user.getLastName());
        return ResponseEntity.ok(Map.of("message", "User soft-deleted"));
    }

    /** Admin - revoke a listing (different from reject — forces it off after previously approved) */
    @PutMapping("/listings/{id}/revoke")
    public ResponseEntity<ListingDTO.ListingResponse> revokeListing(@PathVariable Long id) {
        ListingDTO.ListingResponse response = listingService.revokeListing(id);
        auditService.logAction(AdminAuditLog.AuditAction.LISTING_REVOKED, "LISTING", id, "Revoked listing: " + response.getTitle());
        return ResponseEntity.ok(response);
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
        BookingDTO.BookingResponse response = bookingService.adminResolveDispute(id, request);
        auditService.logAction(AdminAuditLog.AuditAction.DISPUTE_RESOLVED, "JOB", id, "Resolved dispute for job #" + id);
        return ResponseEntity.ok(response);
    }

    /** Admin - jobs completed > 24h ago without payment recorded */
    @GetMapping("/payments/missing")
    public ResponseEntity<List<BookingDTO.AdminJobView>> getMissingPayments() {
        return ResponseEntity.ok(bookingService.getMissingPayments());
    }

    /** Admin - platform statistics */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getPlatformStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", userRepository.count());
        stats.put("totalWorkers", userRepository.countByRole(User.UserRole.WORKER));
        stats.put("totalClients", userRepository.countByRole(User.UserRole.CLIENT));
        stats.put("totalAdmins", userRepository.countByRole(User.UserRole.ADMIN));
        stats.put("approvedWorkers", userRepository.countByRoleAndIsApproved(User.UserRole.WORKER, true));
        stats.put("pendingWorkers", userRepository.countByRoleAndIsApproved(User.UserRole.WORKER, false));
        stats.put("suspendedUsers", userRepository.countByAccountStatus(User.AccountStatus.SUSPENDED));
        stats.put("totalListings", listingRepository.count());
        stats.put("pendingListings", listingRepository.countByStatus(Listing.ListingStatus.PENDING));
        stats.put("approvedListings", listingRepository.countByStatus(Listing.ListingStatus.APPROVED));
        stats.put("totalJobs", jobRepository.count());
        stats.put("completedJobs", jobRepository.countByStatus(Job.JobStatus.COMPLETED));
        stats.put("pendingJobs", jobRepository.countByStatus(Job.JobStatus.PENDING));
        stats.put("activeJobs", jobRepository.countByStatusIn(List.of(
            Job.JobStatus.ACCEPTED, Job.JobStatus.ARRIVED, Job.JobStatus.IN_PROGRESS)));
        stats.put("totalEscrows", escrowRepository.count());
        return ResponseEntity.ok(stats);
    }

    /** Admin - list all public reviews across all artisans */
    @GetMapping("/reviews")
    public ResponseEntity<?> getAllReviews() {
        return ResponseEntity.ok(publicReviewService.getAllReviews());
    }

    /** Admin - list recent WhatsApp bot sessions */
    @GetMapping("/whatsapp/sessions")
    public ResponseEntity<List<WhatsAppSession>> getWhatsAppSessions() {
        return ResponseEntity.ok(whatsAppSessionRepository.findAll(
            org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "updatedAt")));
    }

    // ── Audit Log ─────────────────────────────────────────────────────────────

    /** Admin - list audit log entries */
    @GetMapping("/audit-log")
    public ResponseEntity<org.springframework.data.domain.Page<AdminAuditLog>> getAuditLog(
            @org.springframework.data.web.PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(auditService.getAuditLogs(pageable));
    }

    /** Admin - audit log for a specific target */
    @GetMapping("/audit-log/{targetType}/{targetId}")
    public ResponseEntity<List<AdminAuditLog>> getAuditLogForTarget(
            @PathVariable String targetType, @PathVariable Long targetId) {
        return ResponseEntity.ok(auditService.getAuditLogsForTarget(targetType.toUpperCase(), targetId));
    }
}
