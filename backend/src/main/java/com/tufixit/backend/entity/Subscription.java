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

    /**
     * MONTHLY — standard 30-day cycle (KES 500 BASIC / KES 3,000 PRO).
     * WEEKLY  — 7-day cycle (KES 150 BASIC / KES 800 PRO).
     *           Matches informal-sector income patterns where artisans
     *           are paid weekly or per-job rather than monthly.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "billing_cycle", nullable = false)
    @Builder.Default
    private BillingCycle billingCycle = BillingCycle.MONTHLY;

    @Column
    private Boolean autoRenew = false;

    /** M-Pesa transaction reference — recorded for audit trail */
    @Column(name = "mpesa_transaction_id", length = 50)
    private String mpesaTransactionId;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum PlanType {
        FREE, BASIC, PRO
    }

    public enum SubscriptionStatus {
        ACTIVE,
        /** 48-hour window after expiry — artisan retains ranking during this period. */
        GRACE_PERIOD,
        EXPIRED,
        CANCELLED
    }

    public enum BillingCycle {
        MONTHLY,
        WEEKLY
    }

    // ── Pricing constants (KES) ──────────────────────────────────────────────

    public static final int BASIC_MONTHLY_PRICE = 500;
    public static final int BASIC_WEEKLY_PRICE  = 150;   // ≈ KES 600/month — slight premium for flexibility
    public static final int PRO_MONTHLY_PRICE   = 3000;
    public static final int PRO_WEEKLY_PRICE    = 800;   // ≈ KES 3,200/month — slight premium for flexibility

    /** Returns the price in KES for this subscription's plan + billing cycle. */
    public int getPriceKes() {
        return switch (planType) {
            case FREE  -> 0;
            case BASIC -> billingCycle == BillingCycle.WEEKLY ? BASIC_WEEKLY_PRICE : BASIC_MONTHLY_PRICE;
            case PRO   -> billingCycle == BillingCycle.WEEKLY ? PRO_WEEKLY_PRICE   : PRO_MONTHLY_PRICE;
        };
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
        // GRACE_PERIOD maintains ranking as if still ACTIVE
        return switch (planType) {
            case PRO -> 3;
            case BASIC -> 2;
            case FREE -> 1;
        };
    }

    /** True if this subscription grants ranking benefits (ACTIVE or in grace period). */
    public boolean isRankingActive() {
        return status == SubscriptionStatus.ACTIVE || status == SubscriptionStatus.GRACE_PERIOD;
    }
}
