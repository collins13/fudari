package com.tufixit.backend.service;

import com.tufixit.backend.dto.AuthDTO;
import com.tufixit.backend.dto.EstateDTO;
import com.tufixit.backend.entity.Estate;
import com.tufixit.backend.entity.EstateArtisanApproval;
import com.tufixit.backend.entity.Job;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.repository.EstateArtisanApprovalRepository;
import com.tufixit.backend.repository.EstateRepository;
import com.tufixit.backend.repository.JobRepository;
import com.tufixit.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.text.Normalizer;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EstateService {

    private final EstateRepository estateRepository;
    private final EstateArtisanApprovalRepository approvalRepository;
    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final WorkerService workerService;

    private static final SecureRandom RANDOM = new SecureRandom();

    // ── Estate CRUD ──────────────────────────────────────────────────────────

    @Transactional
    public EstateDTO.EstateResponse createEstate(EstateDTO.CreateEstateRequest req) {
        String slug = generateSlug(req.getName());

        if (estateRepository.findBySlug(slug).isPresent()) {
            throw new IllegalArgumentException("An estate with a similar name already exists (slug: " + slug + ")");
        }

        String shortCode = generateUniqueShortCode();

        Estate estate = Estate.builder()
                .name(req.getName())
                .slug(slug)
                .area(req.getArea())
                .latitude(req.getLatitude())
                .longitude(req.getLongitude())
                .unitCount(req.getUnitCount())
                .managerName(req.getManagerName())
                .managerPhone(req.getManagerPhone())
                .managerEmail(req.getManagerEmail())
                .monthlyFee(req.getMonthlyFee())
                .contractStart(req.getContractStart())
                .contractEnd(req.getContractEnd())
                .shortCode(shortCode)
                .brandPrimaryColor(req.getBrandPrimaryColor())
                .brandLogoUrl(req.getBrandLogoUrl())
                .brandWelcomeMessage(req.getBrandWelcomeMessage())
                .commissionRate(req.getCommissionRate() != null ? req.getCommissionRate() : 0.0)
                .build();

        estate = estateRepository.save(estate);
        log.info("[ESTATE] Created estate '{}' (slug={}, area={})", estate.getName(), slug, estate.getArea());
        return toResponse(estate);
    }

    public EstateDTO.EstateResponse getEstateBySlug(String slug) {
        Estate estate = estateRepository.findBySlugAndIsActive(slug, true)
                .orElseThrow(() -> new IllegalArgumentException("Estate not found: " + slug));
        return toResponse(estate);
    }

    public EstateDTO.EstateResponse getEstateById(Long id) {
        Estate estate = estateRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Estate not found: " + id));
        return toResponse(estate);
    }

    public List<EstateDTO.EstateResponse> listActiveEstates() {
        return estateRepository.findByIsActiveTrueOrderByNameAsc()
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public EstateDTO.EstateResponse updateEstate(Long id, EstateDTO.CreateEstateRequest req) {
        Estate estate = estateRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Estate not found: " + id));

        if (req.getName() != null) estate.setName(req.getName());
        if (req.getArea() != null) estate.setArea(req.getArea());
        if (req.getLatitude() != null) estate.setLatitude(req.getLatitude());
        if (req.getLongitude() != null) estate.setLongitude(req.getLongitude());
        if (req.getUnitCount() != null) estate.setUnitCount(req.getUnitCount());
        if (req.getManagerName() != null) estate.setManagerName(req.getManagerName());
        if (req.getManagerPhone() != null) estate.setManagerPhone(req.getManagerPhone());
        if (req.getManagerEmail() != null) estate.setManagerEmail(req.getManagerEmail());
        if (req.getMonthlyFee() != null) estate.setMonthlyFee(req.getMonthlyFee());
        if (req.getContractStart() != null) estate.setContractStart(req.getContractStart());
        if (req.getContractEnd() != null) estate.setContractEnd(req.getContractEnd());
        if (req.getBrandPrimaryColor() != null) estate.setBrandPrimaryColor(req.getBrandPrimaryColor());
        if (req.getBrandLogoUrl() != null) estate.setBrandLogoUrl(req.getBrandLogoUrl());
        if (req.getBrandWelcomeMessage() != null) estate.setBrandWelcomeMessage(req.getBrandWelcomeMessage());
        if (req.getCommissionRate() != null) estate.setCommissionRate(req.getCommissionRate());

        estate = estateRepository.save(estate);
        return toResponse(estate);
    }

    @Transactional
    public void deactivateEstate(Long id) {
        Estate estate = estateRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Estate not found: " + id));
        estate.setIsActive(false);
        estateRepository.save(estate);
        log.info("[ESTATE] Deactivated estate '{}'", estate.getName());
    }

    // ── Artisan Approvals ────────────────────────────────────────────────────

    @Transactional
    public EstateDTO.ApprovedArtisanResponse approveArtisan(Long estateId, EstateDTO.ApproveArtisanRequest req) {
        Estate estate = estateRepository.findById(estateId)
                .orElseThrow(() -> new IllegalArgumentException("Estate not found"));

        User artisan = userRepository.findById(req.getArtisanId())
                .orElseThrow(() -> new IllegalArgumentException("Artisan not found"));

        if (artisan.getRole() != User.UserRole.WORKER) {
            throw new IllegalArgumentException("User is not an artisan");
        }

        if (approvalRepository.existsByEstateIdAndArtisanId(estateId, req.getArtisanId())) {
            throw new IllegalStateException("Artisan is already approved for this estate");
        }

        EstateArtisanApproval approval = EstateArtisanApproval.builder()
                .estate(estate)
                .artisan(artisan)
                .approvedBy(estate.getManagerName())
                .note(req.getNote())
                .approvalStatus(EstateArtisanApproval.ApprovalStatus.PENDING)
                .build();

        approval = approvalRepository.save(approval);
        log.info("[ESTATE] Approved artisan {} for estate '{}'", artisan.getId(), estate.getName());

        return toApprovalResponse(approval, artisan);
    }

    public List<EstateDTO.ApprovedArtisanResponse> listApprovedArtisans(Long estateId) {
        return approvalRepository.findByEstateId(estateId).stream()
                .map(a -> toApprovalResponse(a, a.getArtisan()))
                .collect(Collectors.toList());
    }

    @Transactional
    public void removeArtisanApproval(Long estateId, Long artisanId) {
        approvalRepository.deleteByEstateIdAndArtisanId(estateId, artisanId);
        log.info("[ESTATE] Removed artisan {} approval from estate {}", artisanId, estateId);
    }

    @Transactional
    public EstateDTO.ApprovedArtisanResponse decideApproval(Long estateId, Long approvalId,
                                                            EstateDTO.ApprovalDecisionRequest req) {
        EstateArtisanApproval approval = approvalRepository.findById(approvalId)
                .orElseThrow(() -> new IllegalArgumentException("Approval not found"));
        if (!approval.getEstate().getId().equals(estateId)) {
            throw new IllegalArgumentException("Approval does not belong to this estate");
        }

        EstateArtisanApproval.ApprovalStatus decision;
        try {
            decision = EstateArtisanApproval.ApprovalStatus.valueOf(req.getDecision().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid decision. Use APPROVED or REJECTED");
        }

        approval.setApprovalStatus(decision);
        if (decision == EstateArtisanApproval.ApprovalStatus.REJECTED && req.getRejectionReason() != null) {
            approval.setRejectionReason(req.getRejectionReason());
        }
        approval = approvalRepository.save(approval);
        log.info("[ESTATE] Approval {} for estate {} set to {}", approvalId, estateId, decision);
        return toApprovalResponse(approval, approval.getArtisan());
    }

    public List<EstateDTO.ApprovedArtisanResponse> listPendingApprovals(Long estateId) {
        return approvalRepository.findByEstateIdAndApprovalStatus(
                estateId, EstateArtisanApproval.ApprovalStatus.PENDING).stream()
                .map(a -> toApprovalResponse(a, a.getArtisan()))
                .collect(Collectors.toList());
    }

    public EstateDTO.EstateResponse resolveByShortCode(String shortCode) {
        Estate estate = estateRepository.findByShortCodeAndIsActive(shortCode, true)
                .orElseThrow(() -> new IllegalArgumentException("Estate not found for code: " + shortCode));
        return toResponse(estate);
    }

    /**
     * Public: Get full worker profiles for APPROVED artisans attached to an estate (by slug).
     * Used on the estate booking page to show only approved artisans.
     */
    public List<AuthDTO.UserDTO> getApprovedArtisanProfiles(String slug) {
        Estate estate = estateRepository.findBySlugAndIsActive(slug, true)
                .orElseThrow(() -> new IllegalArgumentException("Estate not found: " + slug));
        List<Long> artisanIds = approvalRepository.findApprovedArtisanIdsByEstateId(estate.getId());
        if (artisanIds.isEmpty()) return List.of();
        List<User> artisans = userRepository.findAllById(artisanIds);
        return workerService.mapUsersToDTOs(artisans);
    }

    /**
     * Check if an artisan is approved for a given estate.
     * Used by RankingService to apply the estate-approval ranking boost.
     */
    public boolean isArtisanApprovedForEstate(Long estateId, Long artisanId) {
        return approvalRepository.existsByEstateIdAndArtisanId(estateId, artisanId);
    }

    // ── Estate Analytics ─────────────────────────────────────────────────────

    public EstateDTO.EstateAnalytics getEstateAnalytics(Long estateId) {
        Estate estate = estateRepository.findById(estateId)
                .orElseThrow(() -> new IllegalArgumentException("Estate not found"));

        long totalBookings = jobRepository.countByEstateId(estateId);
        long completed = jobRepository.countByEstateIdAndStatus(estateId, Job.JobStatus.COMPLETED);
        long pending = jobRepository.countByEstateIdAndStatus(estateId, Job.JobStatus.PENDING);
        long cancelled = jobRepository.countByEstateIdAndStatus(estateId, Job.JobStatus.CANCELLED);
        long approvedArtisans = approvalRepository.countByEstateId(estateId);

        // Average rating from completed jobs
        List<Job> completedJobs = jobRepository.findCompletedByEstateId(estateId);
        // TODO: compute from reviews linked to these jobs once review↔job linkage exists
        double avgRating = 0.0;

        // Top artisans by completed job count for this estate
        Map<Long, Long> artisanJobCounts = completedJobs.stream()
                .filter(j -> j.getAssignedWorker() != null)
                .collect(Collectors.groupingBy(
                        j -> j.getAssignedWorker().getId(),
                        Collectors.counting()
                ));

        List<EstateDTO.TopArtisan> topArtisans = artisanJobCounts.entrySet().stream()
                .sorted(Map.Entry.<Long, Long>comparingByValue().reversed())
                .limit(5)
                .map(entry -> {
                    User artisan = userRepository.findById(entry.getKey()).orElse(null);
                    if (artisan == null) return null;
                    String skillLabel = artisan.getSkills() != null && !artisan.getSkills().isEmpty()
                            ? artisan.getSkills().get(0).getSkillType().name()
                            : "OTHER";
                    return EstateDTO.TopArtisan.builder()
                            .artisanId(artisan.getId())
                            .name(artisan.getFirstName() + " " + artisan.getLastName())
                            .skillType(skillLabel)
                            .completedJobs(entry.getValue())
                            .avgRating(artisan.getTrustScore() != null ? artisan.getTrustScore() : 0.0)
                            .build();
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        // Service health
        long activeJobs = jobRepository.findActiveJobsByEstateId(estateId).size();
        Long totalJobValue = jobRepository.sumAgreedPriceByEstateId(estateId);
        long totalValue = totalJobValue != null ? totalJobValue : 0L;
        double commissionRate = estate.getCommissionRate() != null ? estate.getCommissionRate() : 0.0;

        return EstateDTO.EstateAnalytics.builder()
                .estateId(estateId)
                .estateName(estate.getName())
                .totalBookings(totalBookings)
                .completedBookings(completed)
                .pendingBookings(pending)
                .cancelledBookings(cancelled)
                .avgRating(avgRating)
                .approvedArtisans((int) approvedArtisans)
                .activeJobs(activeJobs)
                .totalJobValue(totalValue)
                .estateCommission(totalValue * commissionRate)
                .topArtisans(topArtisans)
                .build();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private EstateDTO.EstateResponse toResponse(Estate estate) {
        return EstateDTO.EstateResponse.builder()
                .id(estate.getId())
                .name(estate.getName())
                .slug(estate.getSlug())
                .area(estate.getArea())
                .latitude(estate.getLatitude())
                .longitude(estate.getLongitude())
                .unitCount(estate.getUnitCount())
                .managerName(estate.getManagerName())
                .managerPhone(estate.getManagerPhone())
                .managerEmail(estate.getManagerEmail())
                .monthlyFee(estate.getMonthlyFee())
                .isActive(estate.getIsActive())
                .bookingUrl("/estate/" + estate.getSlug())
                .contractStart(estate.getContractStart())
                .contractEnd(estate.getContractEnd())
                .createdAt(estate.getCreatedAt())
                .brandPrimaryColor(estate.getBrandPrimaryColor())
                .brandLogoUrl(estate.getBrandLogoUrl())
                .brandWelcomeMessage(estate.getBrandWelcomeMessage())
                .shortCode(estate.getShortCode())
                .whatsappStartCommand(estate.getShortCode() != null
                        ? "START_ESTATE_" + estate.getShortCode() : null)
                .commissionRate(estate.getCommissionRate())
                .build();
    }

    private EstateDTO.ApprovedArtisanResponse toApprovalResponse(EstateArtisanApproval a, User artisan) {
        String skillLabel = artisan.getSkills() != null && !artisan.getSkills().isEmpty()
                ? artisan.getSkills().get(0).getSkillType().name()
                : "OTHER";
        return EstateDTO.ApprovedArtisanResponse.builder()
                .approvalId(a.getId())
                .artisanId(artisan.getId())
                .artisanName(artisan.getFirstName() + " " + artisan.getLastName())
                .skillType(skillLabel)
                .rating(artisan.getTrustScore())
                .note(a.getNote())
                .approvalStatus(a.getApprovalStatus() != null ? a.getApprovalStatus().name() : "PENDING")
                .rejectionReason(a.getRejectionReason())
                .approvedAt(a.getCreatedAt())
                .build();
    }

    /** Slug from "Greenpark Estate - Athi River" → "greenpark-estate-athi-river" */
    private String generateSlug(String name) {
        String normalized = Normalizer.normalize(name, Normalizer.Form.NFD)
                .replaceAll("[^\\p{ASCII}]", "");
        return normalized.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");
    }

    /** Generate a unique 4-digit alphanumeric short code. */
    private String generateUniqueShortCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I confusion
        for (int attempt = 0; attempt < 100; attempt++) {
            StringBuilder sb = new StringBuilder(4);
            for (int i = 0; i < 4; i++) sb.append(chars.charAt(RANDOM.nextInt(chars.length())));
            String code = sb.toString();
            if (!estateRepository.existsByShortCode(code)) return code;
        }
        throw new IllegalStateException("Failed to generate unique short code after 100 attempts");
    }
}
