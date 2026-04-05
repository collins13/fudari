package com.tufixit.backend.dto;

import com.tufixit.backend.entity.Listing;
import com.tufixit.backend.entity.WorkerSkill;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

public class ListingDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateListingRequest {
        @NotBlank(message = "Title is required")
        private String title;

        private Long categoryId;

        @NotNull(message = "Skill type is required")
        private WorkerSkill.SkillType skillType;

        private String description;

        private String priceStart;

        private String location;

        private Double latitude;

        private Double longitude;

        private String images; // JSON array
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UpdateListingRequest {
        private String title;
        private Long categoryId;
        private WorkerSkill.SkillType skillType;
        private String description;
        private String priceStart;
        private String location;
        private Double latitude;
        private Double longitude;
        private String images;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ListingResponse {
        private Long id;
        private Long artisanId;
        private String artisanName;
        private String artisanPhone;
        private String artisanImage;
        private String artisanVettingLevel;
        private Boolean artisanVerified;
        private String title;
        private Long categoryId;
        private String categoryName;
        private String skillType;
        private String skillTypeLabel;
        private String description;
        private String priceStart;
        private String location;
        private Double latitude;
        private Double longitude;
        private String images;
        private String status;
        private Boolean isActive;
        private Integer viewCount;
        private Double artisanRating;
        private Integer artisanTotalReviews;
        private Integer artisanJobsCompleted;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }
}
