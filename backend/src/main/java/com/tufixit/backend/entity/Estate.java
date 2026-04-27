package com.tufixit.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Represents a residential estate / apartment complex / gated community.
 *
 * Estates are NOT a separate product mode — they are a B2B distribution channel.
 * Each estate gets a branded booking link (slug-based) that tags all bookings
 * with the estate source, and an analytics view showing booking volume and ratings.
 *
 * Revenue model:
 *   - Estate pays a monthly license fee (KES 5,000–15,000) for the booking link + dashboard
 *   - Optionally negotiates group PRO subscriptions for approved artisans
 */
@Entity
@Table(
    name = "estates",
    indexes = {
        @Index(name = "idx_estate_slug", columnList = "slug", unique = true),
        @Index(name = "idx_estate_active", columnList = "is_active"),
        @Index(name = "idx_estate_short_code", columnList = "short_code", unique = true)
    }
)
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Estate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Display name, e.g. "Greenpark Estate - Athi River" */
    @Column(nullable = false, length = 150)
    private String name;

    /**
     * URL-safe slug for the branded booking link: tufixit.com/book?estate={slug}
     * Generated from name, e.g. "greenpark-athi-river". Must be unique.
     */
    @Column(nullable = false, unique = true, length = 100)
    private String slug;

    /** Neighbourhood / area, e.g. "Athi River", "Ruaka", "Karen" */
    @Column(nullable = false, length = 100)
    private String area;

    @Column
    private Double latitude;

    @Column
    private Double longitude;

    /** Number of residential units (apartments / houses) — used for pricing tier */
    @Column(name = "unit_count")
    private Integer unitCount;

    // ── Management contact ───────────────────────────────────────────────────

    /** Estate manager / caretaker name */
    @Column(name = "manager_name", length = 100)
    private String managerName;

    /** Manager phone (for SMS notifications about bookings originated from estate link) */
    @Column(name = "manager_phone", length = 20)
    private String managerPhone;

    /** Manager email */
    @Column(name = "manager_email", length = 150)
    private String managerEmail;

    // ── Contract ─────────────────────────────────────────────────────────────

    /** Monthly license fee agreed with estate management (KES) */
    @Column(name = "monthly_fee")
    private Integer monthlyFee;

    @Column(name = "contract_start")
    private LocalDateTime contractStart;

    @Column(name = "contract_end")
    private LocalDateTime contractEnd;

    // ── Branding (multi-tenant) ──────────────────────────────────────────────

    /** Primary brand colour hex, e.g. "#2563EB". Used by the frontend TenantContext. */
    @Column(name = "brand_primary_color", length = 10)
    private String brandPrimaryColor;

    /** URL to the estate's logo image (optional). */
    @Column(name = "brand_logo_url", length = 500)
    private String brandLogoUrl;

    /** Welcome message shown on the branded booking page. */
    @Column(name = "brand_welcome_message", length = 300)
    private String brandWelcomeMessage;

    // ── WhatsApp short code ──────────────────────────────────────────────────

    /**
     * Unique 4-digit short code for WhatsApp referral.
     * Customers text "START_ESTATE_{code}" to the bot to begin a booking
     * tagged with this estate.
     */
    @Column(name = "short_code", unique = true, length = 4)
    private String shortCode;

    // ── Commission ───────────────────────────────────────────────────────────

    /** Estate commission percentage on completed job values (e.g. 10.0 = 10%). */
    @Column(name = "commission_rate")
    @Builder.Default
    private Double commissionRate = 0.0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
