package com.tufixit.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;

import com.tufixit.backend.entity.WorkerSkill;

public class CategoryDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateCategoryRequest {
        @NotBlank(message = "Name is required")
        private String name;

        private String icon;
        private String description;
        private Integer sortOrder;
        private String slug;
        private Boolean indexable;
        private String seoTitle;
        private String seoDescription;
        private Set<WorkerSkill.SkillType> skillTypes;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UpdateCategoryRequest {
        private String name;
        private String icon;
        private String description;
        private Boolean isActive;
        private Integer sortOrder;
        private String slug;
        private Boolean indexable;
        private String seoTitle;
        private String seoDescription;
        private Set<WorkerSkill.SkillType> skillTypes;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CategoryResponse {
        private Long id;
        private String name;
        private String icon;
        private String description;
        private Boolean isActive;
        private Integer sortOrder;
        private String slug;
        private Boolean indexable;
        private String seoTitle;
        private String seoDescription;
        private Set<WorkerSkill.SkillType> skillTypes;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        /** Live count of active artisans in this category — populated by /api/categories/stats */
        private Integer artisanCount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PlatformStats {
        private long totalArtisans;
        private long totalCompletedJobs;
        private long totalCategories;
        private long totalListings;
    }
}
