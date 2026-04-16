package com.tufixit.backend.service;

import com.tufixit.backend.entity.*;
import com.tufixit.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Ranking algorithm for artisans and listings.
 *
 * Final Score = (Subscription × 40%) + (Ratings × 20%) + (Performance × 15%)
 *             + (Engagement × 15%) + (Recency × 10%)
 *
 * Each component is normalised to 0–100. Max possible score = 100.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RankingService {

    private final SubscriptionRepository subscriptionRepository;
    private final ReviewRepository reviewRepository;
    private final JobRepository jobRepository;
    private final LeadTrackingRepository leadTrackingRepository;
    private final ListingRepository listingRepository;
    private final EstateArtisanApprovalRepository estateApprovalRepository;

    // ── Weights ─────────────────────────────────────────────────────────────
    private static final double W_SUBSCRIPTION  = 0.40;
    private static final double W_RATINGS       = 0.20;
    private static final double W_PERFORMANCE   = 0.15;
    private static final double W_ENGAGEMENT    = 0.15;
    private static final double W_RECENCY       = 0.10;

    // ── Subscription base scores (out of 100) ───────────────────────────────
    private static final double SCORE_PRO   = 100.0;  // 25 pts mapped to 100
    private static final double SCORE_BASIC =  60.0;   // 15 pts mapped to 60
    private static final double SCORE_FREE  =  40.0;   // 10 pts mapped to 40

    // ── Simple in-memory cache (TTL 5 min) to avoid repeated DB hits ────────
    private final ConcurrentHashMap<Long, CachedScore> scoreCache = new ConcurrentHashMap<>();
    private static final long CACHE_TTL_MS = 5 * 60 * 1000;

    private record CachedScore(double score, long timestamp) {}

    // ════════════════════════════════════════════════════════════════════════
    //  PUBLIC API
    // ════════════════════════════════════════════════════════════════════════

    /** Compute composite ranking score for an artisan (0–100). */
    public double computeArtisanScore(User artisan) {
        CachedScore cached = scoreCache.get(artisan.getId());
        if (cached != null && System.currentTimeMillis() - cached.timestamp < CACHE_TTL_MS) {
            return cached.score;
        }

        double subscriptionScore  = computeSubscriptionScore(artisan);
        double ratingsScore       = computeRatingsScore(artisan);
        double performanceScore   = computePerformanceScore(artisan);
        double engagementScore    = computeEngagementScore(artisan);
        double recencyScore       = computeRecencyScore(artisan);

        double finalScore = (subscriptionScore  * W_SUBSCRIPTION)
                          + (ratingsScore       * W_RATINGS)
                          + (performanceScore   * W_PERFORMANCE)
                          + (engagementScore    * W_ENGAGEMENT)
                          + (recencyScore       * W_RECENCY);

        // Clamp to 0–100
        finalScore = Math.max(0, Math.min(100, finalScore));

        scoreCache.put(artisan.getId(), new CachedScore(finalScore, System.currentTimeMillis()));
        return finalScore;
    }

    /**
     * Estate-boosted ranking: base artisan score + 10 bonus points if the artisan
     * is approved for the given estate. This shifts the weights slightly:
     *
     *   effectiveScore = baseScore * 0.90 + estateBonus * 0.10
     *
     * where estateBonus = 100 if approved, 0 otherwise.
     * Net effect: an approved artisan gets +10 points, pushing them above
     * similarly-ranked non-approved artisans without creating a walled garden.
     */
    public double computeArtisanScoreForEstate(User artisan, Long estateId) {
        double baseScore = computeArtisanScore(artisan);
        if (estateId == null) return baseScore;

        boolean approved = estateApprovalRepository.existsByEstateIdAndArtisanId(estateId, artisan.getId());
        double estateBonus = approved ? 100.0 : 0.0;

        return Math.max(0, Math.min(100, (baseScore * 0.90) + (estateBonus * 0.10)));
    }

    /** Compute ranking score for a listing (combines artisan score + listing-specific signals). */
    public double computeListingScore(Listing listing) {
        User artisan = listing.getArtisan();
        double artisanScore = computeArtisanScore(artisan);

        // Listing-specific bonus: view count normalised (max 500 views → 100)
        double viewBonus = Math.min(100, (listing.getViewCount() != null ? listing.getViewCount() : 0) / 5.0);

        // Recency bonus for listing itself
        double listingRecency = 0;
        if (listing.getUpdatedAt() != null) {
            long days = ChronoUnit.DAYS.between(listing.getUpdatedAt(), LocalDateTime.now());
            listingRecency = days <= 7 ? 100 : days <= 30 ? 60 : days <= 90 ? 30 : 10;
        }

        // 80% artisan score + 10% listing views + 10% listing recency
        return (artisanScore * 0.80) + (viewBonus * 0.10) + (listingRecency * 0.10);
    }

    /** Return a breakdown map useful for analytics / debug. */
    public Map<String, Object> getScoreBreakdown(User artisan) {
        Map<String, Object> bd = new LinkedHashMap<>();
        bd.put("artisanId", artisan.getId());
        bd.put("subscriptionScore", Math.round(computeSubscriptionScore(artisan) * 10) / 10.0);
        bd.put("ratingsScore", Math.round(computeRatingsScore(artisan) * 10) / 10.0);
        bd.put("performanceScore", Math.round(computePerformanceScore(artisan) * 10) / 10.0);
        bd.put("engagementScore", Math.round(computeEngagementScore(artisan) * 10) / 10.0);
        bd.put("recencyScore", Math.round(computeRecencyScore(artisan) * 10) / 10.0);
        bd.put("finalScore", Math.round(computeArtisanScore(artisan) * 10) / 10.0);

        // Tier label
        Subscription.PlanType plan = getActivePlan(artisan);
        bd.put("tier", plan.name());
        bd.put("isFeatured", plan == Subscription.PlanType.PRO);

        return bd;
    }

    /** Invalidate the cache for an artisan (on review, job complete, etc.). */
    public void invalidateCache(Long artisanId) {
        scoreCache.remove(artisanId);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  COMPONENT SCORES (each 0–100)
    // ════════════════════════════════════════════════════════════════════════

    // ── A. Subscription Tier (40%) ──────────────────────────────────────────
    private double computeSubscriptionScore(User artisan) {
        Subscription.PlanType plan = getActivePlan(artisan);
        return switch (plan) {
            case PRO   -> SCORE_PRO;
            case BASIC -> SCORE_BASIC;
            case FREE  -> SCORE_FREE;
        };
    }

    // ── B. Ratings & Reviews (20%) ──────────────────────────────────────────
    private double computeRatingsScore(User artisan) {
        Double avgRating = reviewRepository.getAverageRatingByUserId(artisan.getId());
        Integer reviewCount = reviewRepository.getReviewCountByUserId(artisan.getId());

        if (avgRating == null) avgRating = 0.0;
        if (reviewCount == null) reviewCount = 0;

        // Rating component (0-5 → 0-70)
        double ratingPart = (avgRating / 5.0) * 70;

        // Volume bonus (log scale, capped at 30): 1 review = ~0, 10 = ~20, 50+ = ~30
        double volumePart = reviewCount > 0
                ? Math.min(30, Math.log10(reviewCount) * 17.5)
                : 0;

        return ratingPart + volumePart;
    }

    // ── C. Performance Metrics (15%) ────────────────────────────────────────
    private double computePerformanceScore(User artisan) {
        long totalAssigned = jobRepository.countTotalAssignedJobs(artisan.getId());
        if (totalAssigned == 0) return 20; // New artisans get baseline score

        int completedJobs = artisan.getTotalJobsCompleted() != null ? artisan.getTotalJobsCompleted() : 0;

        // Completion rate (0-50)
        double completionRate = (double) completedJobs / totalAssigned;
        double completionPart = completionRate * 50;

        // Volume bonus (log scale, 0-30): 5 jobs = ~12, 20 = ~22, 100+ = ~30
        double volumePart = completedJobs > 0
                ? Math.min(30, Math.log10(completedJobs) * 15)
                : 0;

        // On-time bonus (0-20)
        long onTimeJobs = jobRepository.countJobsWithArrivalTracking(artisan.getId());
        double onTimePart = completedJobs > 0
                ? ((double) onTimeJobs / completedJobs) * 20
                : 10;

        return Math.min(100, completionPart + volumePart + onTimePart);
    }

    // ── D. Engagement Metrics (15%) ─────────────────────────────────────────
    private double computeEngagementScore(User artisan) {
        LocalDateTime since30d = LocalDateTime.now().minusDays(30);

        long profileViews = leadTrackingRepository.countByArtisanIdAndLeadTypeSince(
                artisan.getId(), LeadTracking.LeadType.PROFILE_VIEW, since30d);
        long callClicks = leadTrackingRepository.countByArtisanIdAndLeadTypeSince(
                artisan.getId(), LeadTracking.LeadType.CALL_CLICK, since30d);
        long whatsappClicks = leadTrackingRepository.countByArtisanIdAndLeadTypeSince(
                artisan.getId(), LeadTracking.LeadType.WHATSAPP_CLICK, since30d);

        // Profile views (0-40): 50 views → 40 pts
        double viewPart = Math.min(40, profileViews * 0.8);

        // Call/WA conversion (0-40): each click worth 4 pts, cap 40
        double conversionPart = Math.min(40, (callClicks + whatsappClicks) * 4);

        // Listing view bonus (0-20): sum of all listing view counts
        long totalListingViews = listingRepository.findByArtisanIdOrderByCreatedAtDesc(artisan.getId())
                .stream()
                .mapToInt(l -> l.getViewCount() != null ? l.getViewCount() : 0)
                .sum();
        double listingViewPart = Math.min(20, totalListingViews * 0.2);

        return Math.min(100, viewPart + conversionPart + listingViewPart);
    }

    // ── E. Recency & Activity (10%) ─────────────────────────────────────────
    private double computeRecencyScore(User artisan) {
        // Check last updated time on user profile
        LocalDateTime lastUpdate = artisan.getUpdatedAt();
        if (lastUpdate == null) lastUpdate = artisan.getCreatedAt();

        // Also check latest listing update
        List<Listing> listings = listingRepository.findByArtisanIdOrderByCreatedAtDesc(artisan.getId());
        if (!listings.isEmpty()) {
            LocalDateTime latestListing = listings.get(0).getUpdatedAt();
            if (latestListing != null && (lastUpdate == null || latestListing.isAfter(lastUpdate))) {
                lastUpdate = latestListing;
            }
        }

        if (lastUpdate == null) return 10;

        long daysSinceActive = ChronoUnit.DAYS.between(lastUpdate, LocalDateTime.now());
        if (daysSinceActive <= 1) return 100;
        if (daysSinceActive <= 3) return 85;
        if (daysSinceActive <= 7) return 70;
        if (daysSinceActive <= 14) return 50;
        if (daysSinceActive <= 30) return 30;
        return 10;
    }

    // ════════════════════════════════════════════════════════════════════════
    //  HELPERS
    // ════════════════════════════════════════════════════════════════════════

    private Subscription.PlanType getActivePlan(User artisan) {
        // ACTIVE takes priority
        Optional<Subscription> active = subscriptionRepository
                .findByArtisanIdAndStatus(artisan.getId(), Subscription.SubscriptionStatus.ACTIVE);
        if (active.isPresent()) return active.get().getPlanType();

        // Artisan is in grace period — retain ranking as if still ACTIVE
        Optional<Subscription> grace = subscriptionRepository
                .findByArtisanIdAndStatus(artisan.getId(), Subscription.SubscriptionStatus.GRACE_PERIOD);
        if (grace.isPresent()) return grace.get().getPlanType();

        return Subscription.PlanType.FREE;
    }
}
