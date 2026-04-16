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
    }

    // ── Artisan Approval ─────────────────────────────────────────────────────

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ApproveArtisanRequest {
        private Long artisanId;
        private String note;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ApprovedArtisanResponse {
        private Long approvalId;
        private Long artisanId;
        private String artisanName;
        private String skillType;
        private Double rating;
        private String note;
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
