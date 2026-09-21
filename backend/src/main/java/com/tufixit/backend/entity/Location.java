package com.tufixit.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Kenya geographic taxonomy: COUNTY -> TOWN -> AREA.
 *
 * One self-referencing table rather than three, because every tier carries the
 * same SEO payload and the landing pages treat them uniformly. `county` is
 * denormalised so "all providers in Nairobi County" is a single indexed lookup
 * instead of a recursive walk.
 */
@Entity
@Table(
        name = "locations",
        indexes = {
                @Index(name = "idx_location_slug", columnList = "slug"),
                @Index(name = "idx_location_type_active", columnList = "type, is_active"),
                @Index(name = "idx_location_parent", columnList = "parent_id"),
                @Index(name = "idx_location_county", columnList = "county_id"),
        })
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Location {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    /** Unique across counties and towns; for areas, unique within the parent. */
    @Column(nullable = false)
    private String slug;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private LocationType type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Location parent;

    /** The COUNTY row this location rolls up to. Self-referential for counties. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "county_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Location county;

    @Column
    private Double latitude;

    @Column
    private Double longitude;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "seo_title")
    private String seoTitle;

    @Column(name = "seo_description", columnDefinition = "TEXT")
    private String seoDescription;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    /** Admin kill-switch. Supply thresholds are applied on top of this. */
    @Column(nullable = false)
    @Builder.Default
    private Boolean indexable = true;

    @Column(name = "sort_order")
    @Builder.Default
    private Integer sortOrder = 0;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public enum LocationType {
        COUNTY, TOWN, AREA
    }
}
