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
 * SEO and display metadata for a {@link WorkerSkill.SkillType}.
 *
 * The enum stays the source of truth for behaviour (pricing, matching, AI
 * allow-lists); this table carries everything an admin needs to tune without a
 * deploy — plural noun, slug, synonyms, Swahili terms and metadata templates.
 */
@Entity
@Table(
        name = "skill_metadata",
        indexes = {
                @Index(name = "idx_skill_metadata_slug", columnList = "slug"),
                @Index(name = "idx_skill_metadata_active", columnList = "is_active"),
        })
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SkillMetadata {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "skill_type", nullable = false, unique = true, length = 48)
    private WorkerSkill.SkillType skillType;

    @Column(nullable = false)
    private String name;

    /** Heading noun: "Plumbers". Drives the H1 and the URL. */
    @Column(name = "plural_name", nullable = false)
    private String pluralName;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Category category;

    /** Supports {skill}, {plural}, {location} placeholders. */
    @Column(name = "seo_title_template")
    private String seoTitleTemplate;

    @Column(name = "seo_description_template", columnDefinition = "TEXT")
    private String seoDescriptionTemplate;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "skill_metadata_keywords", joinColumns = @JoinColumn(name = "skill_metadata_id"))
    @Column(name = "keyword", nullable = false)
    @Builder.Default
    private Set<String> keywords = new LinkedHashSet<>();

    /** Alternate English phrasings. Canonicalised to the main skill page, never given their own page. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "skill_metadata_synonyms", joinColumns = @JoinColumn(name = "skill_metadata_id"))
    @Column(name = "synonym", nullable = false)
    @Builder.Default
    private Set<String> synonyms = new LinkedHashSet<>();

    /** Swahili / Sheng terms: "fundi wa mabomba". Same canonicalisation rule. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "skill_metadata_swahili", joinColumns = @JoinColumn(name = "skill_metadata_id"))
    @Column(name = "keyword", nullable = false)
    @Builder.Default
    private Set<String> swahiliKeywords = new LinkedHashSet<>();

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

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
}
