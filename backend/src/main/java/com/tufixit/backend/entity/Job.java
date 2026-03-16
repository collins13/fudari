package com.tufixit.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "jobs")
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Job {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private User client;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkerSkill.SkillType skillType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private JobStatus status;

    @Column(columnDefinition = "TEXT")
    private String beforeImages; // JSON array of image URLs

    @Column
    private String address;

    @Column
    private Double latitude;

    @Column
    private Double longitude;

    @Column
    private String locationName;

    @Column
    private String preferredTime;

    @Column
    private Boolean isUrgent = false;

    @Column
    private Integer estimatedDurationHours;

    // Bidding
    @Column
    private Boolean allowBidding = true;

    @Column
    private String budgetMin;

    @Column
    private String budgetMax;

    // Selected Worker
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_worker_id")
    private User assignedWorker;

    // Payment
    @Column
    private String agreedPrice;

    @Column
    private String materialCost;

    @Column
    private String laborCost;

    // PINs for verification
    @Column
    private String startPin;

    @Column
    private String completionPin;

    @Column
    private LocalDateTime startTime;

    @Column
    private LocalDateTime completionTime;

    @Column
    private Double startLatitude;

    @Column
    private Double startLongitude;

    @Column(columnDefinition = "TEXT")
    private String afterImages; // JSON array of image URLs

    @OneToMany(mappedBy = "job", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Bid> bids = new ArrayList<>();

    @OneToMany(mappedBy = "job", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Review> reviews = new ArrayList<>();

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public enum JobStatus {
        PENDING, BIDDING, ACCEPTED, WORKER_EN_ROUTE, IN_PROGRESS, 
        COMPLETED, CANCELLED, DISPUTED, REFUNDED
    }
}
