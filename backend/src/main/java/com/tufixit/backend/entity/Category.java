package com.tufixit.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "categories")
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Category {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(unique = true)
    private String slug;

    @Column
    private String icon; // FontAwesome icon class

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column
    @Builder.Default
    private Integer sortOrder = 0;

    @Column(nullable = false, columnDefinition = "boolean default true")
    @Builder.Default
    private Boolean indexable = true;

    @Column
    private String seoTitle;

    @Column(columnDefinition = "TEXT")
    private String seoDescription;

    @ElementCollection(targetClass = WorkerSkill.SkillType.class)
    @CollectionTable(name = "category_skill_types", joinColumns = @JoinColumn(name = "category_id"))
    @Column(name = "skill_type", nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Set<WorkerSkill.SkillType> skillTypes = new LinkedHashSet<>();

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
