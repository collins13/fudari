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

    /** For SCHEDULED urgency — the date/time text entered by customer. */
    @Column(name = "scheduled_time_text", length = 100)
    private String scheduledTimeText;

    /** Parsed scheduled time (best-effort). */
    @Column(name = "scheduled_time")
    private LocalDateTime scheduledTime;

    /**
     * The artisan ID chosen by the AI matching step.
     * Stored here so we can call createBooking once the customer confirms.
     */
    @Column(name = "selected_artisan_id")
    private Long selectedArtisanId;

    /** JSON of top 3 artisan IDs for multi-choice confirmation. */
    @Column(name = "matched_artisan_ids", length = 100)
    private String matchedArtisanIds;

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

    /** Estate ID — set when session started via START_ESTATE_{code} or estate link. */
    @Column(name = "estate_id")
    private Long estateId;

    /** Number of times the customer sent an unrecognised input (for retry limit). */
    @Column(name = "error_count")
    @Builder.Default
    private int errorCount = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "session_status", nullable = false)
    @Builder.Default
    private SessionStatus sessionStatus = SessionStatus.ACTIVE;

    /** Last processed messageId — used for webhook retry deduplication. */
    @Column(name = "last_message_id", length = 100)
    private String lastMessageId;

    /** Stores the state the session was in before it expired, so we can resume there. */
    @Enumerated(EnumType.STRING)
    @Column(name = "previous_state", length = 20)
    private ConversationState previousState;

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
         * Customer chose SCHEDULED — bot asked for a date/time.
         * Next expected input: date/time text (e.g. "Monday 2pm", "20/04 at 10:00").
         */
        SCHEDULE_TIME,

        /**
         * Urgency collected — bot ran AI matching, displayed top artisan(s).
         * Next expected input: artisan number (1/2/3), YES to confirm #1, or NO to cancel.
         */
        CONFIRM,

        /** Job created — session is sealed. No more input processed. */
        COMPLETED,

        /** Customer typed CANCEL or session timed out without completing. */
        ABANDONED,

        /**
         * Session expired (idle 30min–2hrs) — bot asked if user wants to resume.
         * Next expected input: YES/CONTINUE to resume, NO/START OVER to start fresh.
         */
        RESUME_PROMPT
    }

    public enum SessionStatus {
        ACTIVE,
        COMPLETED,
        ABANDONED,
        /** Session idle > 30min but < 2hrs — eligible for resume prompt. */
        EXPIRED
    }
}
