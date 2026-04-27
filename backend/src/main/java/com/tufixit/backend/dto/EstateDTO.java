package com.tufixit.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

public class EstateDTO {

    // ── Create / Update ──────────────────────────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CreateEstateRequest {

        @NotBlank(message = "Estate name is required")
        @Size(max = 150)
        private String name;

        @NotBlank(message = "Area is required")
        @Size(max = 100)
        private String area;

        private Double latitude;
        private Double longitude;
        private Integer unitCount;

        @Size(max = 100)
        private String managerName;
        @Size(max = 20)
        private String managerPhone;
        @Size(max = 150)
        private String managerEmail;

        private Integer monthlyFee;
        private LocalDateTime contractStart;
        private LocalDateTime contractEnd;

        // Branding
        @Size(max = 10)
        private String brandPrimaryColor;
        @Size(max = 500)
        private String brandLogoUrl;
        @Size(max = 300)
        private String brandWelcomeMessage;

        private Double commissionRate;
    }

    // ── Response ─────────────────────────────────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class EstateResponse {
        private Long id;
        private String name;
        private String slug;
        private String area;
        private Double latitude;
        private Double longitude;
        private Integer unitCount;
        private String managerName;
        private String managerPhone;
        private String managerEmail;
        private Integer monthlyFee;
        private Boolean isActive;
        private String bookingUrl;
        private LocalDateTime contractStart;
        private LocalDateTime contractEnd;
        private LocalDateTime createdAt;

        // Branding (used by frontend TenantContext)
        private String brandPrimaryColor;
        private String brandLogoUrl;
        private String brandWelcomeMessage;

        // Short code for WhatsApp
        private String shortCode;
        private String whatsappStartCommand;

        private Double commissionRate;
    }

    // ── Artisan Approval ─────────────────────────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ApproveArtisanRequest {
        private Long artisanId;
        private String note;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ApprovalDecisionRequest {
        @NotBlank
        private String decision; // APPROVED or REJECTED
        private String rejectionReason;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ApprovedArtisanResponse {
        private Long approvalId;
        private Long artisanId;
        private String artisanName;
        private String skillType;
        private Double rating;
        private String note;
        private String approvalStatus;
        private String rejectionReason;
        private LocalDateTime approvedAt;
    }

    // ── Estate Analytics ─────────────────────────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class EstateAnalytics {
        private Long estateId;
        private String estateName;
        private long totalBookings;
        private long completedBookings;
        private long pendingBookings;
        private long cancelledBookings;
        private double avgRating;
        private int approvedArtisans;

        // Service Health
        private long activeJobs;
        private long totalJobValue;
        private double estateCommission;

        /** Top artisans by completed jobs for this estate */
        private List<TopArtisan> topArtisans;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TopArtisan {
        private Long artisanId;
        private String name;
        private String skillType;
        private long completedJobs;
        private double avgRating;
    }
}
