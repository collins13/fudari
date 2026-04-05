package com.tufixit.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "reports")
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Report {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_artisan_id", nullable = false)
    private User reportedArtisan;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id")
    private User reporter;

    @Column
    private String reporterPhone;

    @Column
    private String reporterEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReportReason reason;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReportStatus status;

    @Enumerated(EnumType.STRING)
    private AdminAction adminAction;

    @Column(columnDefinition = "TEXT")
    private String adminNotes;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime resolvedAt;

    public enum ReportReason {
        FRAUD, POOR_QUALITY, NO_SHOW, RUDE_BEHAVIOR, OVERCHARGING, SAFETY_CONCERN, OTHER
    }

    public enum ReportStatus {
        PENDING, REVIEWED, WARNING_ISSUED, ARTISAN_SUSPENDED, ARTISAN_BANNED, DISMISSED
    }

    public enum AdminAction {
        NONE, WARNING, SUSPENSION, BAN
    }
}
