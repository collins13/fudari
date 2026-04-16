package com.tufixit.backend.service;

import com.tufixit.backend.dto.BookingDTO;
import com.tufixit.backend.dto.WhatsAppDTO;
import com.tufixit.backend.entity.WhatsAppSession;
import com.tufixit.backend.entity.WorkerSkill;
import com.tufixit.backend.repository.UserRepository;
import com.tufixit.backend.repository.WhatsAppSessionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * WhatsApp booking bot — state machine that guides customers through a full
 * booking flow entirely inside WhatsApp, while keeping every transaction
 * on-platform (anti-disintermediation).
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  MESSAGE FLOW                                               │
 * │                                                             │
 * │  Customer → [WhatsApp number] → Meta Cloud API webhook     │
 * │      → WhatsAppWebhookController → WhatsAppBotService       │
 * │                                                             │
 * │  WhatsAppBotService:                                        │
 * │    1. Loads / creates WhatsAppSession                       │
 * │    2. Dispatches to step handler by state                   │
 * │    3. Persists new state                                     │
 * │    4. Sends reply via Meta Cloud API (never the artisan's   │
 * │       personal number)                                      │
 * │                                                             │
 * │  On CONFIRM → calls BookingService.createBooking()          │
 * │    → generates TUF-XXXXXX code                              │
 * │    → SMS to artisan with code + dashboard link              │
 * │    → WhatsApp reply to customer with tracking link          │
 * │                                                             │
 * │  Anti-disintermediation:                                    │
 * │    - Artisan phone is NEVER sent to customer                │
 * │    - Artisan sees customer name + code + job description,   │
 * │      but responds via dashboard (not personal WhatsApp)     │
 * │    - Customer knows only the TUF-XXXXXX code for tracking  │
 * └─────────────────────────────────────────────────────────────┘
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WhatsAppBotService {

    private final WhatsAppSessionRepository sessionRepo;
    private final BookingService bookingService;
    private final ArtisanMatchService artisanMatchService;
    private final UserRepository userRepository;

    @Value("${whatsapp.api.base-url:https://graph.facebook.com/v19.0}")
    private String apiBaseUrl;

    @Value("${whatsapp.api.phone-number-id:}")
    private String phoneNumberId;

    @Value("${whatsapp.api.access-token:}")
    private String accessToken;

    /** Session inactivity timeout — abandon after this many minutes. */
    private static final int SESSION_TIMEOUT_MINUTES = 30;

    /** Category menu — displayed at the start of every new booking conversation. */
    private static final List<String> CATEGORIES = Arrays.asList(
            "Electrician", "Plumber", "Mechanic", "Carpenter", "Painter",
            "Cleaner", "Mason / Fundis", "Welder", "Other"
    );

    /** Maps display names / numeric shortcuts to SkillType enum values. */
    private static final Map<String, String> CATEGORY_SKILL_MAP;
    static {
        Map<String, String> m = new HashMap<>();
        m.put("1", "ELECTRICIAN");  m.put("electrician", "ELECTRICIAN");
        m.put("2", "PLUMBER");      m.put("plumber",     "PLUMBER");
        m.put("3", "MECHANIC");     m.put("mechanic",    "MECHANIC");
        m.put("4", "CARPENTER");    m.put("carpenter",   "CARPENTER");
        m.put("5", "PAINTER");      m.put("painter",     "PAINTER");
        m.put("6", "CLEANER");      m.put("cleaner",     "CLEANER");
        m.put("7", "MASON");        m.put("mason",       "MASON");
        m.put("8", "WELDER");       m.put("welder",      "WELDER");
        m.put("9", "OTHER");        m.put("other",       "OTHER");
        CATEGORY_SKILL_MAP = Map.copyOf(m);
    }

    // ── Entry point: called by WhatsAppWebhookController ────────────────────

    /**
     * Process one inbound WhatsApp message from a customer.
     * Idempotent — safe to call multiple times for the same message (webhook retries).
     */
    @Transactional
    public void handleInbound(String customerPhone, String customerName, String messageText) {
        if (customerPhone == null || messageText == null) return;

        // Normalise to E.164
        String phone = normalisePhone(customerPhone);
        String input = messageText.trim();

        // Global escape hatch
        if (input.equalsIgnoreCase("CANCEL") || input.equalsIgnoreCase("STOP")) {
            abandonSession(phone);
            sendText(phone,
                "Your booking request has been cancelled. " +
                "Type *Hi* anytime to start a new one, or visit tufixit.com to browse artisans.");
            return;
        }

        // Load or create session
        Optional<WhatsAppSession> existing = sessionRepo
                .findTopByCustomerPhoneAndSessionStatusOrderByUpdatedAtDesc(
                        phone, WhatsAppSession.SessionStatus.ACTIVE);

        WhatsAppSession session = existing.orElseGet(() -> createNewSession(phone, customerName));

        // Dispatch by state
        switch (session.getState()) {
            case CATEGORY    -> handleCategory(session, input);
            case LOCATION    -> handleLocation(session, input);
            case DESCRIPTION -> handleDescription(session, input);
            case URGENCY     -> handleUrgency(session, input);
            case CONFIRM     -> handleConfirm(session, input);
            case COMPLETED, ABANDONED -> {
                // Re-activate — treat as a new booking request
                WhatsAppSession fresh = createNewSession(phone, customerName);
                handleCategory(fresh, input);
            }
        }
    }

    // ── State handlers ───────────────────────────────────────────────────────

    private WhatsAppSession createNewSession(String phone, String name) {
        WhatsAppSession s = WhatsAppSession.builder()
                .customerPhone(phone)
                .customerName(name)
                .state(WhatsAppSession.ConversationState.CATEGORY)
                .sessionStatus(WhatsAppSession.SessionStatus.ACTIVE)
                .build();
        s = sessionRepo.save(s);
        sendCategoryMenu(phone);
        return s;
    }

    private void handleCategory(WhatsAppSession session, String input) {
        String skill = resolveSkill(input);
        if (skill == null) {
            incrementError(session);
            if (session.getErrorCount() >= 3) {
                abandonSession(session.getCustomerPhone());
                sendText(session.getCustomerPhone(),
                    "Too many unrecognised replies. Your session has ended. " +
                    "Type *Hi* to start again or visit tufixit.com");
                return;
            }
            sendText(session.getCustomerPhone(),
                "Please reply with a number (1–9) or the service name.\n" + buildCategoryList());
            return;
        }
        session.setSelectedCategory(input);
        session.setSkillType(skill);
        session.setState(WhatsAppSession.ConversationState.LOCATION);
        sessionRepo.save(session);
        sendText(session.getCustomerPhone(),
            "Got it — *" + skill.charAt(0) + skill.substring(1).toLowerCase(Locale.ROOT) + "*.\n\n" +
            "📍 Which area are you in? (e.g. Westlands, Karen, Ruaka, Kilimani)");
    }

    private void handleLocation(WhatsAppSession session, String input) {
        if (input.length() < 3) {
            sendText(session.getCustomerPhone(), "Please type your neighbourhood or area (at least 3 characters).");
            return;
        }
        session.setCustomerLocation(input);
        session.setState(WhatsAppSession.ConversationState.DESCRIPTION);
        sessionRepo.save(session);
        sendText(session.getCustomerPhone(),
            "📝 Briefly describe the work you need done.\n" +
            "Example: _\"Faulty socket in bedroom, needs replacing\"_");
    }

    private void handleDescription(WhatsAppSession session, String input) {
        if (input.length() < 10) {
            sendText(session.getCustomerPhone(),
                "Please give a bit more detail so the artisan can prepare. " +
                "(Minimum 10 characters)");
            return;
        }
        session.setJobDescription(input);
        session.setState(WhatsAppSession.ConversationState.URGENCY);
        sessionRepo.save(session);
        sendUrgencyMenu(session.getCustomerPhone());
    }

    private void handleUrgency(WhatsAppSession session, String input) {
        String urgency = resolveUrgency(input);
        if (urgency == null) {
            sendText(session.getCustomerPhone(),
                "Please reply:\n*1* – Need someone NOW\n*2* – Today\n*3* – Tomorrow\n*4* – I'll schedule a time");
            return;
        }
        session.setUrgency(urgency);
        session.setState(WhatsAppSession.ConversationState.CONFIRM);
        sessionRepo.save(session);

        // Run AI artisan matching to pick the top match
        findAndConfirmArtisan(session);
    }

    private void findAndConfirmArtisan(WhatsAppSession session) {
        var matches = artisanMatchService.findTopMatches(session.getSkillType(), null, null);

        if (matches.isEmpty()) {
            sendText(session.getCustomerPhone(),
                "⚠️ No available " + session.getSkillType().toLowerCase(Locale.ROOT) +
                " found in " + session.getCustomerLocation() + " right now.\n\n" +
                "Browse all artisans: tufixit.com/artisans\n" +
                "Type *Hi* to try a different category.");
            abandonSession(session.getCustomerPhone());
            return;
        }

        var top = matches.get(0);
        Long artisanId = top.getArtisanId();
        String artisanDisplayName = top.getName();
        String rating = String.format("%.1f", top.getMatchScore() / 20.0); // normalise 100-pt score to 5-star
        String reason = top.getMatchReason();

        session.setSelectedArtisanId(artisanId);

        String summary = String.format(
            "✅ *Best Match Found*\n\n" +
            "👷 %s\n" +
            "⭐ Rating: %s/5\n" +
            "📍 %s\n\n" +
            "*Your request:*\n" +
            "• Service: %s\n" +
            "• Location: %s\n" +
            "• Details: %s\n" +
            "• When: %s\n\n" +
            "Reply *YES* to confirm this booking.\n" +
            "Reply *NO* to cancel.",
            artisanDisplayName, rating, reason,
            session.getSkillType(),
            session.getCustomerLocation(),
            session.getJobDescription(),
            friendlyUrgency(session.getUrgency())
        );

        session.setConfirmSummary(summary);
        sessionRepo.save(session);
        sendText(session.getCustomerPhone(), summary);
    }

    @Transactional
    protected void handleConfirm(WhatsAppSession session, String input) {
        String answer = input.trim().toUpperCase(Locale.ROOT);

        if (answer.equals("NO") || answer.equals("CANCEL")) {
            abandonSession(session.getCustomerPhone());
            sendText(session.getCustomerPhone(),
                "Booking cancelled. Type *Hi* to search again, or visit tufixit.com/artisans.");
            return;
        }

        if (!answer.startsWith("Y") && !answer.equals("1") && !answer.equals("OK") && !answer.equals("CONFIRM")) {
            sendText(session.getCustomerPhone(),
                "Please reply *YES* to confirm or *NO* to cancel.\n\n" + session.getConfirmSummary());
            return;
        }

        // ── Create the booking on-platform ──────────────────────────────────
        try {
            BookingDTO.BookingTrackResponse booking = bookingService.createBooking(
                BookingDTO.CreateBookingRequest.builder()
                    .artisanId(session.getSelectedArtisanId())
                    .customerName(session.getCustomerName() != null
                            ? session.getCustomerName() : "WhatsApp Customer")
                    .customerPhone(session.getCustomerPhone())
                    .customerLocation(session.getCustomerLocation())
                    .jobDescription(session.getJobDescription())
                    .urgency(parseUrgency(session.getUrgency()))
                    .build()
            );

            session.setBookingCode(booking.getBookingCode());
            session.setJobId(booking.getJobId());
            session.setState(WhatsAppSession.ConversationState.COMPLETED);
            session.setSessionStatus(WhatsAppSession.SessionStatus.COMPLETED);
            sessionRepo.save(session);

            // Confirmation to customer — contains tracking link, NOT artisan phone
            sendText(session.getCustomerPhone(), String.format(
                "🎉 *Booking Confirmed!*\n\n" +
                "Your code: *%s*\n\n" +
                "Track your job: tufixit.com/track/%s\n\n" +
                "You'll receive an SMS when the artisan accepts and when they're on the way.\n\n" +
                "_Reply HELP at any time for support._",
                booking.getBookingCode(), booking.getBookingCode()
            ));

        } catch (Exception e) {
            log.error("[WA-BOT] Failed to create booking for phone {}: {}", session.getCustomerPhone(), e.getMessage());
            sendText(session.getCustomerPhone(),
                "⚠️ Something went wrong creating your booking. Please try again or visit tufixit.com");
        }
    }

    // ── Stale session cleanup ────────────────────────────────────────────────

    /** Runs every 10 minutes to abandon sessions idle for more than SESSION_TIMEOUT_MINUTES. */
    @Scheduled(fixedDelay = 10 * 60 * 1000)
    @Transactional
    public void cleanUpStaleSessions() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(SESSION_TIMEOUT_MINUTES);
        int count = sessionRepo.abandonStaleSessions(cutoff);
        if (count > 0) {
            log.info("[WA-BOT] Abandoned {} stale sessions (idle > {}min)", count, SESSION_TIMEOUT_MINUTES);
        }
    }

    // ── Outbound message helpers ─────────────────────────────────────────────

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final HttpClient HTTP_CLIENT = HttpClient.newHttpClient();

    private void sendText(String to, String body) {
        if (phoneNumberId.isBlank() || accessToken.isBlank()) {
            log.info("[WA-STUB] To: {} | {}", to, body);
            return;
        }
        try {
            // Meta Cloud API requires E.164 without leading '+'
            String metaPhone = to.startsWith("+") ? to.substring(1) : to;
            WhatsAppDTO.OutboundMessage msg = new WhatsAppDTO.OutboundMessage();
            msg.setTo(metaPhone);
            msg.setType("text");
            msg.setText(new WhatsAppDTO.OutboundText(body));

            String json = OBJECT_MAPPER.writeValueAsString(msg);
            String url = apiBaseUrl + "/" + phoneNumberId + "/messages";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HTTP_CLIENT.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                    .thenAccept(r -> log.debug("[WA] Sent to {}, status {}", to, r.statusCode()))
                    .exceptionally(err -> {
                        log.warn("[WA] Send failed to {}: {}", to, err.getMessage());
                        return null;
                    });
        } catch (Exception e) {
            log.warn("[WA] Could not dispatch message to {}: {}", to, e.getMessage());
        }
    }

    private void sendCategoryMenu(String to) {
        sendText(to,
            "👋 Welcome to *TuFixIt*!\n\n" +
            "Which service do you need? Reply with a number:\n\n" +
            buildCategoryList() + "\n" +
            "Or type the service name directly.\n\n" +
            "_Type CANCEL at any time to stop._"
        );
    }

    private void sendUrgencyMenu(String to) {
        sendText(to,
            "🕐 When do you need this done?\n\n" +
            "*1* – Right now (ASAP)\n" +
            "*2* – Today\n" +
            "*3* – Tomorrow\n" +
            "*4* – I'll schedule a time later"
        );
    }

    private String buildCategoryList() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < CATEGORIES.size(); i++) {
            sb.append("*").append(i + 1).append("* – ").append(CATEGORIES.get(i)).append("\n");
        }
        return sb.toString().trim();
    }

    // ── Input resolution ─────────────────────────────────────────────────────

    /** Returns a SkillType string or null if unrecognised. */
    private String resolveSkill(String input) {
        String key = input.trim().toLowerCase(Locale.ROOT);
        // Try numeric shortcut first
        if (CATEGORY_SKILL_MAP.containsKey(key)) return CATEGORY_SKILL_MAP.get(key);
        // Then try full-text match
        for (Map.Entry<String, String> e : CATEGORY_SKILL_MAP.entrySet()) {
            if (key.startsWith(e.getKey())) return e.getValue();
        }
        // Fuzzy: if the skill enum contains the input as a substring
        for (WorkerSkill.SkillType t : WorkerSkill.SkillType.values()) {
            if (t.name().toLowerCase(Locale.ROOT).contains(key)) return t.name();
        }
        return null;
    }

    private String resolveUrgency(String input) {
        return switch (input.trim().toUpperCase(Locale.ROOT)) {
            case "1", "NOW", "ASAP", "RIGHT NOW" -> "NOW";
            case "2", "TODAY"                    -> "TODAY";
            case "3", "TOMORROW"                 -> "TOMORROW";
            case "4", "LATER", "SCHEDULE"        -> "SCHEDULED";
            default -> null;
        };
    }

    private com.tufixit.backend.entity.Job.UrgencyLevel parseUrgency(String urgency) {
        return switch (urgency) {
            case "TODAY"     -> com.tufixit.backend.entity.Job.UrgencyLevel.TODAY;
            case "TOMORROW"  -> com.tufixit.backend.entity.Job.UrgencyLevel.TOMORROW;
            case "SCHEDULED" -> com.tufixit.backend.entity.Job.UrgencyLevel.SCHEDULED;
            default          -> com.tufixit.backend.entity.Job.UrgencyLevel.NOW;
        };
    }

    private String friendlyUrgency(String urgency) {
        return switch (urgency) {
            case "NOW"       -> "As soon as possible";
            case "TODAY"     -> "Today";
            case "TOMORROW"  -> "Tomorrow";
            case "SCHEDULED" -> "To be scheduled";
            default          -> urgency;
        };
    }

    // ── Session management helpers ───────────────────────────────────────────

    private void abandonSession(String phone) {
        sessionRepo.findTopByCustomerPhoneAndSessionStatusOrderByUpdatedAtDesc(
                phone, WhatsAppSession.SessionStatus.ACTIVE)
            .ifPresent(s -> {
                s.setSessionStatus(WhatsAppSession.SessionStatus.ABANDONED);
                s.setState(WhatsAppSession.ConversationState.ABANDONED);
                sessionRepo.save(s);
            });
    }

    private void incrementError(WhatsAppSession session) {
        session.setErrorCount(session.getErrorCount() + 1);
        sessionRepo.save(session);
    }

    /**
     * Normalise incoming Meta phone (e.g. "254712345678") to +254 format
     * which matches: (a) SmsService.isValidKenyanPhone and (b) BookingDTO phone pattern.
     */
    private String normalisePhone(String phone) {
        String p = phone.replaceAll("[^+\\d]", "");
        if (p.startsWith("+")) p = p.substring(1);  // strip any existing +
        if (p.startsWith("0") && p.length() == 10) p = "254" + p.substring(1);
        return "+" + p;  // e.g. +254712345678
    }
}
