package com.tufixit.backend.dto;

import com.tufixit.backend.entity.Job;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

public class BookingDTO {

    // ── Customer: Create Booking ──────────────────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CreateBookingRequest {

        @NotNull(message = "Artisan ID is required")
        private Long artisanId;

        @NotBlank(message = "Your name is required")
        @Size(max = 100)
        private String customerName;

        @NotBlank(message = "Phone number is required")
        @Pattern(regexp = "^(\\+254|0)[17]\\d{8}$", message = "Enter a valid Kenyan phone number")
        private String customerPhone;

        @NotBlank(message = "Location is required")
        private String customerLocation;

        @NotBlank(message = "Job description is required")
        @Size(min = 10, message = "Description must be at least 10 characters")
        private String jobDescription;

        @NotNull(message = "Urgency is required")
        private Job.UrgencyLevel urgency;

        /** Required when urgency = SCHEDULED */
        private LocalDateTime scheduledTime;

        /** Optional customer budget hint in KES */
        private Integer budget;
    }

    // ── Customer: Track Booking ───────────────────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class BookingTrackResponse {
        private Long jobId;
        private String bookingCode;
        private Job.JobStatus status;
        private String statusLabel;
        private String jobDescription;
        private String customerLocation;
        private String urgency;
        private LocalDateTime scheduledTime;
        private Integer customerBudget;

        // Artisan info — only revealed after ACCEPTED
        private Long artisanId;
        private String artisanName;
        private String artisanPhone;     // only shown when customer clicks "reveal"
        private String artisanLocation;
        private Double artisanRating;

        // Agreed price — shown after ACCEPTED
        private Integer agreedPrice;

        // PINs — shown only when status warrants it
        private String startPin;         // shown when status = ARRIVED
        private String completionPin;    // shown when status = IN_PROGRESS

        // Timeline
        private LocalDateTime createdAt;
        private LocalDateTime acceptedAt;
        private LocalDateTime arrivedAt;
        private LocalDateTime startedAt;
        private LocalDateTime completedAt;

        private String declineReason;
        private boolean canCancel;
        private boolean canRate;
    }

    // ── Customer: Cancel Booking ──────────────────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CancelBookingRequest {
        private String reason;
    }

    // ── Customer: Rate Booking ────────────────────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RateBookingRequest {

        @NotNull(message = "Rating is required")
        private Integer rating; // 1-5

        private String comment;
        private Boolean onTime;
        private Boolean priceFair;
        private Boolean wouldHireAgain;
    }

    // ── Customer: Report Issue ────────────────────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ReportIssueRequest {
        @NotBlank(message = "Reason is required")
        private String reason;
        private String description;
    }

    // ── Artisan: Accept Job ───────────────────────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AcceptJobRequest {

        @NotNull(message = "Price is required")
        private Integer price;

        /** Estimated arrival: IN_30_MIN, IN_1_HOUR, SCHEDULED */
        private String estimatedArrival;
    }

    // ── Artisan: Decline Job ──────────────────────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class DeclineJobRequest {
        @NotBlank(message = "Reason is required")
        private String reason; // TOO_FAR | BUDGET_TOO_LOW | NOT_MY_SKILL | ALREADY_BUSY
    }

    // ── Artisan: Counter-offer ────────────────────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CounterOfferRequest {
        @NotNull(message = "Counter price is required")
        private Integer counterPrice;
        private String message;
    }

    // ── Artisan: Arrive ───────────────────────────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ArriveRequest {
        private Double latitude;
        private Double longitude;
    }

    // ── Artisan: Enter START PIN ──────────────────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class StartJobRequest {
        @NotBlank(message = "START PIN is required")
        @Size(min = 4, max = 4, message = "PIN must be 4 digits")
        private String startPin;
    }

    // ── Artisan: Complete Job + Record Payment ────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CompleteJobRequest {
        @NotBlank(message = "COMPLETION PIN is required")
        @Size(min = 4, max = 4, message = "PIN must be 4 digits")
        private String completionPin;

        @NotNull(message = "Amount received is required")
        private Integer amountReceived;

        @NotNull(message = "Payment method is required")
        private Job.PaymentMethod paymentMethod;

        /** M-Pesa transaction ID (required when paymentMethod = MPESA) */
        private String transactionId;
    }

    // ── Artisan: Job Summary (list views) ────────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ArtisanJobSummary {
        private Long id;
        private String bookingCode;
        private String customerName;
        private String customerLocation;
        private String jobDescription;
        private Job.JobStatus status;
        private String statusLabel;
        private Job.UrgencyLevel urgency;
        private LocalDateTime scheduledTime;
        private Integer customerBudget;
        private Integer agreedPrice;
        private LocalDateTime createdAt;
        private LocalDateTime acceptedAt;
        private LocalDateTime arrivedAt;
        private LocalDateTime startedAt;
        private LocalDateTime completedAt;
        private String timeAgo;
    }

    // ── Artisan: Full Job Detail ──────────────────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ArtisanJobDetail {
        private Long id;
        private String bookingCode;
        private String customerName;
        private String customerPhone;   // revealed after acceptance
        private String customerLocation;
        private String jobDescription;
        private Job.JobStatus status;
        private String statusLabel;
        private Job.UrgencyLevel urgency;
        private LocalDateTime scheduledTime;
        private Integer customerBudget;
        private Integer agreedPrice;
        private Boolean paymentRecorded;
        private Job.PaymentMethod paymentMethod;
        private String paymentTransactionId;
        private Integer paymentAmount;
        private String declineReason;
        private String startPin;
        private String completionPin;
        private LocalDateTime createdAt;
        private LocalDateTime acceptedAt;
        private LocalDateTime arrivedAt;
        private LocalDateTime startedAt;
        private LocalDateTime completedAt;
    }

    // ── Artisan: Payment Record (for /dashboard/payments) ────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PaymentRecord {
        private Long jobId;
        private String bookingCode;
        private String customerName;
        private Integer amountReceived;
        private Job.PaymentMethod paymentMethod;
        private String transactionId;
        private LocalDateTime completedAt;
        private Boolean paymentRecorded;
    }

    // ── Admin: Full Job View ──────────────────────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AdminJobView {
        private Long id;
        private String bookingCode;
        private String customerName;
        private String customerPhone;
        private String customerLocation;
        private String jobDescription;
        private Job.JobStatus status;
        private String statusLabel;
        private Job.UrgencyLevel urgency;
        private LocalDateTime scheduledTime;
        private Integer customerBudget;
        private Integer agreedPrice;

        // Artisan
        private Long artisanId;
        private String artisanName;
        private String artisanPhone;
        private String artisanSubscriptionTier;

        // Payment
        private Boolean paymentRecorded;
        private Job.PaymentMethod paymentMethod;
        private String paymentTransactionId;
        private Integer paymentAmount;

        // Timeline
        private LocalDateTime createdAt;
        private LocalDateTime acceptedAt;
        private LocalDateTime arrivedAt;
        private LocalDateTime startedAt;
        private LocalDateTime completedAt;

        private String declineReason;
    }

    // ── Admin: Resolve Dispute ────────────────────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ResolveDisputeRequest {
        /** NO_ACTION | WARN_ARTISAN | SUSPEND_ARTISAN | REFUND_SUBSCRIPTION */
        @NotBlank(message = "Action is required")
        private String action;
        private String note;
    }

    // ── Generic API response ──────────────────────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class BookingResponse {
        private boolean success;
        private String message;
        private Object data;
    }
}
