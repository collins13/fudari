package com.tufixit.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * A specific bookable service under a trade — "Drain Unblocking" under PLUMBER.
 *
 * Sits below {@link WorkerSkill.SkillType}, which stays an enum because pricing,
 * demand forecasting, AI allow-lists and the WhatsApp bot all key off it.
 */
@Entity
@Table(name = "service_offerings")
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceOffering {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String slug;

    /** Parent trade. Every offering belongs to exactly one skill type. */
    @Enumerated(EnumType.STRING)
    @Column(name = "skill_type", nullable = false)
    private WorkerSkill.SkillType skillType;

    @Column(columnDefinition = "TEXT")
    private String description;

    /**
     * Customer phrasings that should resolve to this service ("blocked drain",
     * "choked sink"). Feeds symptom matching and free-text search.
     *
     * Eager because both DTO mapping and symptom matching read it outside a
     * transaction, and the table is small.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "service_offering_synonyms", joinColumns = @JoinColumn(name = "service_offering_id"))
    @Column(name = "synonym", nullable = false)
    @Builder.Default
    private Set<String> synonyms = new LinkedHashSet<>();

    @Column(name = "price_from_kes")
    private Integer priceFromKes;

    @Column(name = "price_to_kes")
    private Integer priceToKes;

    @Column(name = "is_emergency")
    @Builder.Default
    private Boolean isEmergency = false;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(nullable = false, columnDefinition = "boolean default true")
    @Builder.Default
    private Boolean indexable = true;

    @Column
    @Builder.Default
    private Integer sortOrder = 0;

    @Column
    private String seoTitle;

    @Column(columnDefinition = "TEXT")
    private String seoDescription;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
