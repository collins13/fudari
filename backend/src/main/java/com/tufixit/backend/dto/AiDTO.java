package com.tufixit.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

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
}
