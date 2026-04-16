package com.tufixit.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Audit log entry for admin actions.
 * Records who did what, when, and to which resource.
 */
@Entity
@Table(name = "admin_audit_log", indexes = {
        @Index(name = "idx_audit_admin_id", columnList = "admin_id"),
        @Index(name = "idx_audit_action", columnList = "action"),
        @Index(name = "idx_audit_created_at", columnList = "created_at"),
        @Index(name = "idx_audit_target_type", columnList = "target_type")
})
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The admin who performed the action */
    @Column(name = "admin_id", nullable = false)
    private Long adminId;

    @Column(name = "admin_name", nullable = false, length = 100)
    private String adminName;

    /** Action category */
    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, length = 50)
    private AuditAction action;

    /** What type of resource was affected */
    @Column(name = "target_type", nullable = false, length = 50)
    private String targetType;

    /** ID of the affected resource */
    @Column(name = "target_id")
    private Long targetId;

    /** Human-readable description */
    @Column(name = "description", length = 500)
    private String description;

    /** IP address of the admin */
    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum AuditAction {
        // User management
        USER_ROLE_CHANGED,
        USER_SUSPENDED,
        USER_ACTIVATED,
        USER_APPROVED,
        USER_APPROVAL_REVOKED,
        USER_DELETED,
        USER_CREATED,

        // Listing management
        LISTING_APPROVED,
        LISTING_REJECTED,
        LISTING_REVOKED,

        // Job/dispute management
        DISPUTE_RESOLVED,
        JOB_STATUS_CHANGED,

        // Report management
        REPORT_ACTIONED,

        // Subscription management
        SUBSCRIPTION_MODIFIED,

        // Estate management
        ESTATE_CREATED,
        ESTATE_UPDATED,
        ESTATE_DEACTIVATED,
        ESTATE_ARTISAN_APPROVED,
        ESTATE_ARTISAN_REMOVED,

        // Payment management
        PAYMENT_RELEASED,
        ESCROW_CREATED,

        // Category management
        CATEGORY_CREATED,
        CATEGORY_UPDATED,
        CATEGORY_DELETED
    }
}
