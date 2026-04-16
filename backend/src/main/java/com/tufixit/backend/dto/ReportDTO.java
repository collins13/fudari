package com.tufixit.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Email;
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
        @Size(max = 100)
        private String reason;

        @Size(max = 2000)
        private String description;

        @Size(max = 20)
        private String reporterPhone;
        @Email(message = "Invalid email")
        @Size(max = 150)
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
