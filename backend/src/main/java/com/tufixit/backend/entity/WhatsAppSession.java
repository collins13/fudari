package com.tufixit.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Persists the multi-turn WhatsApp booking conversation state per customer phone number.
 *
 * One session = one booking attempt. A session is COMPLETED once a Job is created,
 * or ABANDONED after 30 minutes of inactivity.
 *
 * The state machine flow:
 *   IDLE → CATEGORY → LOCATION → DESCRIPTION → URGENCY → CONFIRM → COMPLETED
 *
 * Anti-disintermediation: the artisanPhone field is NEVER forwarded to the customer.
 * All customer↔artisan communication goes through the platform WhatsApp number.
 */
@Entity
@Table(
    name = "whatsapp_sessions",
    indexes = {
        @Index(name = "idx_wa_phone", columnList = "customer_phone"),
        @Index(name = "idx_wa_state", columnList = "state"),
        @Index(name = "idx_wa_updated", columnList = "updated_at")
    }
)
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WhatsAppSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Normalised E.164 phone number of the customer (e.g. +254712345678). */
    @Column(name = "customer_phone", nullable = false, length = 20)
    private String customerPhone;

    /** Customer's display name as registered on WhatsApp (from webhook contact data). */
    @Column(name = "customer_name", length = 100)
    private String customerName;

    /** Current state in the booking conversation flow. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ConversationState state;

    // ── Collected booking data (built up turn-by-turn) ──────────────────────

    /** Free-text category input, e.g. "plumber" or selection index "2". */
    @Column(name = "selected_category", length = 100)
    private String selectedCategory;

    /** Normalised SkillType string once resolved, e.g. "PLUMBING". */
    @Column(name = "skill_type", length = 50)
    private String skillType;

    @Column(name = "customer_location", length = 255)
    private String customerLocation;

    @Column(name = "job_description", columnDefinition = "TEXT")
    private String jobDescription;

    /** Raw urgency choice from customer: NOW / TODAY / TOMORROW / SCHEDULED. */
    @Column(name = "urgency", length = 20)
    private String urgency;

    /**
     * The artisan ID chosen by the AI matching step.
     * Stored here so we can call createBooking once the customer confirms.
     */
    @Column(name = "selected_artisan_id")
    private Long selectedArtisanId;

    /**
     * Summary message sent to the customer at the CONFIRM step.
     * Stored to allow re-sending on timeout.
     */
    @Column(name = "confirm_summary", columnDefinition = "TEXT")
    private String confirmSummary;

    /**
     * The booking code generated once the job is created (TUF-XXXXXX).
     * Set when state transitions to COMPLETED.
     */
    @Column(name = "booking_code", length = 20)
    private String bookingCode;

    /** ID of the Job entity created for this session, set at COMPLETED. */
    @Column(name = "job_id")
    private Long jobId;

    /** Number of times the customer sent an unrecognised input (for retry limit). */
    @Column(name = "error_count")
    @Builder.Default
    private int errorCount = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "session_status", nullable = false)
    @Builder.Default
    private SessionStatus sessionStatus = SessionStatus.ACTIVE;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // ── Enums ────────────────────────────────────────────────────────────────

    public enum ConversationState {
        /**
         * Session just created — bot is about to send the category menu.
         * Next expected input: a number (1–9) or free-text category name.
         */
        CATEGORY,

        /**
         * Category collected — bot asked for location.
         * Next expected input: neighbourhood / area name (free text).
         */
        LOCATION,

        /**
         * Location collected — bot asked for job description.
         * Next expected input: free text description of the work needed.
         */
        DESCRIPTION,

        /**
         * Description collected — bot asked for urgency.
         * Next expected input: 1 (Now) / 2 (Today) / 3 (Tomorrow) / 4 (Schedule).
         */
        URGENCY,

        /**
         * Urgency collected — bot ran AI matching, displayed top artisan summary.
         * Next expected input: YES to confirm, NO to restart, or HELP.
         */
        CONFIRM,

        /** Job created — session is sealed. No more input processed. */
        COMPLETED,

        /** Customer typed CANCEL or session timed out without completing. */
        ABANDONED
    }

    public enum SessionStatus {
        ACTIVE,
        COMPLETED,
        ABANDONED
    }
}
