package com.tufixit.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

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
        private LocalDateTime createdAt;
    }
}
