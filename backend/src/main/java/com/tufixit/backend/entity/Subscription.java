package com.tufixit.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "subscriptions")
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Subscription {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "artisan_id", nullable = false)
    private User artisan;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PlanType planType;

    @Column(nullable = false)
    private LocalDateTime startDate;

    @Column(nullable = false)
    private LocalDateTime endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubscriptionStatus status;

    @Column
    private Boolean autoRenew = false;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum PlanType {
        FREE, BASIC, PRO
    }

    public enum SubscriptionStatus {
        ACTIVE, EXPIRED, CANCELLED
    }

    public int getMaxListings() {
        return switch (planType) {
            case FREE -> 1;
            case BASIC -> 3;
            case PRO -> 999;
        };
    }

    public boolean isFeatured() {
        return planType == PlanType.PRO;
    }

    public int getRankingPriority() {
        return switch (planType) {
            case PRO -> 3;
            case BASIC -> 2;
            case FREE -> 1;
        };
    }
}
