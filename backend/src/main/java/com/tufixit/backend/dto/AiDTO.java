package com.tufixit.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

public class AiDTO {

    // ── Feature 1: Smart Job Description ─────────────────────────────────────

    /** Request — deserialized by Jackson, no @Builder needed */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EnhanceDescriptionRequest {
        @NotBlank(message = "description is required")
        @Size(min = 5, max = 1000)
        private String description;
        private String location;
        private String skillType;
    }

    /** Response — constructed in Java code, @Builder is fine */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EnhanceDescriptionResponse {
        private String enhancedDescription;
        private String suggestedSkillType;
        private int estimatedDurationHours;
        private List<String> likelyMaterials;
        private List<String> clarifyingQuestions;
    }

    // ── Feature 2: Price Estimator ────────────────────────────────────────────

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PriceEstimateRequest {
        @NotBlank(message = "skillType is required")
        private String skillType;
        private String location;
        private String description;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PriceEstimateResponse {
        private int minPrice;
        private int maxPrice;
        private int medianPrice;
        private int sampleSize;
        private String currency;
        private String summary;
    }

    // ── Feature 3: AI Chat Assistant ─────────────────────────────────────────

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatAssistantRequest {
        @NotBlank
        private String artisanFirstName;
        private String artisanSkill;
        private String conversationHistory;
        @NotBlank
        private String customerLastMessage;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ChatAssistantResponse {
        private String customerMessage;
        private String artisanSummary;
        private String followUpQuestion;
    }

    // ── Feature 4: Artisan Match Scoring ─────────────────────────────────────

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MatchedArtisan {
        private Long artisanId;
        private String name;
        private String profileImage;
        private String skillType;
        private double trustScore;
        private String locationName;
        private Double distanceKm;
        private double matchScore;
        private String matchReason;
        private Integer startingRate;
    }

    // ── Feature 5: Smart Pricing Engine (Upgraded) ───────────────────────────

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SmartPriceResponse {
        private int minPrice;
        private int maxPrice;
        private int medianPrice;
        private int sampleSize;
        private String currency;
        private String summary;
        private double confidencePercent;
        private String urgencySurcharge;
        private String locationFactor;
        private String ratingPremium;
        private List<PriceBreakdown> breakdown;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PriceBreakdown {
        private String factor;
        private String impact;
        private String detail;
    }

    // ── Feature 6: Job Scoping Chatbot ───────────────────────────────────────

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class JobScopingRequest {
        @NotBlank(message = "message is required")
        @Size(max = 2000)
        private String message;
        private String sessionId;
        private List<ScopingMessage> history;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ScopingMessage {
        private String role;
        private String content;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class JobScopingResponse {
        private String reply;
        private String sessionId;
        private boolean isComplete;
        private JobSpec jobSpec;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class JobSpec {
        private String suggestedSkillType;
        private String enhancedDescription;
        private String urgency;
        private int estimatedDurationHours;
        private int estimatedMinPrice;
        private int estimatedMaxPrice;
        private List<String> likelyMaterials;
        private String summary;
    }

    // ── Feature 7: Predictive Match (Upgraded) ───────────────────────────────

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PredictiveMatchResponse {
        private List<MatchedArtisan> bestMatch;
        private List<MatchedArtisan> fastestAvailable;
        private List<MatchedArtisan> bestValue;
    }

    // ── Feature 8: Trust Score AI ────────────────────────────────────────────

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TrustScoreResponse {
        private Long artisanId;
        private String name;
        private double overallScore;
        private String tier;
        private TrustBreakdown breakdown;
        private List<String> badges;
        private String summary;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TrustBreakdown {
        private double ratingScore;
        private double completionRate;
        private double onTimeRate;
        private double responseRate;
        private double reviewSentiment;
        private double disputeScore;
        private int totalJobsCompleted;
        private int totalReviews;
        private double averageRating;
    }

    // ── Feature 9: Quality Verification ──────────────────────────────────────

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QualityVerifyRequest {
        private Long jobId;
        private List<String> beforeImages;
        private List<String> afterImages;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class QualityVerifyResponse {
        private Long jobId;
        private String verdict;
        private double confidencePercent;
        private String analysis;
        private List<String> observations;
        private boolean recommendAutoRelease;
        private List<String> flags;
    }

    // ── Feature 10: Demand Forecasting ───────────────────────────────────────

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DemandForecastResponse {
        private String skillType;
        private String location;
        private String period;
        private DemandTrend trend;
        private List<DemandInsight> insights;
        private PricingAdvice pricingAdvice;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DemandTrend {
        private int currentWeekJobs;
        private int previousWeekJobs;
        private double changePercent;
        private String direction;
        private int activeArtisans;
        private double supplyDemandRatio;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DemandInsight {
        private String type;
        private String title;
        private String description;
        private String icon;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PricingAdvice {
        private int suggestedMinRate;
        private int suggestedMaxRate;
        private String rationale;
        private String marketPosition;
    }
}
