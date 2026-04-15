package com.tufixit.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "listings")
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Listing {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "artisan_id", nullable = false)
    private User artisan;

    @Column(nullable = false)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkerSkill.SkillType skillType;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column
    private String priceStart;

    @Column
    private String location;

    @Column
    private Double latitude;

    @Column
    private Double longitude;

    @Column(columnDefinition = "TEXT")
    private String images; // JSON array of image URLs

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ListingStatus status;

    @Column
    private Boolean isActive = true;

    @Column
    private Integer viewCount = 0;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public enum ListingStatus {
        PENDING, APPROVED, REJECTED, REVOKED
    }
}
