package com.tufixit.backend.dto;

import com.tufixit.backend.entity.WorkerSkill;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

public class ServiceOfferingDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ServiceOfferingRequest {
        @NotBlank(message = "Service name is required")
        @Size(max = 120)
        private String name;

        @Size(max = 140)
        private String slug;

        @NotBlank(message = "Skill type is required")
        private String skillType;

        private String description;

        @Builder.Default
        private Set<String> synonyms = new LinkedHashSet<>();

        private Integer priceFromKes;
        private Integer priceToKes;
        private Boolean isEmergency;
        private Boolean isActive;
        private Boolean indexable;
        private Integer sortOrder;

        @Size(max = 160)
        private String seoTitle;

        private String seoDescription;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ServiceOfferingResponse {
        private Long id;
        private String name;
        private String slug;
        private WorkerSkill.SkillType skillType;
        private String description;
        private Set<String> synonyms;
        private Integer priceFromKes;
        private Integer priceToKes;
        private Boolean isEmergency;
        private Boolean isActive;
        private Boolean indexable;
        private Integer sortOrder;
        private String seoTitle;
        private String seoDescription;
        /** Live count of approved, active workers offering this service. */
        private Integer artisanCount;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }
}
