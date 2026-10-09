package com.tufixit.backend.dto;

import com.tufixit.backend.entity.Location;
import com.tufixit.backend.entity.WorkerSkill;
import lombok.*;

import java.util.Set;

public class TaxonomyDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LocationResponse {
        private Long id;
        private String name;
        private String slug;
        private Location.LocationType type;
        private String parentSlug;
        private String countySlug;
        private String countyName;
        private Double latitude;
        private Double longitude;
        private String description;
        private String seoTitle;
        private String seoDescription;
        private Boolean indexable;
        /** Live count of approved, active providers resolving to this location. */
        private Integer providerCount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SkillResponse {
        private Long id;
        private WorkerSkill.SkillType skillType;
        private String name;
        private String pluralName;
        private String slug;
        private String description;
        private String categorySlug;
        private String categoryName;
        private String seoTitleTemplate;
        private String seoDescriptionTemplate;
        private Set<String> keywords;
        private Set<String> synonyms;
        private Set<String> swahiliKeywords;
        private Boolean indexable;
        private Integer providerCount;
    }

    /** Provider counts keyed by location slug, for a given skill. */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SkillLocationCount {
        private String skillSlug;
        private String locationSlug;
        private String locationName;
        private Location.LocationType locationType;
        private String parentSlug;
        private String countySlug;
        private String townSlug;
        private String areaSlug;
        private Integer uniqueProviderCount;
        private Integer providerCount;
        private Boolean indexable;
    }
}
