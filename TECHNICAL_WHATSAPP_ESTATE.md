# Fudari — Technical Document: WhatsApp Integration & Estate System

> **Version**: 1.0  
> **Date**: 2025  
> **Scope**: Complete technical audit of the WhatsApp booking bot and Estate B2B distribution channel

---

## Table of Contents

1. [WhatsApp Integration](#1-whatsapp-integration)
   - [1.1 Architecture Overview](#11-architecture-overview)
   - [1.2 Provider Abstraction Layer](#12-provider-abstraction-layer)
   - [1.3 Webhook Controllers](#13-webhook-controllers)
   - [1.4 Conversational Bot (State Machine)](#14-conversational-bot-state-machine)
   - [1.5 Session Persistence](#15-session-persistence)
   - [1.6 Frontend Integration](#16-frontend-integration)
   - [1.7 Security](#17-security)
   - [1.8 Audit Findings](#18-audit-findings)
2. [Estate System](#2-estate-system)
   - [2.1 Architecture Overview](#21-architecture-overview)
   - [2.2 Data Model](#22-data-model)
   - [2.3 Service Layer](#23-service-layer)
   - [2.4 API Endpoints](#24-api-endpoints)
   - [2.5 Frontend Pages](#25-frontend-pages)
   - [2.6 Artisan Approval & Ranking](#26-artisan-approval--ranking)
   - [2.7 Analytics](#27-analytics)
   - [2.8 Audit Findings](#28-audit-findings)
3. [Integration Points](#3-integration-points-between-whatsapp--estates)
4. [Recommendations](#4-recommendations)

---

## 1. WhatsApp Integration

### 1.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Customer WhatsApp                        │
└──────────────┬──────────────────────────────────┬───────────────┘
               │  Inbound webhook                 │  Outbound msg
               ▼                                  ▲
┌──────────────────────────┐   ┌──────────────────────────────────┐
│   Meta Cloud API         │   │   Twilio WhatsApp API            │
│   graph.facebook.com     │   │   api.twilio.com                 │
└──────────┬───────────────┘   └──────────────┬───────────────────┘
           │                                  │
           ▼                                  ▼
┌──────────────────────────┐   ┌──────────────────────────────────┐
│ WhatsAppWebhookController│   │ TwilioWhatsAppWebhookController  │
│ POST /api/whatsapp/      │   │ POST /api/whatsapp/twilio/       │
│       webhook            │   │       inbound | status           │
└──────────┬───────────────┘   └──────────────┬───────────────────┘
           │  Normalised InboundMessage        │
           └───────────────┬───────────────────┘
                           ▼
               ┌───────────────────────┐
               │  WhatsAppBotService   │
               │  (State Machine)      │
               └───────────┬───────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
     ┌──────────────┐ ┌─────────┐ ┌──────────────┐
     │ BookingService│ │Artisan  │ │ Geocoding    │
     │              │ │MatchSvc │ │ Service      │
     └──────────────┘ └─────────┘ └──────────────┘
                           │
                           ▼
               ┌───────────────────────┐
               │ WhatsAppProviderMgr   │
               │  (Outbound Facade)    │
               └───────┬───────┬───────┘
                       │       │
              Primary  │       │  Secondary (fallback)
                       ▼       ▼
              ┌────────────┐ ┌────────────────┐
              │ Twilio     │ │ Meta Cloud API │
              │ Provider   │ │ Provider       │
              └────────────┘ └────────────────┘
```

**Key design decisions:**
- **Dual-provider** architecture allows switching between Twilio and Meta without code changes
- **Anti-disintermediation**: The artisan's phone number is never shared with the customer. All communication flows through the platform WhatsApp number
- **Referral attribution**: All bookings from WhatsApp are tagged with `referralSource = "whatsapp"` for analytics

### 1.2 Provider Abstraction Layer

#### Interface: `WhatsAppProvider`

```java
public interface WhatsAppProvider {
    String providerName();
    void sendText(String to, String body);
    void sendTemplate(String to, String templateName, List<String> params);
    boolean isConfigured();
}
```

Every provider implements these four methods, enabling seamless hot-swap.

#### Provider Manager: `WhatsAppProviderManager`

| Config Property | Default | Purpose |
|---|---|---|
| `whatsapp.provider` | `twilio` | Selects the primary provider (`twilio` or `meta`) |
| `whatsapp.fallback.enabled` | `false` | If `true`, the secondary provider is tried when the primary fails |

**Initialisation flow (`@PostConstruct`):**
1. Reads `whatsapp.provider` env var
2. Sets primary/secondary based on value
3. Logs which providers are configured and active

**Outbound message flow:**
```
sendText(to, body)
  ├─ primary.isConfigured()?
  │    ├─ YES → primary.sendText() → success? DONE
  │    │                            → failed + fallback enabled?
  │    │                                 ├─ YES → secondary.sendText()
  │    │                                 └─ NO → log error
  │    └─ NO → secondary.isConfigured()?
  │              ├─ YES → secondary.sendText()
  │              └─ NO → log.warn("No provider configured")
  └─ (same for sendTemplate)
```

#### Meta Cloud API Provider: `MetaWhatsAppProvider`

| Feature | Implementation |
|---|---|
| **Send text** | `POST https://graph.facebook.com/v21.0/{phoneNumberId}/messages` with JSON body `{messaging_product: "whatsapp", to, type: "text", text: {body}}` |
| **Send template** | Same endpoint, `type: "template"` with language `en_US` and component parameters |
| **Parse inbound** | Walks `InboundWebhook.entry[].changes[].value.messages[]`, extracts text from `text.body` or `interactive.button_reply.title` / `interactive.list_reply.title` |
| **Parse statuses** | Walks same structure for `value.statuses[]`, maps to `DeliveryStatus` enum |
| **Config check** | Verifies `apiBaseUrl`, `phoneNumberId`, and `accessToken` are all non-blank |

#### Twilio WhatsApp Provider: `TwilioWhatsAppProvider`

| Feature | Implementation |
|---|---|
| **Send text** | `POST https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json` with form params `From=whatsapp:+{from}&To=whatsapp:+{to}&Body={body}` |
| **Send template** | Sends as Content-SID template or plain text with parameter substitution |
| **Parse inbound** | Reads Twilio form fields: `From`, `Body`, `ProfileName`, `MessageSid` |
| **Signature validation** | HMAC-SHA1 of sorted params against `X-Twilio-Signature` header using auth token |
| **Config check** | Verifies `accountSid`, `authToken`, and `whatsappFrom` are non-blank |

#### Normalised DTOs

```
InboundMessage { from, displayName, text, messageId }
DeliveryStatus { messageId, status, recipientPhone, timestamp, errorCode, errorMessage }
                         ↑
                    QUEUED | SENT | DELIVERED | READ | FAILED | UNDELIVERED
```

Both providers convert their native formats into these normalised DTOs before passing to the bot service.

### 1.3 Webhook Controllers

#### Meta Webhook Controller (`/api/whatsapp/webhook`)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/whatsapp/webhook` | Meta verification handshake — echoes `hub.challenge` if `hub.verify_token` matches |
| `POST` | `/api/whatsapp/webhook` | Receives all inbound events (messages, statuses) |

**POST flow:**
1. Validate `X-Hub-Signature-256` (HMAC-SHA256 of raw body with `whatsapp.app-secret`) if configured
2. Deserialise JSON to `WhatsAppDTO.InboundWebhook`
3. Parse delivery statuses → log failures
4. Parse inbound text messages → route each to `WhatsAppBotService.handleInbound()`
5. Non-text messages (images, voice notes) → sends `HELP` command to trigger help response
6. Always returns `200 OK` to prevent Meta retry loops

**Security:** Signature validation is optional (skipped if `whatsapp.app-secret` is blank). In production, the app secret **must** be configured.

#### Twilio Webhook Controller (`/api/whatsapp/twilio/`)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/whatsapp/twilio/inbound` | Receives inbound WhatsApp messages |
| `POST` | `/api/whatsapp/twilio/status` | Receives delivery status callbacks |

**Inbound flow:**
1. Validate `X-Twilio-Signature` (HMAC-SHA1) against reconstructed URL if `twilio.webhook.validate-signature=true`
2. Parse form params via `twilioProvider.parseInbound()`
3. Blank body → treat as HELP
4. Route to `WhatsAppBotService.handleInbound()`
5. Returns empty `200 OK`

**URL reconstruction** for signature validation handles reverse proxy scenarios via `X-Forwarded-Proto` and `X-Forwarded-Host` headers.

### 1.4 Conversational Bot (State Machine)

The `WhatsAppBotService` implements a **linear state machine** that guides customers through booking entirely within WhatsApp.

#### State Flow

```
                    ┌──────────────────────────────────────────────────────────────┐
                    │              Pre-fill Parsing (wa.me links)                  │
                    │  Pattern 1: "book {name} ({skill}) in {location}"           │
                    │            → skip to DESCRIPTION                            │
                    │  Pattern 2: "I live in {area} and need..."                  │
                    │            → pre-fill location, go to CATEGORY              │
                    └───────────────────────┬──────────────────────────────────────┘
                                            │
                              ┌─────────────▼──────────────┐
                              │         CATEGORY           │
                              │  "Which service? (1-9)"    │
                              │  Accepts: number, English, │
                              │  Swahili/Sheng             │
                              └─────────────┬──────────────┘
                                            │  (if location pre-filled → skip)
                              ┌─────────────▼──────────────┐
                              │         LOCATION           │
                              │  "Which area? (≥3 chars)"  │
                              └─────────────┬──────────────┘
                                            │
                              ┌─────────────▼──────────────┐
                              │        DESCRIPTION         │
                              │  "Describe the work        │
                              │   (≥10 chars)"             │
                              └─────────────┬──────────────┘
                                            │
                              ┌─────────────▼──────────────┐
                              │         URGENCY            │
                              │  1=NOW 2=TODAY 3=TOMORROW  │
                              │  4=SCHEDULED               │
                              │  Also: "sasa","leo","kesho"│
                              └──────┬──────────────┬──────┘
                                     │              │
                          (1/2/3)    │     (4)      │
                                     │              ▼
                                     │   ┌─────────────────────┐
                                     │   │   SCHEDULE_TIME     │
                                     │   │  "Monday 2pm"       │
                                     │   │  "20/04 at 14:00"   │
                                     │   │  "Tomorrow morning" │
                                     │   └─────────┬───────────┘
                                     │             │
                                     └──────┬──────┘
                                            ▼
                              ┌─────────────────────────────┐
                              │  Geocode location           │
                              │  ArtisanMatchService        │
                              │  → Top 1-3 artisan matches  │
                              └─────────────┬───────────────┘
                                            ▼
                              ┌─────────────────────────────┐
                              │         CONFIRM             │
                              │  1 match: "YES / NO"        │
                              │  3 matches: "1 / 2 / 3 /NO"│
                              └──────┬──────────────┬───────┘
                                     │              │
                             (YES/1/2/3)         (NO)
                                     ▼              ▼
                              ┌────────────┐  ┌──────────┐
                              │ COMPLETED  │  │ ABANDONED │
                              │ Booking    │  │ Session   │
                              │ created    │  │ ended     │
                              └────────────┘  └──────────┘
```

#### Global Commands (available in any state)

| Command | Action |
|---|---|
| `CANCEL` / `STOP` | Abandons session, sends cancellation message |
| `HELP` | Sends help menu with available commands |
| `BACK` | Returns to the previous state, clears that state's data |

#### Category Resolution

The bot accepts input in **three formats**:
1. **Numeric**: `1`–`9` mapping to predefined categories
2. **English**: `plumber`, `electrician`, etc.
3. **Swahili/Sheng**: `fundi stima`, `mabomba`, `fundi magari`, `usafi`, etc.

Full mapping (9 categories × 3+ input formats each):

| # | English | Swahili/Sheng | SkillType |
|---|---|---|---|
| 1 | electrician | fundi stima, stima | ELECTRICIAN |
| 2 | plumber | fundi mabomba, mabomba | PLUMBER |
| 3 | mechanic | fundi magari, magari | MECHANIC |
| 4 | carpenter | fundi seremala, seremala | CARPENTER |
| 5 | painter | fundi rangi, rangi | PAINTER |
| 6 | cleaner | fundi usafi, usafi | CLEANER |
| 7 | mason / fundis | fundi ujenzi, ujenzi, fundi, fundis | MASON |
| 8 | welder | fundi chuma, chuma | WELDER |
| 9 | other | — | OTHER |

#### Urgency & Schedule Time Parsing

**Urgency** accepts numeric (1-4), English (now, today, tomorrow, schedule), and Swahili (sasa, leo, kesho).

**Schedule time parser** handles:
- `dd/MM at HH:mm` — e.g., `20/04 at 14:00`
- `{day} {time}` — e.g., `Monday 2pm`
- `tomorrow 10:00`
- `next Saturday morning` (next = +7 days)
- Natural language: `morning` → 9:00, `afternoon` → 14:00, `evening` → 18:00
- Past-time validation: rejects times in the past

#### Artisan Matching & Confirmation

1. **Geocoding**: Customer location → lat/lng via `GeocodingService`
2. **Match**: `ArtisanMatchService.findTopMatches(skillType, lat, lng)` returns up to 3 artisans
3. **Single match**: Shows artisan details + YES/NO prompt
4. **Multiple matches**: Numbered list with name, rating, distance, hourly rate → pick 1/2/3
5. **No matches**: Apologise, link to website, abandon session

#### Booking Creation

On confirmation, the bot calls `BookingService.createBooking()` with:
```java
CreateBookingRequest {
    artisanId,
    customerName  (from WhatsApp profile or "WhatsApp Customer"),
    customerPhone (normalised E.164),
    customerLocation,
    jobDescription,
    urgency       (NOW / TODAY / TOMORROW / SCHEDULED),
    scheduledTime (if SCHEDULED),
    referralSource = "whatsapp"
}
```

Returns a `BookingTrackResponse` with `bookingCode` (e.g., `TUF-ABC123`) and `jobId`. The customer receives:
- Booking code
- Tracking link: `fudari.co/track/{bookingCode}`
- Promise of SMS + WhatsApp updates when artisan responds

#### Error Handling

- **3 consecutive unrecognised inputs** at CATEGORY → auto-abandon session
- **Duplicate messageId** → silently ignored (webhook retry deduplication)
- **Booking creation failure** → user sees error message, can retry or visit website

### 1.5 Session Persistence

**Entity**: `WhatsAppSession` (table: `whatsapp_sessions`)

| Column | Type | Purpose |
|---|---|---|
| `id` | BIGINT PK | Auto-increment |
| `customer_phone` | VARCHAR(20) | Normalised E.164 (indexed) |
| `customer_name` | VARCHAR(100) | WhatsApp display name |
| `state` | ENUM | `CATEGORY`, `LOCATION`, `DESCRIPTION`, `URGENCY`, `SCHEDULE_TIME`, `CONFIRM`, `COMPLETED`, `ABANDONED` |
| `selected_category` | VARCHAR(100) | Raw user input |
| `skill_type` | VARCHAR(50) | Normalised enum value |
| `customer_location` | VARCHAR(255) | Free-text area name |
| `job_description` | TEXT | Work description |
| `urgency` | VARCHAR(20) | `NOW`, `TODAY`, `TOMORROW`, `SCHEDULED` |
| `scheduled_time_text` | VARCHAR(100) | Raw user input for schedule |
| `scheduled_time` | DATETIME | Parsed schedule datetime |
| `selected_artisan_id` | BIGINT | Chosen artisan FK |
| `matched_artisan_ids` | VARCHAR(100) | CSV of top 3 artisan IDs |
| `confirm_summary` | TEXT | The message shown at CONFIRM step |
| `booking_code` | VARCHAR(20) | `TUF-XXXXXX` once completed |
| `job_id` | BIGINT | FK to jobs table |
| `error_count` | INT | Consecutive bad inputs counter |
| `session_status` | ENUM | `ACTIVE`, `COMPLETED`, `ABANDONED` |
| `last_message_id` | VARCHAR(100) | For deduplication |
| `created_at` | DATETIME | Auto-set |
| `updated_at` | DATETIME | Auto-set (indexed) |

**Indexes**: `customer_phone`, `state`, `updated_at`

**Stale session cleanup**: `@Scheduled(fixedDelay = 600000)` — every 10 minutes, sessions with `ACTIVE` status and `updated_at` older than 30 minutes are bulk-updated to `ABANDONED`.

### 1.6 Frontend Integration

**File**: `frontend/src/lib/whatsapp.ts`

```typescript
export const PLATFORM_WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '254703954539';

export function whatsappBotLink(prefillText?: string): string {
  const base = `https://wa.me/${PLATFORM_WHATSAPP_NUMBER}`;
  if (!prefillText) return base;
  return `${base}?text=${encodeURIComponent(prefillText)}`;
}
```

**Usage in frontend pages:**
- Artisan profile pages generate `wa.me` links with pre-filled text: `"Hi, I'd like to book {name} ({skill}) in {location}"`
- Estate booking pages generate: `"Hi, I live in {estate.area} and need to book an artisan"`
- These pre-filled messages are parsed by `WhatsAppBotService.tryPrefillOrCreateSession()` to skip ahead in the flow

**Admin API**: `GET /admin/whatsapp/sessions` — lists all WhatsApp sessions for admin monitoring.

### 1.7 Security

| Control | Status | Detail |
|---|---|---|
| Meta `X-Hub-Signature-256` validation | ✅ Implemented | HMAC-SHA256 of body with `whatsapp.app-secret`. **Skipped if secret is blank.** |
| Twilio `X-Twilio-Signature` validation | ✅ Implemented | HMAC-SHA1 with auth token. Configurable via `twilio.webhook.validate-signature`. |
| Phone number normalisation | ✅ Implemented | Strips non-digits, converts Kenyan `07xx` to `+254xxx` format |
| Message deduplication | ✅ Implemented | `last_message_id` prevents duplicate processing from webhook retries |
| Anti-disintermediation | ✅ By design | Artisan phone never exposed; all comms through platform number |
| Rate limiting | ⚠️ Partial | Global `RateLimitFilter` applies, but no WhatsApp-specific throttle |
| Webhook URL authentication | ⚠️ Public | Both webhook endpoints are open (no API key); rely solely on signature validation |

### 1.8 Audit Findings

**Strengths:**
1. Clean provider abstraction — switching from Twilio to Meta (or vice versa) requires only one env var change
2. Automatic fallback prevents total outage if one provider goes down
3. Bilingual category input (English + Swahili/Sheng) excellent for Kenya market
4. Pre-filled message parsing creates seamless website→WhatsApp handoff
5. Session deduplication prevents double-booking from webhook retries
6. BACK command lets users correct mistakes without restarting
7. Stale session cleanup prevents orphaned sessions from accumulating

**Issues:**

| Severity | Finding | Detail |
|---|---|---|
| **HIGH** | Signature validation optional | If `whatsapp.app-secret` or `twilio.webhook.validate-signature` are not configured, anyone can POST fake webhooks and trigger bookings |
| **MEDIUM** | No WhatsApp-specific rate limit | A malicious actor could flood the bot with messages, creating many sessions and bookings |
| **MEDIUM** | No outbound message rate tracking | WhatsApp has session/template message limits; no tracking or backpressure mechanism exists |
| **LOW** | Schedule time parsing is best-effort | Complex date expressions may fail silently; no timezone handling (assumes server TZ = EAT) |
| **LOW** | `error_count` never resets | If a user makes 2 errors, leaves, returns next day — they get only 1 more chance before auto-abandon |
| **INFO** | No interactive messages (buttons/lists) | The DTO structure supports Meta interactive messages, but the bot only sends plain text. Buttons would improve UX |

---

## 2. Estate System

### 2.1 Architecture Overview

The Estate system is a **B2B distribution channel** — not a separate product. Residential estates (apartments, gated communities) get:
1. A **branded booking URL** (`fudari.co/estate/{slug}`) for residents
2. An **artisan approval system** where estate managers approve preferred artisans
3. An **analytics dashboard** showing booking volume and artisan performance
4. A **ranking boost** for approved artisans when bookings come through the estate link

```
┌────────────────────────────────────┐
│     Estate Manager / Admin         │
│  /dashboard/admin/estates          │
│  CRUD estates, approve artisans    │
│  view analytics                    │
└──────────────┬─────────────────────┘
               │ REST API
               ▼
┌──────────────────────────────────┐
│       EstateController           │
│  /api/public/estate/{slug}       │  ← Public (branded page)
│  /api/admin/estates/**           │  ← Admin (CRUD + analytics)
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│         EstateService            │
│  CRUD, approvals, analytics      │
└──────────┬───────────────────────┘
           │
     ┌─────┴────────────┐
     ▼                  ▼
┌──────────┐   ┌───────────────────────┐
│ Estate   │   │ EstateArtisanApproval │
│ (entity) │   │ (junction entity)     │
└──────────┘   └───────────────────────┘
```

**Revenue model**: Estate pays monthly license fee (KES 5,000–15,000) based on unit count for the branded booking link + dashboard access.

### 2.2 Data Model

#### `estates` table

| Column | Type | Constraints | Purpose |
|---|---|---|---|
| `id` | BIGINT PK | auto-increment | |
| `name` | VARCHAR(150) | NOT NULL | Display name, e.g. "Greenpark Estate - Athi River" |
| `slug` | VARCHAR(100) | UNIQUE, NOT NULL | URL-safe identifier, e.g. `greenpark-estate-athi-river` |
| `area` | VARCHAR(100) | NOT NULL | Neighbourhood, e.g. "Athi River" |
| `latitude` | DOUBLE | nullable | For proximity matching |
| `longitude` | DOUBLE | nullable | For proximity matching |
| `unit_count` | INT | nullable | Number of residential units (pricing tier) |
| `manager_name` | VARCHAR(100) | nullable | Estate manager name |
| `manager_phone` | VARCHAR(20) | nullable | For SMS booking notifications |
| `manager_email` | VARCHAR(150) | nullable | Manager email |
| `monthly_fee` | INT | nullable | Monthly license fee (KES) |
| `contract_start` | DATETIME | nullable | Contract start date |
| `contract_end` | DATETIME | nullable | Contract end date |
| `is_active` | BOOLEAN | NOT NULL, default `true` | Soft-delete flag |
| `created_at` | DATETIME | auto-set | |
| `updated_at` | DATETIME | auto-set | |

**Indexes**: `slug` (unique), `is_active`

#### `estate_artisan_approvals` table

| Column | Type | Constraints | Purpose |
|---|---|---|---|
| `id` | BIGINT PK | auto-increment | |
| `estate_id` | BIGINT FK | NOT NULL | → `estates.id` |
| `artisan_id` | BIGINT FK | NOT NULL | → `users.id` (role = WORKER) |
| `approved_by` | VARCHAR(100) | nullable | Who approved (manager name) |
| `note` | VARCHAR(255) | nullable | E.g. "Recommended by 3 residents" |
| `created_at` | DATETIME | auto-set | |

**Constraints**: `UNIQUE(estate_id, artisan_id)`  
**Indexes**: `estate_id`, `artisan_id`

### 2.3 Service Layer

#### `EstateService`

**CRUD Operations:**

| Method | Purpose |
|---|---|
| `createEstate(req)` | Generates slug from name, validates uniqueness, saves estate |
| `getEstateBySlug(slug)` | Public — finds active estate by slug (used by branded booking page) |
| `getEstateById(id)` | Admin — finds by ID |
| `listActiveEstates()` | Returns all active estates ordered by name |
| `updateEstate(id, req)` | Partial update — only non-null fields are overwritten |
| `deactivateEstate(id)` | Soft-delete — sets `is_active = false` |

**Slug generation:**
```
"Greenpark Estate - Athi River"
  → NFD normalize → strip non-ASCII
  → lowercase
  → replace non-alphanumeric with '-'
  → trim leading/trailing '-'
  → "greenpark-estate-athi-river"
```

**Artisan Approval Operations:**

| Method | Purpose |
|---|---|
| `approveArtisan(estateId, req)` | Links artisan to estate. Validates: user exists, is WORKER, not already approved |
| `listApprovedArtisans(estateId)` | Lists all approved artisans with name, skill, rating |
| `removeArtisanApproval(estateId, artisanId)` | Deletes the approval link |
| `isArtisanApprovedForEstate(estateId, artisanId)` | Boolean check — used by `RankingService` for boost |

**Analytics:**

`getEstateAnalytics(estateId)` aggregates:
- Total bookings, completed, pending, cancelled (from `jobRepository.countByEstateIdAndStatus()`)
- Approved artisan count
- Top 5 artisans by completed job count for the estate
- Average rating (TODO: needs review↔job linkage)

### 2.4 API Endpoints

#### Public Endpoints (no auth)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/public/estate/{slug}` | Resolve estate by slug for branded booking page |

#### Admin Endpoints (requires ADMIN role)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/admin/estates` | Create new estate |
| `GET` | `/api/admin/estates` | List all active estates |
| `GET` | `/api/admin/estates/{id}` | Get estate by ID |
| `PUT` | `/api/admin/estates/{id}` | Update estate |
| `DELETE` | `/api/admin/estates/{id}` | Deactivate (soft-delete) estate |
| `GET` | `/api/admin/estates/{id}/analytics` | Estate analytics dashboard data |
| `POST` | `/api/admin/estates/{id}/artisans` | Approve an artisan for this estate |
| `GET` | `/api/admin/estates/{id}/artisans` | List approved artisans |
| `DELETE` | `/api/admin/estates/{id}/artisans/{artisanId}` | Remove artisan approval |

### 2.5 Frontend Pages

#### Public Branded Booking Page: `/estate/[slug]`

**Route**: `frontend/src/app/estate/[slug]/page.tsx`

**Data flow:**
1. `useParams()` → extract slug
2. `estatesAPI.resolve(slug)` → GET `/api/public/estate/{slug}`
3. On success → display estate-branded booking interface

**UI sections:**
- Estate header with name and area
- Service category grid (Electrician, Plumber, Mechanic, etc.)
- Available workers list (filtered by selected category)
- Booking form: name, phone, location (pre-filled from estate area), description, urgency
- "Book via WhatsApp" fallback link → `wa.me` with pre-filled text including estate area

**Key UX:**
- Customer location is pre-filled with the estate's area
- Category selection filters the worker list dynamically
- Dual booking path: form submission OR WhatsApp bot

#### Admin Management Page: `/dashboard/admin/estates`

**Route**: `frontend/src/app/dashboard/admin/estates/page.tsx`

**Features:**
- **Estate list** with active/inactive status badges
- **Create estate** form modal (name, area, coordinates, unit count, manager details, monthly fee, contract dates)
- **Edit estate** — inline or modal editing
- **Copy booking URL** — one-click copy of `fudari.co/estate/{slug}`
- **View analytics** — shows booking counts, top artisans, approved artisan count
- **Manage artisans** — approve by artisan ID, view approved list, remove approvals

### 2.6 Artisan Approval & Ranking

The approval system is a **ranking signal**, not a filter:

```
Customer books via estate link
  → ArtisanMatchService finds candidates
  → RankingService checks: isArtisanApprovedForEstate(estateId, artisanId)?
     YES → ranking boost applied
     NO  → artisan still visible, ranked normally
```

This means:
- Approved artisans appear higher in results for estate bookings
- Non-approved artisans can still be matched (wider pool = better coverage)
- Artisans are not locked to one estate — they remain in the general marketplace

### 2.7 Analytics

The `EstateAnalytics` response includes:

```json
{
  "estateId": 1,
  "estateName": "Greenpark Estate",
  "totalBookings": 142,
  "completedBookings": 98,
  "pendingBookings": 12,
  "cancelledBookings": 32,
  "avgRating": 0.0,          // TODO: not yet computed
  "approvedArtisans": 8,
  "topArtisans": [
    { "artisanId": 42, "name": "John Kamau", "skillType": "PLUMBER", "completedJobs": 23, "avgRating": 4.6 },
    ...
  ]
}
```

Data sources:
- `jobRepository.countByEstateId()` / `countByEstateIdAndStatus()` for booking metrics
- `approvalRepository.countByEstateId()` for approved artisan count
- Completed jobs grouped by artisan ID for top performers
- Trust score from user profile used as proxy for `avgRating` per artisan

### 2.8 Audit Findings

**Strengths:**
1. Clean B2B model — estates are a distribution channel, not a separate product
2. Slug-based URLs are shareable, printable, and SEO-friendly
3. Artisan approval as a ranking signal (not filter) keeps the marketplace open
4. Full analytics pipeline from booking to completion
5. Soft-delete pattern preserves historical data
6. Frontend offers dual booking path (form + WhatsApp)

**Issues:**

| Severity | Finding | Detail |
|---|---|---|
| **MEDIUM** | No contract expiry enforcement | `contract_end` is stored but never checked. Expired estates remain active and bookable |
| **MEDIUM** | No estate-scoped auth | Estate managers access admin dashboard; there's no role for "estate manager sees only their estate" |
| **MEDIUM** | `avgRating` always 0 | Analytics TODO — review↔job linkage not implemented; rating metric is placeholder |
| **LOW** | Slug not regenerated on name change | `updateEstate()` changes name but slug remains the original. Could cause URL confusion |
| **LOW** | No estate-to-booking foreign key | Bookings tagged with estate source via the booking flow, but the Job entity relationship is unclear from the code reviewed |
| **INFO** | No estate manager notifications | `manager_phone` is stored but no SMS/WhatsApp notification is sent when a booking arrives through the estate link |

---

## 3. Integration Points Between WhatsApp & Estates

The two systems connect in two ways:

### 3.1 WhatsApp Bot Link from Estate Pages

The estate branded booking page (`/estate/[slug]`) includes a "Book via WhatsApp" link:

```
wa.me/254703954539?text=Hi%2C%20I%20live%20in%20{estate.area}%20and%20need%20to%20book%20an%20artisan
```

This triggers `WhatsAppBotService.tryPrefillOrCreateSession()` **Pattern 2**, which:
- Pre-fills `customerLocation` with the estate area
- Skips the LOCATION step
- Starts the conversation at CATEGORY

### 3.2 Artisan Profile Links

When an estate page displays available workers, each artisan card includes a WhatsApp link:

```
wa.me/254703954539?text=Hi%2C%20I'd%20like%20to%20book%20{name}%20({skill})%20in%20{area}
```

This triggers **Pattern 1**, which:
- Pre-fills both `skillType` and `customerLocation`
- Skips to DESCRIPTION directly

### 3.3 Missing Integration

The WhatsApp booking flow does **not** currently tag bookings with an estate ID. The `referralSource` is set to `"whatsapp"` generically, not `"whatsapp:estate:{slug}"`. This means:
- Estate analytics won't count WhatsApp-originated bookings from the estate page
- No ranking boost is applied for estate-approved artisans in WhatsApp flow

---

## 4. Recommendations

### Critical (Before Production)

1. **Enforce webhook signature validation** — Make `whatsapp.app-secret` and `twilio.webhook.validate-signature` required in production profile. Reject unsigned requests.
2. **Add estate-aware referral tracking** — Pass estate slug through the WhatsApp pre-fill message and tag bookings with `referralSource = "whatsapp:estate:{slug}"` so estate analytics capture WhatsApp bookings.
3. **Implement contract expiry check** — Add a `@Scheduled` job or service-level check that deactivates estates past `contract_end`.

### High Priority

4. **WhatsApp-specific rate limiting** — Max 5 sessions per phone per hour; max 20 messages per session.
5. **Estate-scoped authentication** — Create an `ESTATE_MANAGER` role that can only view/manage their assigned estate(s).
6. **Interactive WhatsApp messages** — Use Meta button/list messages for category selection and confirmation. Better UX, fewer invalid inputs.
7. **Compute `avgRating` in analytics** — Link reviews to jobs, then aggregate by estate.

### Nice to Have

8. **Estate manager notifications** — Send SMS/WhatsApp to `manager_phone` when a booking arrives through the estate link.
9. **Reset error counter** on new session or after successful input.
10. **Timezone-aware schedule parsing** — Explicitly set EAT (UTC+3) rather than relying on server timezone.
11. **Slug regeneration option** — Allow admin to regenerate slug when estate name changes, with redirect from old slug.
12. **WhatsApp session analytics** — Track conversion funnel: how many sessions reach each state, drop-off rates.
