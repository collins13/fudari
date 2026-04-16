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

        /**
         * WEEKLY or MONTHLY. Defaults to MONTHLY when not supplied.
         * Weekly billing is recommended for artisans with irregular income.
         */
        private Subscription.BillingCycle billingCycle;

        /**
         * M-Pesa transaction ID — required for BASIC and PRO plans.
         * The frontend must collect this from the user after they complete the STK Push payment.
         */
        private String mpesaTransactionId;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SubscriptionResponse {
        private Long id;
        private Long artisanId;
        private String planType;
        private String billingCycle;
        private int priceKes;
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
        private int monthlyPrice;
        private int weeklyPrice;
        private int maxListings;
        private boolean featured;
        private int rankingPriority;
        private String[] features;
    }

    /** Request to initiate STK Push for subscription payment */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class InitiatePaymentRequest {
        @NotNull(message = "Plan type is required")
        private Subscription.PlanType planType;

        private Subscription.BillingCycle billingCycle;

        /** Phone to send STK prompt to. Falls back to artisan's registered phone. */
        private String phoneNumber;
    }

    /** Response after STK Push is sent */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StkInitiateResponse {
        private String checkoutRequestId;
        private String merchantRequestId;
        private int amount;
        private String phoneNumber;
    }

    /** Request to verify payment and activate subscription */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class VerifyPaymentRequest {
        @NotBlank(message = "Checkout request ID is required")
        private String checkoutRequestId;

        @NotNull(message = "Plan type is required")
        private Subscription.PlanType planType;

        private Subscription.BillingCycle billingCycle;
    }
}
