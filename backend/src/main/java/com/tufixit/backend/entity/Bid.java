package com.tufixit.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "bids")
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Bid {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "worker_id", nullable = false)
    private User worker;

    @Column(nullable = false)
    private String bidAmount;

    @Column(columnDefinition = "TEXT")
    private String proposal;

    @Column
    private Integer estimatedDays;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BidStatus status;

    @Column
    private Boolean isWinning = false;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum BidStatus {
        PENDING, ACCEPTED, REJECTED, WITHDRAWN
    }
}
