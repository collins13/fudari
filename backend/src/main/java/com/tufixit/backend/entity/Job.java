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

    // ── Booking-specific fields ──────────────────────────────────────────────

    /** Public tracking ID shown to customers, e.g. TUF-123456 */
    @Column(name = "booking_code", length = 20, unique = true)
    private String bookingCode;

    /** Customer full name (no-login bookings) */
    @Column(name = "customer_name", length = 100)
    private String customerName;

    /** Customer phone number */
    @Column(name = "customer_phone", length = 15)
    private String customerPhone;

    /** Customer location/address text */
    @Column(name = "customer_location", columnDefinition = "TEXT")
    private String customerLocation;

    /** Detailed job description from customer */
    @Column(name = "job_description", columnDefinition = "TEXT")
    private String jobDescription;

    /** Urgency level: NOW, TODAY, TOMORROW, SCHEDULED */
    @Enumerated(EnumType.STRING)
    @Column(name = "urgency", length = 20)
    private UrgencyLevel urgency;

    /** Scheduled datetime when urgency = SCHEDULED */
    @Column(name = "scheduled_time")
    private LocalDateTime scheduledTime;

    /** Customer's budget hint (optional) */
    @Column(name = "customer_budget")
    private Integer customerBudget;

    /** Whether the artisan has recorded the payment */
    @Column(name = "payment_recorded")
    private Boolean paymentRecorded = false;

    /** Payment method used: MPESA, CASH, BANK_TRANSFER */
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", length = 20)
    private PaymentMethod paymentMethod;

    /** M-Pesa receipt number or bank reference */
    @Column(name = "payment_transaction_id", length = 100)
    private String paymentTransactionId;

    /** Amount artisan received (from payment recording) */
    @Column(name = "payment_amount")
    private Integer paymentAmount;

    /** Reason given when job is declined or cancelled */
    @Column(name = "decline_reason", length = 200)
    private String declineReason;

    /** Counter-offer price from artisan */
    @Column(name = "counter_price")
    private Integer counterPrice;

    /** When artisan accepted the job */
    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;

    /** When artisan marked arrived */
    @Column(name = "arrived_at")
    private LocalDateTime arrivedAt;

    // ── Referral / estate tracking ───────────────────────────────────────────

    /**
     * Origin of this booking — used for attribution analytics.
     * Values: "web", "whatsapp", "estate:{slug}", "referral:{code}"
     */
    @Column(name = "referral_source", length = 100)
    private String referralSource;

    /** FK to estates table — set when booking originated from an estate link. */
    @Column(name = "estate_id")
    private Long estateId;

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
        PENDING, BIDDING,
        /** Artisan proposed a revised price — awaiting customer accept/reject */
        COUNTER_OFFERED,
        ACCEPTED, DECLINED, ARRIVED, IN_PROGRESS,
        COMPLETED, CANCELLED, DISPUTED, REFUNDED
    }

    public enum UrgencyLevel {
        NOW, TODAY, TOMORROW, SCHEDULED
    }

    public enum PaymentMethod {
        MPESA, CASH, BANK_TRANSFER
    }
}
