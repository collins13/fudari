package com.tufixit.backend.service;

import com.tufixit.backend.dto.AiDTO;
import com.tufixit.backend.entity.PublicReview;
import com.tufixit.backend.entity.Review;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * TrustScoreService — AI-Powered Trust Score System
 *
 * Computes a comprehensive trust score for artisans using:
 *   - Average rating (25% weight)
 *   - Completion rate (20% weight)
 *   - On-time/responsiveness (15% weight)
 *   - Review sentiment analysis (15% weight)
 *   - Dispute rate (15% weight)
 *   - Job volume & experience (10% weight)
 *
 * Generates tiered badges and human-readable trust summaries.
 * Sentiment analysis uses keyword-based NLP (no external API needed).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TrustScoreService {

    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;
    private final PublicReviewRepository publicReviewRepository;
    private final JobRepository jobRepository;
    private final ReportRepository reportRepository;

    // Positive sentiment keywords common in Kenyan service reviews
    private static final Set<String> POSITIVE_WORDS = Set.of(
            "excellent", "great", "good", "amazing", "wonderful", "professional",
            "fast", "quick", "reliable", "trustworthy", "honest", "skilled",
            "clean", "friendly", "polite", "recommended", "best", "perfect",
            "quality", "satisfied", "happy", "punctual", "neat", "thorough",
            "affordable", "fair", "value", "awesome", "brilliant", "superb"
    );

    private static final Set<String> NEGATIVE_WORDS = Set.of(
            "bad", "terrible", "awful", "rude", "late", "slow", "expensive",
            "overcharged", "unprofessional", "dirty", "lazy", "dishonest",
            "scam", "fraud", "theft", "steal", "lie", "worst", "poor",
            "disappointing", "unreliable", "careless", "damage", "broke",
            "never", "avoid", "waste", "horrible", "incompetent"
    );

    public AiDTO.TrustScoreResponse computeTrustScore(Long artisanId) {
        User artisan = userRepository.findById(artisanId)
                .orElseThrow(() -> new IllegalArgumentException("Artisan not found: " + artisanId));

        if (artisan.getRole() != User.UserRole.WORKER) {
            throw new IllegalArgumentException("User is not an artisan/worker");
        }

        // Gather all data points
        Double avgRating = reviewRepository.getAverageRatingByUserId(artisanId);
        Integer reviewCount = reviewRepository.getReviewCountByUserId(artisanId);

        // Also factor in public reviews
        Double pubAvg = publicReviewRepository.getAverageRatingByArtisanId(artisanId);
        Integer pubCount = publicReviewRepository.getReviewCountByArtisanId(artisanId);

        // Combine both review sources
        double combinedAvg = 0.0;
        int totalReviewCount = 0;
        if (avgRating != null && reviewCount != null && reviewCount > 0) {
            combinedAvg += avgRating * reviewCount;
            totalReviewCount += reviewCount;
        }
        if (pubAvg != null && pubCount != null && pubCount > 0) {
            combinedAvg += pubAvg * pubCount;
            totalReviewCount += pubCount;
        }
        combinedAvg = totalReviewCount > 0 ? combinedAvg / totalReviewCount : 0.0;

        // Job stats
        int totalCompleted = artisan.getTotalJobsCompleted() != null ? artisan.getTotalJobsCompleted() : 0;
        long totalAssigned = jobRepository.countTotalAssignedJobs(artisanId);
        long disputedJobs = jobRepository.countDisputedJobsForWorker(artisanId);
        long jobsWithArrival = jobRepository.countJobsWithArrivalTracking(artisanId);

        // Report count
        long pendingReports = reportRepository.countByReportedArtisanIdAndStatus(
                artisanId, com.tufixit.backend.entity.Report.ReportStatus.PENDING);

        // ── Compute individual scores ────────────────────────────────────────

        // 1. Rating score (0-25): 5.0 = 25, 0.0 = 0
        double ratingScore = (combinedAvg / 5.0) * 25.0;

        // 2. Completion rate (0-20): completed / total assigned
        double completionRate = totalAssigned > 0 ? (double) totalCompleted / totalAssigned : 0.5;
        double completionScore = completionRate * 20.0;

        // 3. On-time / responsiveness (0-15)
        double onTimeRate = totalCompleted > 0 ? (double) jobsWithArrival / Math.max(totalCompleted, 1) : 0.5;
        double onTimeScore = onTimeRate * 15.0;

        // 4. Review sentiment (0-15)
        double sentimentScore = computeSentimentScore(artisanId) * 15.0;

        // 5. Dispute rate (0-15): fewer disputes = higher score
        double disputeRate = totalAssigned > 0 ? (double) disputedJobs / totalAssigned : 0.0;
        double disputeScore = Math.max(0, (1.0 - disputeRate * 5.0)) * 15.0; // each dispute penalizes heavily
        // Deduct for pending reports too
        disputeScore = Math.max(0, disputeScore - pendingReports * 2.0);

        // 6. Experience / volume (0-10): cap at 100 jobs
        double volumeScore = Math.min(10.0, (totalCompleted / 100.0) * 10.0);

        // ── Overall score ────────────────────────────────────────────────────
        double overall = ratingScore + completionScore + onTimeScore + sentimentScore + disputeScore + volumeScore;
        overall = Math.max(0, Math.min(100, overall)); // clamp 0-100

        // ── Tier assignment ──────────────────────────────────────────────────
        String tier;
        if (overall >= 85) tier = "PLATINUM";
        else if (overall >= 70) tier = "GOLD";
        else if (overall >= 55) tier = "SILVER";
        else if (overall >= 35) tier = "BRONZE";
        else tier = "NEW";

        // ── Badges ───────────────────────────────────────────────────────────
        List<String> badges = new ArrayList<>();
        if (combinedAvg >= 4.8 && totalReviewCount >= 10) badges.add("Top Rated");
        if (completionRate >= 0.95 && totalCompleted >= 20) badges.add("Reliable Pro");
        if (onTimeRate >= 0.90 && totalCompleted >= 10) badges.add("Always On Time");
        if (disputeRate == 0.0 && totalCompleted >= 10) badges.add("Zero Disputes");
        if (totalCompleted >= 50) badges.add("Experienced");
        if (totalCompleted >= 100) badges.add("Master Artisan");
        if (artisan.getVettingLevel() == User.VettingLevel.PRO) badges.add("Verified Pro");
        else if (artisan.getVettingLevel() == User.VettingLevel.VERIFIED) badges.add("ID Verified");

        // ── Summary ──────────────────────────────────────────────────────────
        String summary = buildSummary(artisan, overall, tier, totalCompleted, combinedAvg, completionRate);

        // ── Build response ───────────────────────────────────────────────────
        AiDTO.TrustBreakdown breakdown = AiDTO.TrustBreakdown.builder()
                .ratingScore(Math.round(ratingScore * 10.0) / 10.0)
                .completionRate(Math.round(completionRate * 1000.0) / 10.0) // percentage
                .onTimeRate(Math.round(onTimeRate * 1000.0) / 10.0)
                .responseRate(Math.round(onTimeRate * 1000.0) / 10.0) // same proxy for now
                .reviewSentiment(Math.round(sentimentScore / 15.0 * 1000.0) / 10.0) // percentage
                .disputeScore(Math.round(disputeScore * 10.0) / 10.0)
                .totalJobsCompleted(totalCompleted)
                .totalReviews(totalReviewCount)
                .averageRating(Math.round(combinedAvg * 10.0) / 10.0)
                .build();

        return AiDTO.TrustScoreResponse.builder()
                .artisanId(artisanId)
                .name(artisan.getFirstName() + " " + artisan.getLastName())
                .overallScore(Math.round(overall * 10.0) / 10.0)
                .tier(tier)
                .breakdown(breakdown)
                .badges(badges)
                .summary(summary)
                .build();
    }

    // ── Sentiment analysis (keyword-based NLP) ───────────────────────────────

    private double computeSentimentScore(Long artisanId) {
        List<String> allComments = new ArrayList<>();

        // Internal reviews
        List<Review> reviews = reviewRepository.findReviewsWithComments(artisanId);
        for (Review r : reviews) {
            if (r.getComment() != null) allComments.add(r.getComment());
        }

        // Public reviews
        List<PublicReview> pubReviews = publicReviewRepository.findReviewsWithComments(artisanId);
        for (PublicReview r : pubReviews) {
            if (r.getComment() != null) allComments.add(r.getComment());
        }

        if (allComments.isEmpty()) return 0.5; // neutral default

        int totalPositive = 0;
        int totalNegative = 0;

        for (String comment : allComments) {
            String lower = comment.toLowerCase();
            String[] words = lower.split("\\W+");
            for (String word : words) {
                if (POSITIVE_WORDS.contains(word)) totalPositive++;
                if (NEGATIVE_WORDS.contains(word)) totalNegative++;
            }
        }

        int total = totalPositive + totalNegative;
        if (total == 0) return 0.6; // slightly positive default (no sentiment words found)

        return (double) totalPositive / total; // 0.0 (all negative) to 1.0 (all positive)
    }

    // ── Summary builder ──────────────────────────────────────────────────────

    private String buildSummary(User artisan, double score, String tier,
                                 int totalJobs, double avgRating, double completionRate) {
        String name = artisan.getFirstName();
        StringBuilder sb = new StringBuilder();

        sb.append(String.format("%s is a %s-tier artisan", name, tier.toLowerCase()));

        if (totalJobs > 0) {
            sb.append(String.format(" with %d completed jobs", totalJobs));
        }

        if (avgRating > 0) {
            sb.append(String.format(" and a %.1f/5 average rating", avgRating));
        }

        sb.append(". ");

        if (completionRate >= 0.95) {
            sb.append("Highly reliable — completes virtually every job accepted. ");
        } else if (completionRate >= 0.80) {
            sb.append("Good track record with most jobs completed successfully. ");
        }

        if (score >= 85) {
            sb.append("One of the top-performing artisans on the platform.");
        } else if (score >= 70) {
            sb.append("A trusted and dependable professional.");
        } else if (score >= 55) {
            sb.append("Building a solid reputation on the platform.");
        } else {
            sb.append("Growing their presence on FUDARI.");
        }

        return sb.toString();
    }
}
