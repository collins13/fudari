package com.tufixit.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

public class PublicReviewDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreatePublicReviewRequest {
        @NotNull(message = "Artisan ID is required")
        private Long artisanId;

        @NotNull(message = "Rating is required")
        @Min(1) @Max(5)
        private Integer rating;

        private String comment;

        private String reviewerName;

        private String reviewerPhone;

        private String reviewerEmail;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PublicReviewResponse {
        private Long id;
        private Long artisanId;
        private Integer rating;
        private String comment;
        private String reviewerName;
        private Boolean isVerified;
        private LocalDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class VerifyReviewRequest {
        private String verificationCode;
    }
}
