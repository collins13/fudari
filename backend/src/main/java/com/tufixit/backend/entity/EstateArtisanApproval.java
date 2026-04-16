package com.tufixit.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Estate-approved artisan — a many-to-many link between estates and artisans.
 *
 * When an estate manager "approves" an artisan, bookings originating from that
 * estate's branded link will rank the approved artisan higher (via RankingService).
 *
 * The artisan is NOT locked to the estate — they remain visible in the general
 * marketplace. The approval is a positive ranking signal, not a filter.
 */
@Entity
@Table(
    name = "estate_artisan_approvals",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_estate_artisan",
        columnNames = {"estate_id", "artisan_id"}
    ),
    indexes = {
        @Index(name = "idx_ea_estate", columnList = "estate_id"),
        @Index(name = "idx_ea_artisan", columnList = "artisan_id")
    }
)
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EstateArtisanApproval {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "estate_id", nullable = false)
    private Estate estate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "artisan_id", nullable = false)
    private User artisan;

    /** Who added this approval — estate manager or admin */
    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    /** Optional note, e.g. "Recommended by 3 residents" */
    @Column(length = 255)
    private String note;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
