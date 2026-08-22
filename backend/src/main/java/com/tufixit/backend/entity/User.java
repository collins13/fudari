package com.tufixit.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "users")
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String email;

    @Column(nullable = false, unique = true)
    private String phoneNumber;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    @Column(columnDefinition = "TEXT")
    private String profileImage;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role; // CLIENT, WORKER, ADMIN

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VettingLevel vettingLevel = VettingLevel.STANDARD;

    @Column(unique = true)
    private String nationalId;

    /** Base64-encoded national ID document image (admin/self access only). */
    @Column(name = "id_document_image", columnDefinition = "TEXT")
    private String idDocumentImage;

    /** Base64-encoded Certificate of Good Conduct image (admin/self access only). */
    @Column(name = "certificate_of_good_conduct", columnDefinition = "TEXT")
    private String certificateOfGoodConduct;

    @Column
    private String tvetCertification;

    @Column
    private Double trustScore = 0.0;

    @Column
    private Integer totalJobsCompleted = 0;

    @Column
    private Integer totalReviews = 0;

    @Column
    private Double latitude;

    @Column
    private Double longitude;

    @Column
    private String locationName;

    /** Worker-controlled "I can take a job right now" flag, surfaced in search. */
    @Column(name = "available_now")
    private Boolean availableNow = false;

    /** Last time the worker confirmed availability — used to expire stale ACCEPTING states. */
    @Column(name = "availability_updated_at")
    private LocalDateTime availabilityUpdatedAt;

    @Column
    private Boolean isVerified = false;

    @Column
    private Boolean isActive = true;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AccountStatus accountStatus = AccountStatus.ACTIVE;

    /** Workers require admin approval before being visible to customers */
    @Column
    private Boolean isApproved = false;

    /** Onboarding lifecycle state. Mirrors isApproved + adds REJECTED. */
    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false)
    @lombok.Builder.Default
    private ApprovalStatus approvalStatus = ApprovalStatus.PENDING;

    /** Timestamp when the artisan was approved by an admin. */
    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    /** Admin user ID that approved (or last actioned) this artisan. */
    @Column(name = "approved_by_admin_id")
    private Long approvedByAdminId;

    /** Reason supplied if the artisan was rejected during onboarding. */
    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    /** Admin user ID that created this account (admin-assisted onboarding). Null for self-signup. */
    @Column(name = "created_by_admin_id")
    private Long createdByAdminId;

    @Column
    private String mpesaAccountNumber;

    /** Unique referral code generated at registration (e.g. "TFX-A1B2C3") */
    @Column(unique = true)
    private String referralCode;

    /** ID of the user who referred this user (nullable) */
    @Column
    private Long referredBy;

    /** OTP for password reset — stored hashed, cleared after use */
    @JsonIgnore
    @Column(name = "reset_otp")
    private String resetOtp;

    /** When the OTP expires (10 minutes from issue) */
    @Column(name = "reset_otp_expires_at")
    private LocalDateTime resetOtpExpiresAt;

    /** OTP for passwordless sign-in / sign-up — stored hashed, cleared after use */
    @JsonIgnore
    @Column(name = "login_otp")
    private String loginOtp;

    @Column(name = "login_otp_expires_at")
    private LocalDateTime loginOtpExpiresAt;

    /** Failed verification attempts against the current OTP — guards against brute force. */
    @Column(name = "login_otp_attempts")
    private Integer loginOtpAttempts = 0;

    @JsonIgnore
    @OneToMany(mappedBy = "worker", fetch = FetchType.LAZY)
    private List<WorkerSkill> skills;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    /** FK — the estate this user manages (only when role = ESTATE_MANAGER). */
    @Column(name = "estate_id")
    private Long estateId;

    public enum UserRole {
        CLIENT, WORKER, ADMIN, ESTATE_MANAGER
    }

    public enum VettingLevel {
        STANDARD, VERIFIED, PRO
    }

    public enum AccountStatus {
        ACTIVE, SUSPENDED, LOCKED, DISABLED, SOFT_DELETED
    }

    public enum ApprovalStatus {
        PENDING, APPROVED, REJECTED
    }
}
