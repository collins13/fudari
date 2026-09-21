package com.tufixit.backend.service;

import com.tufixit.backend.dto.AiDTO;
import com.tufixit.backend.dto.BookingDTO;
import com.tufixit.backend.entity.Estate;
import com.tufixit.backend.entity.WhatsAppSession;
import com.tufixit.backend.entity.WorkerSkill;
import com.tufixit.backend.repository.EstateRepository;
import com.tufixit.backend.repository.UserRepository;
import com.tufixit.backend.repository.WhatsAppSessionRepository;
import com.tufixit.backend.service.whatsapp.WhatsAppProviderManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * WhatsApp booking bot — state machine that guides customers through a full
 * booking flow entirely inside WhatsApp, while keeping every transaction
 * on-platform (anti-disintermediation).
 *
 * Flow: CATEGORY -> LOCATION -> DESCRIPTION -> URGENCY [-> SCHEDULE_TIME] -> CONFIRM -> COMPLETED
 *
 * Features:
 *   - Pre-filled message parsing (from wa.me links) - skips ahead when intent is clear
 *   - BACK command to return to previous step
 *   - Top 3 artisan matches for customer choice
 *   - SCHEDULED urgency with date/time collection
 *   - Swahili/Sheng category input support
 *   - Message deduplication via messageId
 *   - CANCEL, STOP, HELP global commands
 *   - Referral attribution ("whatsapp" channel)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WhatsAppBotService {

    private final WhatsAppSessionRepository sessionRepo;
    private final BookingService bookingService;
    private final ArtisanMatchService artisanMatchService;
    private final UserRepository userRepository;
    private final WhatsAppProviderManager whatsAppProviderManager;
    private final GeocodingService geocodingService;
    private final EstateRepository estateRepository;

    private static final int SESSION_TIMEOUT_MINUTES = 30;
    private static final int SESSION_HARD_EXPIRE_MINUTES = 120;

    /** Matches START_ESTATE_{CODE} where CODE is a 4-char alphanumeric short code. */
    private static final Pattern ESTATE_SHORT_CODE_PATTERN = Pattern.compile(
            "(?i)^START_ESTATE_([A-Z0-9]{4})$"
    );

    private static final List<String> CATEGORIES = Arrays.asList(
            "Electrician", "Plumber", "Mechanic", "Carpenter", "Painter",
            "Cleaner / Mama Fua", "Mason / Fundis", "Welder",
            "Boda / Tuk Tuk", "Movers / Delivery", "Barber / Salon",
            "Photo / Design / IT", "Other"
    );

    /** Maps display names / numeric shortcuts / Swahili to SkillType enum values. */
    private static final Map<String, String> CATEGORY_SKILL_MAP;
    static {
        Map<String, String> m = new HashMap<>();
        m.put("1", "ELECTRICIAN");  m.put("2", "PLUMBER");      m.put("3", "MECHANIC");
        m.put("4", "CARPENTER");    m.put("5", "PAINTER");       m.put("6", "CLEANER");
        m.put("7", "MASON");        m.put("8", "WELDER");        m.put("9", "BODA_BODA");
        m.put("10", "MOVER");       m.put("11", "BARBER");       m.put("12", "PHOTOGRAPHER");
        m.put("13", "OTHER");
        m.put("electrician", "ELECTRICIAN"); m.put("plumber", "PLUMBER");
        m.put("mechanic", "MECHANIC");       m.put("carpenter", "CARPENTER");
        m.put("painter", "PAINTER");         m.put("cleaner", "CLEANER");
        m.put("mason", "MASON");             m.put("welder", "WELDER");
        m.put("mama fua", "MAMA_FUA");       m.put("laundry", "MAMA_FUA");
        m.put("boda", "BODA_BODA");          m.put("boda boda", "BODA_BODA");
        m.put("tuk tuk", "TUK_TUK");         m.put("tuktuk", "TUK_TUK");
        m.put("mover", "MOVER");             m.put("movers", "MOVER");
        m.put("delivery", "COURIER");        m.put("courier", "COURIER");
        m.put("barber", "BARBER");           m.put("kinyozi", "BARBER");
        m.put("salon", "HAIR_SALON");        m.put("saluni", "HAIR_SALON");
        m.put("makeup", "MAKEUP_ARTIST");    m.put("urembo", "MAKEUP_ARTIST");
        m.put("car wash", "CAR_WASH");       m.put("kuosha gari", "CAR_WASH");
        m.put("tyre", "TYRE_SERVICES");      m.put("matairi", "TYRE_SERVICES");
        m.put("photographer", "PHOTOGRAPHER"); m.put("photo", "PHOTOGRAPHER");
        m.put("designer", "GRAPHIC_DESIGNER"); m.put("design", "GRAPHIC_DESIGNER");
        m.put("it", "IT_TECHNICIAN");        m.put("computer", "IT_TECHNICIAN");
        m.put("other", "OTHER");
        // Swahili / Sheng
        m.put("fundi stima", "ELECTRICIAN"); m.put("stima", "ELECTRICIAN");
        m.put("fundi mabomba", "PLUMBER");   m.put("mabomba", "PLUMBER");
        m.put("fundi magari", "MECHANIC");   m.put("magari", "MECHANIC");
        m.put("fundi seremala", "CARPENTER");m.put("seremala", "CARPENTER");
        m.put("fundi rangi", "PAINTER");     m.put("rangi", "PAINTER");
        m.put("fundi usafi", "CLEANER");     m.put("usafi", "CLEANER");
        m.put("fundi ujenzi", "MASON");      m.put("ujenzi", "MASON");
        m.put("fundi chuma", "WELDER");      m.put("chuma", "WELDER");
        m.put("fundis", "MASON");              m.put("fundi", "MASON");
        CATEGORY_SKILL_MAP = Map.copyOf(m);
    }

    /**
     * Regex to parse pre-filled messages from whatsappBotLink():
     *   "Hi, I'd like to book John Kamau (Plumber) in Kilimani"
     */
    private static final Pattern PREFILL_BOOK_PATTERN = Pattern.compile(
            "(?i)book\\s+.+?\\(\\s*([A-Za-z /]+?)\\s*\\)\\s+in\\s+(.+)$"
    );
    private static final Pattern PREFILL_AREA_PATTERN = Pattern.compile(
            "(?i)i\\s+live\\s+in\\s+(.+?)\\s+and\\s+need"
    );

    // == Entry point ==

    @Transactional
    public void handleInbound(String customerPhone, String customerName, String messageText) {
        handleInbound(customerPhone, customerName, messageText, null);
    }

    @Transactional
    public void handleInbound(String customerPhone, String customerName, String messageText, String messageId) {
        if (customerPhone == null || messageText == null) return;

        String phone = normalisePhone(customerPhone);
        String input = messageText.trim();

        // Global: CANCEL / STOP
        if (input.equalsIgnoreCase("CANCEL") || input.equalsIgnoreCase("STOP")) {
            abandonSession(phone);
            sendText(phone,
                "Your booking request has been cancelled. " +
                "Type *Hi* anytime to start a new one, or visit fudari.co to browse artisans.");
            return;
        }

        // Global: HELP
        if (input.equalsIgnoreCase("HELP")) {
            sendText(phone,
                "\u2139\ufe0f *Fudari WhatsApp Help*\n\n" +
                "\u2022 Type *Hi* to start a new booking\n" +
                "\u2022 Type *BACK* to go to the previous step\n" +
                "\u2022 Type *CANCEL* to stop the current booking\n" +
                "\u2022 Visit fudari.co for full platform access\n" +
                "\u2022 Email support@fudari.co for assistance\n\n" +
                "_Your data is safe \u2014 we never share your phone number with artisans._");
            return;
        }

        // ── Estate Short-Code: START_ESTATE_{CODE} ──────────────────────────
        Matcher estateCodeMatch = ESTATE_SHORT_CODE_PATTERN.matcher(input);
        if (estateCodeMatch.matches()) {
            String code = estateCodeMatch.group(1).toUpperCase(Locale.ROOT);
            Optional<Estate> estateOpt = estateRepository.findByShortCodeAndIsActive(code, true);
            if (estateOpt.isEmpty()) {
                sendText(phone, "Sorry, estate code *" + code + "* was not found. " +
                        "Please check the code and try again, or type *Hi* to start a normal booking.");
                return;
            }
            Estate estate = estateOpt.get();
            // Abandon any existing active session for this phone
            sessionRepo.findTopByCustomerPhoneAndSessionStatusOrderByUpdatedAtDesc(
                    phone, WhatsAppSession.SessionStatus.ACTIVE)
                    .ifPresent(s -> {
                        s.setSessionStatus(WhatsAppSession.SessionStatus.ABANDONED);
                        s.setState(WhatsAppSession.ConversationState.ABANDONED);
                        sessionRepo.save(s);
                    });

            WhatsAppSession estateSession = WhatsAppSession.builder()
                    .customerPhone(phone)
                    .customerName(customerName)
                    .state(WhatsAppSession.ConversationState.CATEGORY)
                    .sessionStatus(WhatsAppSession.SessionStatus.ACTIVE)
                    .estateId(estate.getId())
                    .customerLocation(estate.getArea())
                    .lastMessageId(messageId)
                    .build();
            sessionRepo.save(estateSession);

            String welcome = estate.getBrandWelcomeMessage() != null
                    ? estate.getBrandWelcomeMessage()
                    : "Welcome to the *" + estate.getName() + "* maintenance portal!";

            sendText(phone,
                "\ud83c\udfe0 " + welcome + "\n\n" +
                "Which service do you need? Reply with a number:\n\n" +
                buildCategoryList() + "\n" +
                "Or type the service name directly.\n\n" +
                "_Powered by Fudari \u2014 type CANCEL at any time to stop._");
            return;
        }

        // Load or create session
        Optional<WhatsAppSession> existing = sessionRepo
                .findTopByCustomerPhoneAndSessionStatusOrderByUpdatedAtDesc(
                        phone, WhatsAppSession.SessionStatus.ACTIVE);

        WhatsAppSession session = existing.orElse(null);

        // Deduplication
        if (session != null && messageId != null && messageId.equals(session.getLastMessageId())) {
            log.debug("[WA-BOT] Duplicate messageId {} for phone {}, skipping", messageId, phone);
            return;
        }

        // Global: BACK command
        if (input.equalsIgnoreCase("BACK")) {
            if (session != null) {
                handleBack(session);
            } else {
                sendText(phone, "Nothing to go back to. Type *Hi* to start a new booking.");
            }
            return;
        }

        // No active session — check for a recently expired session to offer resume
        if (session == null) {
            Optional<WhatsAppSession> expired = sessionRepo
                    .findTopByCustomerPhoneAndSessionStatusOrderByUpdatedAtDesc(
                            phone, WhatsAppSession.SessionStatus.EXPIRED);

            if (expired.isPresent()) {
                WhatsAppSession expiredSession = expired.get();
                // Only offer resume if the session had meaningful progress
                if (expiredSession.getSkillType() != null) {
                    offerResume(expiredSession, messageId);
                    return;
                }
                // Shallow session (only CATEGORY) — just abandon and start fresh
                expiredSession.setSessionStatus(WhatsAppSession.SessionStatus.ABANDONED);
                expiredSession.setState(WhatsAppSession.ConversationState.ABANDONED);
                sessionRepo.save(expiredSession);
            }

            session = tryPrefillOrCreateSession(phone, customerName, input, messageId);
            // Initial prompt already sent by tryPrefillOrCreateSession; don't double-dispatch
            return;
        }

        if (messageId != null) {
            session.setLastMessageId(messageId);
        }

        // Dispatch by state
        switch (session.getState()) {
            case CATEGORY      -> handleCategory(session, input);
            case LOCATION       -> handleLocation(session, input);
            case DESCRIPTION    -> handleDescription(session, input);
            case URGENCY        -> handleUrgency(session, input);
            case SCHEDULE_TIME  -> handleScheduleTime(session, input);
            case CONFIRM        -> handleConfirm(session, input);
            case RESUME_PROMPT  -> handleResumePrompt(session, input, customerName, messageId);
            case COMPLETED, ABANDONED -> {
                // Session is finished; start fresh. tryPrefill already sends the prompt.
                tryPrefillOrCreateSession(phone, customerName, input, messageId);
            }
        }
    }

    // == Pre-filled message parsing ==

    private WhatsAppSession tryPrefillOrCreateSession(String phone, String name, String input, String messageId) {
        // Pattern 1: "Hi, I'd like to book John Kamau (Plumber) in Kilimani"
        Matcher bookMatch = PREFILL_BOOK_PATTERN.matcher(input);
        if (bookMatch.find()) {
            String skillText = bookMatch.group(1).trim();
            String location = bookMatch.group(2).trim();
            String skill = resolveSkill(skillText);
            if (skill != null && location.length() >= 3) {
                WhatsAppSession s = WhatsAppSession.builder()
                        .customerPhone(phone)
                        .customerName(name)
                        .state(WhatsAppSession.ConversationState.DESCRIPTION)
                        .sessionStatus(WhatsAppSession.SessionStatus.ACTIVE)
                        .selectedCategory(skillText)
                        .skillType(skill)
                        .customerLocation(location)
                        .lastMessageId(messageId)
                        .build();
                s = sessionRepo.save(s);
                String friendlySkill = skill.charAt(0) + skill.substring(1).toLowerCase(Locale.ROOT);
                sendText(phone,
                    "\ud83d\udc4b Welcome to *Fudari*! I see you need a *" + friendlySkill +
                    "* in *" + location + "*.\n\n" +
                    "\ud83d\udcdd Please briefly describe the work you need done.\n" +
                    "Example: _\"Faulty socket in bedroom, needs replacing\"_\n\n" +
                    "_Type BACK to change category or location._");
                return null; // fully handled
            }
        }

        // Pattern 2: "Hi, I live in Greenpark Estate and need to book an artisan"
        Matcher areaMatch = PREFILL_AREA_PATTERN.matcher(input);
        if (areaMatch.find()) {
            String location = areaMatch.group(1).trim();
            if (location.length() >= 3) {
                WhatsAppSession s = WhatsAppSession.builder()
                        .customerPhone(phone)
                        .customerName(name)
                        .state(WhatsAppSession.ConversationState.CATEGORY)
                        .sessionStatus(WhatsAppSession.SessionStatus.ACTIVE)
                        .customerLocation(location)
                        .build();
                if (messageId != null) s.setLastMessageId(messageId);
                s = sessionRepo.save(s);
                sendText(phone,
                    "\ud83d\udc4b Welcome to *Fudari*! I see you're in *" + location + "*.\n\n" +
                    "Which service do you need? Reply with a number:\n\n" +
                    buildCategoryList() + "\n" +
                    "Or type the service name directly.\n\n" +
                    "_Type CANCEL at any time to stop._");
                return s;
            }
        }

        return createNewSession(phone, name);
    }

    // == State handlers ==

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
                    "Type *Hi* to start again or visit fudari.co");
                return;
            }
            sendText(session.getCustomerPhone(),
                "Please reply with a number (1\u20139) or the service name.\n" + buildCategoryList());
            return;
        }
        session.setSelectedCategory(input);
        session.setSkillType(skill);
        String friendlySkill = skill.charAt(0) + skill.substring(1).toLowerCase(Locale.ROOT);

        // If location was pre-filled (from pattern 2), skip to description
        if (session.getCustomerLocation() != null && session.getCustomerLocation().length() >= 3) {
            session.setState(WhatsAppSession.ConversationState.DESCRIPTION);
            sessionRepo.save(session);
            sendText(session.getCustomerPhone(),
                "Got it \u2014 *" + friendlySkill + "* in *" + session.getCustomerLocation() + "*.\n\n" +
                "\ud83d\udcdd Briefly describe the work you need done.\n" +
                "Example: _\"Faulty socket in bedroom, needs replacing\"_");
        } else {
            session.setState(WhatsAppSession.ConversationState.LOCATION);
            sessionRepo.save(session);
            sendText(session.getCustomerPhone(),
                "Got it \u2014 *" + friendlySkill + "*.\n\n" +
                "\ud83d\udccd Which area are you in? (e.g. Westlands, Karen, Ruaka, Kilimani)");
        }
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
            "\ud83d\udcdd Briefly describe the work you need done.\n" +
            "Example: _\"Faulty socket in bedroom, needs replacing\"_");
    }

    private void handleDescription(WhatsAppSession session, String input) {
        if (input.length() < 10) {
            sendText(session.getCustomerPhone(),
                "Please give a bit more detail so the artisan can prepare. " +
                "(Minimum 10 characters)");
            return;
        }

        String rejection = validateDescription(input);
        if (rejection != null) {
            incrementError(session);
            if (session.getErrorCount() >= 3) {
                abandonSession(session.getCustomerPhone());
                sendText(session.getCustomerPhone(),
                    "Too many invalid descriptions. Your session has ended. " +
                    "Type *Hi* to start again or visit fudari.co");
                return;
            }
            sendText(session.getCustomerPhone(), rejection);
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
                "Please reply:\n*1* \u2013 Need someone NOW\n*2* \u2013 Today\n*3* \u2013 Tomorrow\n*4* \u2013 I'll schedule a time");
            return;
        }
        session.setUrgency(urgency);

        if ("SCHEDULED".equals(urgency)) {
            session.setState(WhatsAppSession.ConversationState.SCHEDULE_TIME);
            sessionRepo.save(session);
            sendText(session.getCustomerPhone(),
                "\ud83d\udcc5 When would you like the artisan to come?\n\n" +
                "Examples:\n" +
                "\u2022 _Monday 2pm_\n" +
                "\u2022 _Tomorrow 10:00_\n" +
                "\u2022 _20/04 at 14:00_\n" +
                "\u2022 _Next Saturday morning_\n\n" +
                "Type *BACK* to change urgency.");
            return;
        }

        session.setState(WhatsAppSession.ConversationState.CONFIRM);
        sessionRepo.save(session);

        sendText(session.getCustomerPhone(),
            "\ud83d\udd0d Finding the best artisans near *" + session.getCustomerLocation() + "*...");
        findAndConfirmArtisan(session);
    }

    private void handleScheduleTime(WhatsAppSession session, String input) {
        LocalDateTime parsed = parseScheduleTime(input);
        if (parsed == null) {
            sendText(session.getCustomerPhone(),
                "I couldn't understand that time. Please try again:\n" +
                "\u2022 _Monday 2pm_\n" +
                "\u2022 _20/04 at 14:00_\n" +
                "\u2022 _Tomorrow 10:00_");
            return;
        }
        if (parsed.isBefore(LocalDateTime.now())) {
            sendText(session.getCustomerPhone(), "That time is in the past. Please enter a future date/time.");
            return;
        }
        session.setScheduledTimeText(input);
        session.setScheduledTime(parsed);
        session.setState(WhatsAppSession.ConversationState.CONFIRM);
        sessionRepo.save(session);

        sendText(session.getCustomerPhone(),
            "\ud83d\udd0d Finding the best artisans near *" + session.getCustomerLocation() + "*...");
        findAndConfirmArtisan(session);
    }

    private void findAndConfirmArtisan(WhatsAppSession session) {
        Double lat = null;
        Double lng = null;
        double[] coords = geocodingService.geocode(session.getCustomerLocation());
        if (coords != null) {
            lat = coords[0];
            lng = coords[1];
            log.debug("[WA-BOT] Geocoded '{}' -> [{}, {}]", session.getCustomerLocation(), lat, lng);
        }

        var matches = artisanMatchService.findTopMatches(
                session.getSkillType(), lat, lng, session.getEstateId());

        if (matches.isEmpty()) {
            sendText(session.getCustomerPhone(),
                "\u26a0\ufe0f No available " + session.getSkillType().toLowerCase(Locale.ROOT) +
                " found near " + session.getCustomerLocation() + " right now.\n\n" +
                "Browse all artisans: fudari.co/artisans\n" +
                "Type *Hi* to try a different category.");
            abandonSession(session.getCustomerPhone());
            return;
        }

        // Store top artisan IDs for multi-choice
        String artisanIds = matches.stream()
                .map(m -> String.valueOf(m.getArtisanId()))
                .collect(Collectors.joining(","));
        session.setMatchedArtisanIds(artisanIds);
        session.setSelectedArtisanId(matches.get(0).getArtisanId());

        StringBuilder summary = new StringBuilder();
        if (matches.size() == 1) {
            summary.append(formatSingleMatch(matches.get(0), session));
        } else {
            summary.append("\u2705 *Top Artisans Found*\n\n");
            for (int i = 0; i < matches.size(); i++) {
                var m = matches.get(i);
                String rating = String.format("%.1f", m.getTrustScore());
                summary.append(String.format("*%d.* \ud83d\udc77 %s\n   \u2b50 %s/5 \u00b7 \ud83d\udccd %s",
                        i + 1, m.getName(), rating, m.getMatchReason()));
                if (m.getStartingRate() != null) {
                    summary.append(String.format(" \u00b7 KES %d/hr", m.getStartingRate()));
                }
                summary.append("\n\n");
            }
            summary.append("*Your request:*\n");
            summary.append("\u2022 Service: ").append(session.getSkillType()).append("\n");
            summary.append("\u2022 Location: ").append(session.getCustomerLocation()).append("\n");
            summary.append("\u2022 Details: ").append(session.getJobDescription()).append("\n");
            summary.append("\u2022 When: ").append(friendlyUrgency(session)).append("\n\n");
            summary.append("Reply *1*, *2*, or *3* to choose an artisan.\n");
            summary.append("Reply *NO* to cancel.");
        }

        session.setConfirmSummary(summary.toString());
        sessionRepo.save(session);
        sendText(session.getCustomerPhone(), summary.toString());
    }

    private String formatSingleMatch(AiDTO.MatchedArtisan top, WhatsAppSession session) {
        String rating = String.format("%.1f", top.getTrustScore());
        return String.format(
            "\u2705 *Best Match Found*\n\n" +
            "\ud83d\udc77 %s\n" +
            "\u2b50 Rating: %s/5\n" +
            "\ud83d\udccd %s\n\n" +
            "*Your request:*\n" +
            "\u2022 Service: %s\n" +
            "\u2022 Location: %s\n" +
            "\u2022 Details: %s\n" +
            "\u2022 When: %s\n\n" +
            "Reply *YES* to confirm this booking.\n" +
            "Reply *NO* to cancel.",
            top.getName(), rating, top.getMatchReason(),
            session.getSkillType(),
            session.getCustomerLocation(),
            session.getJobDescription(),
            friendlyUrgency(session)
        );
    }

    @Transactional
    protected void handleConfirm(WhatsAppSession session, String input) {
        String answer = input.trim().toUpperCase(Locale.ROOT);

        if (answer.equals("NO") || answer.equals("CANCEL")) {
            abandonSession(session.getCustomerPhone());
            sendText(session.getCustomerPhone(),
                "Booking cancelled. Type *Hi* to search again, or visit fudari.co/artisans.");
            return;
        }

        // Parse artisan selection: "1", "2", "3" or "YES"/"Y"/"OK"/"CONFIRM"
        Long selectedArtisanId = null;
        if (answer.equals("1") || answer.equals("2") || answer.equals("3")) {
            int idx = Integer.parseInt(answer) - 1;
            String ids = session.getMatchedArtisanIds();
            if (ids != null) {
                String[] idArr = ids.split(",");
                if (idx < idArr.length) {
                    try {
                        selectedArtisanId = Long.parseLong(idArr[idx].trim());
                    } catch (NumberFormatException e) {
                        log.warn("[WA-BOT] Invalid artisan ID in matchedArtisanIds: {}", ids);
                    }
                }
            }
            if (selectedArtisanId == null && answer.equals("1")) {
                selectedArtisanId = session.getSelectedArtisanId();
            }
        } else if (answer.startsWith("Y") || answer.equals("OK") || answer.equals("CONFIRM")) {
            selectedArtisanId = session.getSelectedArtisanId();
        }

        if (selectedArtisanId == null) {
            String ids = session.getMatchedArtisanIds();
            boolean singleMatch = ids == null || !ids.contains(",");
            String hint = singleMatch
                ? "Please reply *YES* to confirm or *NO* to cancel."
                : "Please reply with a number (*1*, *2*, or *3*) to pick an artisan, or *NO* to cancel.";
            sendText(session.getCustomerPhone(), hint + "\n\n" + session.getConfirmSummary());
            return;
        }

        session.setSelectedArtisanId(selectedArtisanId);

        try {
            var reqBuilder = BookingDTO.CreateBookingRequest.builder()
                    .artisanId(selectedArtisanId)
                    .customerName(session.getCustomerName() != null
                            ? session.getCustomerName() : "WhatsApp Customer")
                    .customerPhone(session.getCustomerPhone())
                    .customerLocation(session.getCustomerLocation())
                    .jobDescription(session.getJobDescription())
                    .urgency(parseUrgency(session.getUrgency()))
                    .referralSource("whatsapp");

            // Propagate estate context so booking is tagged + GatePass generated
            if (session.getEstateId() != null) {
                estateRepository.findById(session.getEstateId()).ifPresent(estate ->
                    reqBuilder.estateSlug(estate.getSlug())
                );
            }

            if ("SCHEDULED".equals(session.getUrgency()) && session.getScheduledTime() != null) {
                reqBuilder.scheduledTime(session.getScheduledTime());
            }

            BookingDTO.BookingTrackResponse booking = bookingService.createBooking(reqBuilder.build());

            session.setBookingCode(booking.getBookingCode());
            session.setJobId(booking.getJobId());
            session.setState(WhatsAppSession.ConversationState.COMPLETED);
            session.setSessionStatus(WhatsAppSession.SessionStatus.COMPLETED);
            sessionRepo.save(session);

            String scheduleNote = "";
            if ("SCHEDULED".equals(session.getUrgency()) && session.getScheduledTime() != null) {
                scheduleNote = "\n\ud83d\udcc5 Scheduled: " +
                    session.getScheduledTime().format(DateTimeFormatter.ofPattern("EEE d MMM, h:mm a")) + "\n";
            }

            sendText(session.getCustomerPhone(), String.format(
                "\ud83c\udf89 *Booking Confirmed!*\n\n" +
                "Your code: *%s*\n" +
                "%s\n" +
                "Track your job: fudari.co/track/%s\n\n" +
                "You'll receive updates here and via SMS when the artisan responds.\n\n" +
                "_Reply HELP at any time for support._",
                booking.getBookingCode(), scheduleNote, booking.getBookingCode()
            ));

        } catch (Exception e) {
            log.error("[WA-BOT] Failed to create booking for phone {}: {}", session.getCustomerPhone(), e.getMessage());
            sendText(session.getCustomerPhone(),
                "\u26a0\ufe0f Something went wrong creating your booking. Please try again or visit fudari.co");
        }
    }

    // == Soft TTL: Resume expired sessions ==

    private void offerResume(WhatsAppSession session, String messageId) {
        String friendlySkill = session.getSkillType().charAt(0)
                + session.getSkillType().substring(1).toLowerCase(Locale.ROOT);

        // Save the state the session was in before we interrupt it
        if (session.getPreviousState() == null) {
            session.setPreviousState(session.getState());
        }
        session.setState(WhatsAppSession.ConversationState.RESUME_PROMPT);
        session.setSessionStatus(WhatsAppSession.SessionStatus.ACTIVE);
        session.setErrorCount(0);
        if (messageId != null) session.setLastMessageId(messageId);
        sessionRepo.save(session);

        StringBuilder msg = new StringBuilder();
        msg.append("\ud83d\udc4b Welcome back! I see you were looking for a *")
           .append(friendlySkill).append("*");
        if (session.getCustomerLocation() != null) {
            msg.append(" in *").append(session.getCustomerLocation()).append("*");
        }
        msg.append(" earlier.\n\n");
        msg.append("Reply *CONTINUE* to pick up where you left off.\n");
        msg.append("Reply *START OVER* to begin a new booking.");

        sendText(session.getCustomerPhone(), msg.toString());
    }

    private void handleResumePrompt(WhatsAppSession session, String input, String customerName, String messageId) {
        String answer = input.trim().toUpperCase(Locale.ROOT);

        if (answer.equals("CONTINUE") || answer.equals("YES") || answer.equals("Y") || answer.equals("OK")) {
            // Restore the session to where it was before expiry
            WhatsAppSession.ConversationState resumeState = session.getPreviousState();
            if (resumeState == null) resumeState = WhatsAppSession.ConversationState.CATEGORY;
            session.setState(resumeState);
            session.setPreviousState(null);
            session.setErrorCount(0);
            sessionRepo.save(session);

            // Re-send the prompt for the resumed state
            resendStatePrompt(session);
            return;
        }

        if (answer.equals("START OVER") || answer.equals("NO") || answer.equals("N") || answer.equals("NEW")) {
            // Abandon old session and start fresh
            session.setSessionStatus(WhatsAppSession.SessionStatus.ABANDONED);
            session.setState(WhatsAppSession.ConversationState.ABANDONED);
            sessionRepo.save(session);

            tryPrefillOrCreateSession(session.getCustomerPhone(), customerName, input, messageId);
            return;
        }

        // Unrecognised — re-prompt
        sendText(session.getCustomerPhone(),
            "Please reply *CONTINUE* to resume your previous booking, " +
            "or *START OVER* to begin a new one.");
    }

    private void resendStatePrompt(WhatsAppSession session) {
        String phone = session.getCustomerPhone();
        switch (session.getState()) {
            case CATEGORY -> sendCategoryMenu(phone);
            case LOCATION -> sendText(phone,
                "\ud83d\udccd Which area are you in? (e.g. Westlands, Karen, Ruaka, Kilimani)");
            case DESCRIPTION -> sendText(phone,
                "\ud83d\udcdd Briefly describe the work you need done.\n" +
                "Example: _\"Faulty socket in bedroom, needs replacing\"_");
            case URGENCY -> sendUrgencyMenu(phone);
            case SCHEDULE_TIME -> sendText(phone,
                "\ud83d\udcc5 When would you like the artisan to come?\n" +
                "Examples: _Monday 2pm_, _20/04 at 14:00_, _Tomorrow 10:00_");
            case CONFIRM -> {
                if (session.getConfirmSummary() != null) {
                    sendText(phone, session.getConfirmSummary());
                } else {
                    sendText(phone,
                        "\ud83d\udd0d Finding the best artisans near *" + session.getCustomerLocation() + "*...");
                    findAndConfirmArtisan(session);
                }
            }
            default -> sendCategoryMenu(phone);
        }
    }

    // == Description input sanitisation ==

    private static final Set<String> GARBAGE_INPUTS = Set.of(
            "test", "testing", "tst", "aaa", "asdf", "asdfgh", "asdfghjk",
            "qwerty", "qwer", "zxcv", "hello", "hi", "hey", "ok", "okay",
            "abc", "abcdef", "xxx", "yyy", "zzz", "1234", "12345", "123456",
            "nothing", "none", "n/a", "na", "nil", "null", "idk", "dunno",
            "blah", "blahblah", "foo", "bar", "baz", "lorem", "ipsum"
    );

    /** Returns an error message if the description is garbage/profanity, or null if valid. */
    private String validateDescription(String input) {
        String lower = input.trim().toLowerCase(Locale.ROOT);
        String alphaOnly = lower.replaceAll("[^a-z]", "");

        // Known garbage / placeholder inputs
        if (GARBAGE_INPUTS.contains(lower) || GARBAGE_INPUTS.contains(alphaOnly)) {
            return "\u26a0\ufe0f That doesn't look like a real job description.\n\n" +
                   "Please describe the actual work you need done so the artisan can prepare.\n" +
                   "Example: _\"Leaking kitchen tap, needs washer replaced\"_";
        }

        // Keyboard mashing: very low unique character ratio
        if (alphaOnly.length() >= 6) {
            long uniqueChars = alphaOnly.chars().distinct().count();
            double ratio = (double) uniqueChars / alphaOnly.length();
            if (ratio < 0.3) {
                return "\u26a0\ufe0f That looks like random characters.\n\n" +
                       "Please describe the work you need in a few words.\n" +
                       "Example: _\"Broken door handle in main bedroom\"_";
            }
        }

        // Repeated character pattern (e.g. "aaaaaaa", "hahahahaha")
        if (alphaOnly.length() >= 6 && alphaOnly.matches("(.)\\1{5,}")) {
            return "\u26a0\ufe0f That doesn't look like a real description.\n\n" +
                   "Please briefly describe the work you need done.\n" +
                   "Example: _\"Socket sparking in living room\"_";
        }

        // Repeated short pattern (e.g. "abababab", "hahaha")
        if (alphaOnly.length() >= 6 && alphaOnly.matches("(.{1,3})\\1{2,}")) {
            return "\u26a0\ufe0f That doesn't look like a real description.\n\n" +
                   "Please briefly describe the work you need done.\n" +
                   "Example: _\"Blocked bathroom drain, water backing up\"_";
        }

        // Too few real words (after filtering short noise tokens)
        String[] words = lower.split("\\s+");
        long meaningfulWords = Arrays.stream(words).filter(w -> w.length() > 2).count();
        if (meaningfulWords < 2) {
            return "Please use at least a couple of words to describe the work.\n" +
                   "Example: _\"Faulty socket in bedroom, needs replacing\"_";
        }

        return null; // valid
    }

    // == BACK command ==

    private void handleBack(WhatsAppSession session) {
        String phone = session.getCustomerPhone();
        switch (session.getState()) {
            case LOCATION -> {
                session.setState(WhatsAppSession.ConversationState.CATEGORY);
                session.setSkillType(null);
                session.setSelectedCategory(null);
                sessionRepo.save(session);
                sendCategoryMenu(phone);
            }
            case DESCRIPTION -> {
                session.setState(WhatsAppSession.ConversationState.LOCATION);
                session.setCustomerLocation(null);
                sessionRepo.save(session);
                sendText(phone, "\ud83d\udccd Which area are you in? (e.g. Westlands, Karen, Ruaka, Kilimani)");
            }
            case URGENCY -> {
                session.setState(WhatsAppSession.ConversationState.DESCRIPTION);
                session.setJobDescription(null);
                sessionRepo.save(session);
                sendText(phone,
                    "\ud83d\udcdd Briefly describe the work you need done.\n" +
                    "Example: _\"Faulty socket in bedroom, needs replacing\"_");
            }
            case SCHEDULE_TIME -> {
                session.setState(WhatsAppSession.ConversationState.URGENCY);
                session.setUrgency(null);
                sessionRepo.save(session);
                sendUrgencyMenu(phone);
            }
            case CONFIRM -> {
                if ("SCHEDULED".equals(session.getUrgency())) {
                    session.setState(WhatsAppSession.ConversationState.SCHEDULE_TIME);
                    sessionRepo.save(session);
                    sendText(phone,
                        "\ud83d\udcc5 When would you like the artisan to come?\n" +
                        "Examples: _Monday 2pm_, _20/04 at 14:00_, _Tomorrow 10:00_");
                } else {
                    session.setState(WhatsAppSession.ConversationState.URGENCY);
                    session.setUrgency(null);
                    sessionRepo.save(session);
                    sendUrgencyMenu(phone);
                }
            }
            default -> sendText(phone, "You're at the beginning. Type *Hi* to restart or pick a service.");
        }
    }

    // == Booking update notifications via WhatsApp ==

    public void notifyCustomerViaWhatsApp(String customerPhone, String message) {
        try {
            sendText(customerPhone, message);
        } catch (Exception e) {
            log.warn("[WA-BOT] Failed to send WhatsApp update to {}: {}", customerPhone, e.getMessage());
        }
    }

    // == Stale session cleanup (two-tier TTL) ==

    @Scheduled(fixedDelay = 10 * 60 * 1000)
    @Transactional
    public void cleanUpStaleSessions() {
        // Tier 1: ACTIVE sessions idle > 30 min → EXPIRED (eligible for resume prompt)
        LocalDateTime softCutoff = LocalDateTime.now().minusMinutes(SESSION_TIMEOUT_MINUTES);
        int expired = sessionRepo.expireStaleSessions(softCutoff);
        if (expired > 0) {
            log.info("[WA-BOT] Soft-expired {} sessions (idle > {}min)", expired, SESSION_TIMEOUT_MINUTES);
        }

        // Tier 2: EXPIRED sessions idle > 2 hrs → ABANDONED (no resume possible)
        LocalDateTime hardCutoff = LocalDateTime.now().minusMinutes(SESSION_HARD_EXPIRE_MINUTES);
        int abandoned = sessionRepo.abandonExpiredSessions(hardCutoff);
        if (abandoned > 0) {
            log.info("[WA-BOT] Hard-abandoned {} expired sessions (idle > {}min)", abandoned, SESSION_HARD_EXPIRE_MINUTES);
        }
    }

    // == Outbound message helpers ==

    private void sendText(String to, String body) {
        whatsAppProviderManager.sendText(to, body);
    }

    private void sendCategoryMenu(String to) {
        sendText(to,
            "\ud83d\udc4b Welcome to *Fudari*!\n\n" +
            "Which service do you need? Reply with a number:\n\n" +
            buildCategoryList() + "\n" +
            "Or type the service name directly (English or Swahili).\n\n" +
            "_Type CANCEL at any time to stop._"
        );
    }

    private void sendUrgencyMenu(String to) {
        sendText(to,
            "\ud83d\udd50 When do you need this done?\n\n" +
            "*1* \u2013 Right now (ASAP)\n" +
            "*2* \u2013 Today\n" +
            "*3* \u2013 Tomorrow\n" +
            "*4* \u2013 I'll schedule a specific time"
        );
    }

    private String buildCategoryList() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < CATEGORIES.size(); i++) {
            sb.append("*").append(i + 1).append("* \u2013 ").append(CATEGORIES.get(i)).append("\n");
        }
        return sb.toString().trim();
    }

    // == Input resolution ==

    private String resolveSkill(String input) {
        String key = input.trim().toLowerCase(Locale.ROOT);
        if (CATEGORY_SKILL_MAP.containsKey(key)) return CATEGORY_SKILL_MAP.get(key);
        for (Map.Entry<String, String> e : CATEGORY_SKILL_MAP.entrySet()) {
            if (key.startsWith(e.getKey())) return e.getValue();
        }
        for (Map.Entry<String, String> e : CATEGORY_SKILL_MAP.entrySet()) {
            if (e.getKey().length() > 2 && key.contains(e.getKey())) return e.getValue();
        }
        for (WorkerSkill.SkillType t : WorkerSkill.SkillType.values()) {
            if (t.name().toLowerCase(Locale.ROOT).contains(key)) return t.name();
        }
        return null;
    }

    private String resolveUrgency(String input) {
        return switch (input.trim().toUpperCase(Locale.ROOT)) {
            case "1", "NOW", "ASAP", "RIGHT NOW", "SASA" -> "NOW";
            case "2", "TODAY", "LEO" -> "TODAY";
            case "3", "TOMORROW", "KESHO" -> "TOMORROW";
            case "4", "LATER", "SCHEDULE", "SCHEDULED" -> "SCHEDULED";
            default -> null;
        };
    }

    private LocalDateTime parseScheduleTime(String input) {
        String text = input.trim().toLowerCase(Locale.ROOT);

        // Try "dd/MM at HH:mm" or "dd/MM HH:mm"
        Pattern dateTimePattern = Pattern.compile("(\\d{1,2})/(\\d{1,2})(?:\\s+at)?\\s+(\\d{1,2})[:.](\\d{2})");
        Matcher dtm = dateTimePattern.matcher(text);
        if (dtm.find()) {
            try {
                int day = Integer.parseInt(dtm.group(1));
                int month = Integer.parseInt(dtm.group(2));
                int hour = Integer.parseInt(dtm.group(3));
                int minute = Integer.parseInt(dtm.group(4));
                LocalDate date = LocalDate.of(LocalDate.now().getYear(), month, day);
                if (date.isBefore(LocalDate.now())) date = date.plusYears(1);
                return LocalDateTime.of(date, LocalTime.of(hour, minute));
            } catch (Exception ignored) {}
        }

        LocalTime time = extractTime(text);
        LocalDate date = extractDate(text);
        if (date != null && time != null) return LocalDateTime.of(date, time);
        if (date != null) return LocalDateTime.of(date, time != null ? time : LocalTime.of(9, 0));
        if (time != null) {
            LocalDate d = time.isAfter(LocalTime.now()) ? LocalDate.now() : LocalDate.now().plusDays(1);
            return LocalDateTime.of(d, time);
        }
        return null;
    }

    private LocalTime extractTime(String text) {
        Pattern timePattern = Pattern.compile("(\\d{1,2})(?:[:.](\\d{2}))?\\s*(am|pm)?");
        Matcher m = timePattern.matcher(text);
        if (m.find()) {
            int hour = Integer.parseInt(m.group(1));
            int minute = m.group(2) != null ? Integer.parseInt(m.group(2)) : 0;
            String ampm = m.group(3);
            if (ampm != null) {
                if (ampm.equals("pm") && hour < 12) hour += 12;
                if (ampm.equals("am") && hour == 12) hour = 0;
            }
            if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
                return LocalTime.of(hour, minute);
            }
        }
        if (text.contains("morning")) return LocalTime.of(9, 0);
        if (text.contains("afternoon")) return LocalTime.of(14, 0);
        if (text.contains("evening")) return LocalTime.of(18, 0);
        return null;
    }

    private LocalDate extractDate(String text) {
        LocalDate today = LocalDate.now();
        if (text.contains("tomorrow") || text.contains("kesho")) return today.plusDays(1);
        String[] days = {"monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"};
        for (int i = 0; i < days.length; i++) {
            if (text.contains(days[i])) {
                int target = i + 1;
                int current = today.getDayOfWeek().getValue();
                int daysAhead = (target - current + 7) % 7;
                if (daysAhead == 0) daysAhead = 7;
                if (text.contains("next")) daysAhead += 7;
                return today.plusDays(daysAhead);
            }
        }
        return null;
    }

    private com.tufixit.backend.entity.Job.UrgencyLevel parseUrgency(String urgency) {
        return switch (urgency) {
            case "TODAY"     -> com.tufixit.backend.entity.Job.UrgencyLevel.TODAY;
            case "TOMORROW"  -> com.tufixit.backend.entity.Job.UrgencyLevel.TOMORROW;
            case "SCHEDULED" -> com.tufixit.backend.entity.Job.UrgencyLevel.SCHEDULED;
            default          -> com.tufixit.backend.entity.Job.UrgencyLevel.NOW;
        };
    }

    private String friendlyUrgency(WhatsAppSession session) {
        String urgency = session.getUrgency();
        if ("SCHEDULED".equals(urgency) && session.getScheduledTime() != null) {
            return session.getScheduledTime().format(
                DateTimeFormatter.ofPattern("EEE d MMM, h:mm a"));
        }
        return switch (urgency) {
            case "NOW"       -> "As soon as possible";
            case "TODAY"     -> "Today";
            case "TOMORROW"  -> "Tomorrow";
            case "SCHEDULED" -> "To be scheduled";
            default          -> urgency;
        };
    }

    // == Session management helpers ==

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

    private String normalisePhone(String phone) {
        String p = phone.replaceAll("[^+\\d]", "");
        if (p.startsWith("+")) p = p.substring(1);
        if (p.startsWith("0") && p.length() == 10) p = "254" + p.substring(1);
        return "+" + p;
    }
}
