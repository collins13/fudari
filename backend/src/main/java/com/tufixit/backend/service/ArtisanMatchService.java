package com.tufixit.backend.service;

import com.tufixit.backend.dto.AiDTO;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.entity.WorkerSkill;
import com.tufixit.backend.repository.EstateArtisanApprovalRepository;
import com.tufixit.backend.repository.JobRepository;
import com.tufixit.backend.repository.UserRepository;
import com.tufixit.backend.repository.WorkerSkillRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * ArtisanMatchService — Feature 4: Artisan Match Scoring
 *
 * Scores and ranks artisans for a given job request using:
 *   - Distance from customer location (40% weight)
 *   - Trust score / rating (30% weight)
 *   - Subscription tier / vetting level (20% weight)
 *   - Job completion count (10% weight)
 *
 * When an estateId is provided, uses Priority-Tiered Search:
 *   Priority 1: Estate-approved artisans (1.2x score boost)
 *   Priority 2: Backfill with local artisans within 5km if < 3 approved found
 *
 * Returns top N artisans with a human-readable match reason.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ArtisanMatchService {

    private final UserRepository userRepository;
    private final WorkerSkillRepository workerSkillRepository;
    private final JobRepository jobRepository;
    private final EstateArtisanApprovalRepository approvalRepository;

    private static final int TOP_N = 3;
    private static final double EARTH_RADIUS_KM = 6371.0;
    private static final double MAX_RADIUS_KM = 20.0;
    private static final double ESTATE_BACKFILL_RADIUS_KM = 5.0;
    private static final double ESTATE_APPROVAL_BOOST = 1.2;

    /**
     * Find and score the top N artisans for a given skill type and location.
     * Delegates to the estate-aware overload with no estate context.
     */
    public List<AiDTO.MatchedArtisan> findTopMatches(
            String skillTypeStr, Double latitude, Double longitude) {
        return findTopMatches(skillTypeStr, latitude, longitude, null);
    }

    /**
     * Priority-Tiered artisan matching.
     *
     * When estateId is provided:
     *   Priority 1: Fetch APPROVED artisans from estate_artisan_approvals with 1.2x score boost.
     *   Priority 2: If fewer than TOP_N found, backfill with local artisans within 5km.
     *
     * When estateId is null: standard matching within MAX_RADIUS_KM.
     */
    public List<AiDTO.MatchedArtisan> findTopMatches(
            String skillTypeStr, Double latitude, Double longitude, Long estateId) {

        WorkerSkill.SkillType skillType;
        try {
            skillType = WorkerSkill.SkillType.valueOf(skillTypeStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            skillType = WorkerSkill.SkillType.OTHER;
        }

        // All active workers with this skill
        List<WorkerSkill> skills = workerSkillRepository.findBySkillType(skillType);

        // Estate-approved artisan IDs (Priority 1)
        Set<Long> approvedIds = estateId != null
                ? new HashSet<>(approvalRepository.findApprovedArtisanIdsByEstateId(estateId))
                : Collections.emptySet();

        List<ScoredArtisan> approvedScored = new ArrayList<>();
        List<ScoredArtisan> backfillScored = new ArrayList<>();

        for (WorkerSkill skill : skills) {
            User artisan = skill.getWorker();
            if (artisan == null || !Boolean.TRUE.equals(artisan.getIsActive())) continue;
            if (!Boolean.TRUE.equals(artisan.getIsApproved())) continue;

            double distanceKm = Double.MAX_VALUE;
            if (latitude != null && longitude != null
                    && artisan.getLatitude() != null && artisan.getLongitude() != null) {
                distanceKm = haversine(latitude, longitude, artisan.getLatitude(), artisan.getLongitude());
            }

            double score = computeScore(artisan, distanceKm);
            boolean isEstateApproved = approvedIds.contains(artisan.getId());

            if (isEstateApproved) {
                // Priority 1: estate-approved artisan — apply 1.2x boost
                double boostedScore = score * ESTATE_APPROVAL_BOOST;
                approvedScored.add(new ScoredArtisan(artisan, skill, distanceKm, boostedScore, true));
            } else if (estateId != null) {
                // Priority 2: backfill — only within 5km
                if (distanceKm <= ESTATE_BACKFILL_RADIUS_KM) {
                    backfillScored.add(new ScoredArtisan(artisan, skill, distanceKm, score, false));
                }
            } else {
                // No estate context — standard radius filter
                if (distanceKm <= MAX_RADIUS_KM || distanceKm == Double.MAX_VALUE) {
                    backfillScored.add(new ScoredArtisan(artisan, skill, distanceKm, score, false));
                }
            }
        }

        // Merge: take approved first (sorted by score), then backfill to reach TOP_N
        approvedScored.sort(Comparator.comparingDouble(ScoredArtisan::score).reversed());
        backfillScored.sort(Comparator.comparingDouble(ScoredArtisan::score).reversed());

        List<ScoredArtisan> merged = new ArrayList<>(approvedScored);
        if (merged.size() < TOP_N) {
            Set<Long> alreadyIncluded = merged.stream()
                    .map(s -> s.artisan().getId()).collect(Collectors.toSet());
            for (ScoredArtisan sa : backfillScored) {
                if (merged.size() >= TOP_N) break;
                if (!alreadyIncluded.contains(sa.artisan().getId())) {
                    merged.add(sa);
                    alreadyIncluded.add(sa.artisan().getId());
                }
            }
        }

        if (estateId != null && !approvedScored.isEmpty()) {
            log.debug("[MATCH] Estate {} — {} approved artisans found, {} backfill added",
                    estateId, approvedScored.size(), merged.size() - approvedScored.size());
        }

        return merged.stream()
                .limit(TOP_N)
                .map(this::toMatchedArtisan)
                .collect(Collectors.toList());
    }

    // ── Scoring ───────────────────────────────────────────────────────────────

    private double computeScore(User artisan, double distanceKm) {
        // Distance score (0–40): closer = higher
        double distanceScore = distanceKm == Double.MAX_VALUE ? 20.0
                : Math.max(0, 40.0 * (1.0 - distanceKm / MAX_RADIUS_KM));

        // Rating score (0–30): trust score 0–5 mapped to 0–30
        double trustScore = artisan.getTrustScore() != null ? artisan.getTrustScore() : 0.0;
        double ratingScore = (trustScore / 5.0) * 30.0;

        // Vetting level (0–20)
        double vettingScore = switch (artisan.getVettingLevel()) {
            case PRO -> 20.0;
            case VERIFIED -> 13.0;
            default -> 5.0;
        };

        // Job count score (0–10): cap at 50 jobs = full score
        int jobs = artisan.getTotalJobsCompleted() != null ? artisan.getTotalJobsCompleted() : 0;
        double jobScore = Math.min(10.0, (jobs / 50.0) * 10.0);

        return distanceScore + ratingScore + vettingScore + jobScore;
    }

    private AiDTO.MatchedArtisan toMatchedArtisan(ScoredArtisan sa) {
        User a = sa.artisan();
        double dist = sa.distanceKm();

        String reason = buildReason(a, dist, sa.estateApproved());

        Integer rate = null;
        if (sa.skill().getHourlyRate() != null) {
            try { rate = Integer.parseInt(sa.skill().getHourlyRate()); }
            catch (NumberFormatException ignored) {}
        }

        return AiDTO.MatchedArtisan.builder()
                .artisanId(a.getId())
                .name(a.getFirstName() + " " + a.getLastName())
                .profileImage(a.getProfileImage())
                .skillType(sa.skill().getSkillType().name())
                .trustScore(a.getTrustScore() != null ? a.getTrustScore() : 0.0)
                .locationName(a.getLocationName())
                .distanceKm(dist == Double.MAX_VALUE ? null : Math.round(dist * 10.0) / 10.0)
                .matchScore(Math.round(sa.score() * 10.0) / 10.0)
                .matchReason(reason)
                .startingRate(rate)
                .build();
    }

    private String buildReason(User a, double distKm, boolean estateApproved) {
        List<String> reasons = new ArrayList<>();
        if (estateApproved) reasons.add("estate-approved");
        if (distKm != Double.MAX_VALUE && distKm <= 3.0)  reasons.add("very close to you");
        else if (distKm != Double.MAX_VALUE)               reasons.add(String.format("%.1f km away", distKm));
        if (a.getTrustScore() != null && a.getTrustScore() >= 4.5) reasons.add("highly rated");
        if (a.getVettingLevel() == User.VettingLevel.PRO)  reasons.add("Gold verified");
        else if (a.getVettingLevel() == User.VettingLevel.VERIFIED) reasons.add("verified artisan");
        int jobs = a.getTotalJobsCompleted() != null ? a.getTotalJobsCompleted() : 0;
        if (jobs >= 20) reasons.add(jobs + " jobs completed");
        return reasons.isEmpty() ? "Available in your area"
                : String.join(" · ", reasons);
    }

    // ── Haversine formula ─────────────────────────────────────────────────────

    private double haversine(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // ── Internal record ───────────────────────────────────────────────────────

    private record ScoredArtisan(User artisan, WorkerSkill skill, double distanceKm, double score, boolean estateApproved) {}

    // ══════════════════════════════════════════════════════════════════════════
    // ── Feature 7: Predictive Multi-Category Match ───────────────────────────
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Returns three ranked lists:
     *   - Best Match: highest overall score (quality + proximity + trust)
     *   - Fastest Available: closest artisans (distance-weighted)
     *   - Best Value: lowest starting rates among good artisans
     */
    public AiDTO.PredictiveMatchResponse findPredictiveMatches(
            String skillTypeStr, Double latitude, Double longitude) {

        WorkerSkill.SkillType skillType;
        try {
            skillType = WorkerSkill.SkillType.valueOf(skillTypeStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            skillType = WorkerSkill.SkillType.OTHER;
        }

        List<WorkerSkill> skills = workerSkillRepository.findBySkillType(skillType);
        List<ScoredArtisan> allScored = new ArrayList<>();

        for (WorkerSkill skill : skills) {
            User artisan = skill.getWorker();
            if (artisan == null || !Boolean.TRUE.equals(artisan.getIsActive())) continue;
            if (!Boolean.TRUE.equals(artisan.getIsApproved())) continue;

            double distanceKm = Double.MAX_VALUE;
            if (latitude != null && longitude != null
                    && artisan.getLatitude() != null && artisan.getLongitude() != null) {
                distanceKm = haversine(latitude, longitude, artisan.getLatitude(), artisan.getLongitude());
                if (distanceKm > MAX_RADIUS_KM * 2) continue; // wider radius for more options
            }

            double score = computeScore(artisan, distanceKm);
            allScored.add(new ScoredArtisan(artisan, skill, distanceKm, score, false));
        }

        // Best Match — highest overall score
        List<AiDTO.MatchedArtisan> bestMatch = allScored.stream()
                .sorted(Comparator.comparingDouble(ScoredArtisan::score).reversed())
                .limit(TOP_N)
                .map(this::toMatchedArtisan)
                .collect(Collectors.toList());

        // Fastest Available — closest distance (only those with known location)
        List<AiDTO.MatchedArtisan> fastestAvailable = allScored.stream()
                .filter(sa -> sa.distanceKm() != Double.MAX_VALUE)
                .sorted(Comparator.comparingDouble(ScoredArtisan::distanceKm))
                .limit(TOP_N)
                .map(this::toMatchedArtisan)
                .collect(Collectors.toList());

        // Best Value — lowest hourly rate among artisans with rating >= 3.5
        List<AiDTO.MatchedArtisan> bestValue = allScored.stream()
                .filter(sa -> {
                    Double ts = sa.artisan().getTrustScore();
                    return ts != null && ts >= 3.5;
                })
                .filter(sa -> sa.skill().getHourlyRate() != null)
                .sorted(Comparator.comparingInt(sa -> {
                    try { return Integer.parseInt(sa.skill().getHourlyRate()); }
                    catch (NumberFormatException e) { return Integer.MAX_VALUE; }
                }))
                .limit(TOP_N)
                .map(this::toMatchedArtisan)
                .collect(Collectors.toList());

        return AiDTO.PredictiveMatchResponse.builder()
                .bestMatch(bestMatch)
                .fastestAvailable(fastestAvailable)
                .bestValue(bestValue)
                .build();
    }
}
