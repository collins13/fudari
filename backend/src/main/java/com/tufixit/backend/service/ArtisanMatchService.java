package com.tufixit.backend.service;

import com.tufixit.backend.dto.AiDTO;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.entity.WorkerSkill;
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
 * Returns top N artisans with a human-readable match reason.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ArtisanMatchService {

    private final UserRepository userRepository;
    private final WorkerSkillRepository workerSkillRepository;
    private final JobRepository jobRepository;

    private static final int TOP_N = 3;
    private static final double EARTH_RADIUS_KM = 6371.0;
    private static final double MAX_RADIUS_KM = 20.0;

    /**
     * Find and score the top N artisans for a given skill type and location.
     *
     * @param skillTypeStr  Skill type string e.g. "PLUMBER"
     * @param latitude      Customer latitude (nullable — falls back to score-only ranking)
     * @param longitude     Customer longitude
     * @return Ranked list of top artisans with match scores
     */
    public List<AiDTO.MatchedArtisan> findTopMatches(
            String skillTypeStr, Double latitude, Double longitude) {

        WorkerSkill.SkillType skillType;
        try {
            skillType = WorkerSkill.SkillType.valueOf(skillTypeStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            skillType = WorkerSkill.SkillType.OTHER;
        }

        // All active workers with this skill
        List<WorkerSkill> skills = workerSkillRepository.findBySkillType(skillType);

        List<ScoredArtisan> scored = new ArrayList<>();

        for (WorkerSkill skill : skills) {
            User artisan = skill.getWorker();
            if (artisan == null || !Boolean.TRUE.equals(artisan.getIsActive())) continue;

            double distanceKm = Double.MAX_VALUE;
            if (latitude != null && longitude != null
                    && artisan.getLatitude() != null && artisan.getLongitude() != null) {
                distanceKm = haversine(latitude, longitude, artisan.getLatitude(), artisan.getLongitude());
                if (distanceKm > MAX_RADIUS_KM) continue; // too far
            }

            double score = computeScore(artisan, distanceKm);
            scored.add(new ScoredArtisan(artisan, skill, distanceKm, score));
        }

        // Sort descending by score, take top N
        return scored.stream()
                .sorted(Comparator.comparingDouble(ScoredArtisan::score).reversed())
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
        String distLabel = dist == Double.MAX_VALUE ? "Nearby"
                : String.format("%.1f km away", dist);

        String reason = buildReason(a, dist);

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

    private String buildReason(User a, double distKm) {
        List<String> reasons = new ArrayList<>();
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

    private record ScoredArtisan(User artisan, WorkerSkill skill, double distanceKm, double score) {}
}
