package com.tufixit.backend.dto;

import com.tufixit.backend.entity.Subscription;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

public class SubscriptionDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateSubscriptionRequest {
        @NotNull(message = "Plan type is required")
        private Subscription.PlanType planType;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SubscriptionResponse {
        private Long id;
        private Long artisanId;
        private String planType;
        private LocalDateTime startDate;
        private LocalDateTime endDate;
        private String status;
        private Boolean autoRenew;
        private int maxListings;
        private boolean featured;
        private int rankingPriority;
        private LocalDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PlanInfo {
        private String name;
        private int price;
        private int maxListings;
        private boolean featured;
        private int rankingPriority;
        private String[] features;
    }
}
