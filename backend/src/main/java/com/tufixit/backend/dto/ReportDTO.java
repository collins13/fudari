package com.tufixit.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

public class ReportDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateReportRequest {
        @NotNull(message = "Artisan ID is required")
        private Long reportedArtisanId;

        @NotNull(message = "Reason is required")
        private String reason;

        private String description;

        private String reporterPhone;
        private String reporterEmail;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReportResponse {
        private Long id;
        private Long reportedArtisanId;
        private String reportedArtisanName;
        private String reason;
        private String description;
        private String status;
        private String adminAction;
        private String adminNotes;
        private LocalDateTime createdAt;
        private LocalDateTime resolvedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AdminActionRequest {
        @NotNull(message = "Action is required")
        private String action; // WARNING, SUSPENSION, BAN, DISMISS

        private String adminNotes;
    }
}
