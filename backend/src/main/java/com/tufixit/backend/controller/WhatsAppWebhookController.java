package com.tufixit.backend.controller;

import com.tufixit.backend.dto.WhatsAppDTO;
import com.tufixit.backend.service.WhatsAppBotService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Receives all inbound events from the Meta WhatsApp Cloud API.
 *
 * Two endpoints:
 *
 * 1. GET /api/whatsapp/webhook — Meta webhook verification handshake.
 *    Meta sends hub.mode, hub.verify_token, hub.challenge when you register
 *    the webhook URL in the Meta App Dashboard. We echo back hub.challenge if
 *    hub.verify_token matches our configured secret.
 *
 * 2. POST /api/whatsapp/webhook — Inbound messages, delivery receipts, etc.
 *    We extract text messages and route them to WhatsAppBotService.
 *    We return HTTP 200 immediately for all other event types (status updates)
 *    to prevent Meta from retrying indefinitely.
 *
 * Security:
 * - The verify token is a secret configured via env var WHATSAPP_VERIFY_TOKEN.
 * - POST bodies should be validated with the X-Hub-Signature-256 header
 *   (HMAC-SHA256 of body using the Meta App Secret) in a production deployment.
 *   Add a filter or @RequestHeader check using $WHATSAPP_APP_SECRET if needed.
 */
@RestController
@RequestMapping("/api/whatsapp")
@RequiredArgsConstructor
@Slf4j
public class WhatsAppWebhookController {

    private final WhatsAppBotService botService;

    @Value("${whatsapp.verify-token:tufixit_whatsapp_verify_token}")
    private String verifyToken;

    // ── Webhook verification (GET) ───────────────────────────────────────────

    /**
     * Meta calls this once when you save the webhook URL in the App Dashboard.
     * Must respond with the plain-text hub.challenge value within 5 seconds.
     */
    @GetMapping("/webhook")
    public ResponseEntity<String> verifyWebhook(
            @RequestParam("hub.mode") String mode,
            @RequestParam("hub.verify_token") String token,
            @RequestParam("hub.challenge") String challenge) {

        if ("subscribe".equals(mode) && verifyToken.equals(token)) {
            log.info("[WA-WEBHOOK] Verification successful");
            return ResponseEntity.ok(challenge);
        }
        log.warn("[WA-WEBHOOK] Verification failed — token mismatch");
        return ResponseEntity.status(403).body("Forbidden");
    }

    // ── Inbound events (POST) ────────────────────────────────────────────────

    /**
     * Meta delivers all webhook events here.
     * Always respond 200 quickly; heavy work is synchronous but exceptions are caught
     * so Meta never sees a 5xx that would trigger its exponential back-off retries.
     */
    @PostMapping("/webhook")
    public ResponseEntity<String> receiveWebhook(@RequestBody WhatsAppDTO.InboundWebhook payload) {
        try {
            processPayload(payload);
        } catch (Exception e) {
            // Log but do not propagate — Meta must receive 200 or it will retry
            log.error("[WA-WEBHOOK] Processing error: {}", e.getMessage(), e);
        }
        return ResponseEntity.ok("EVENT_RECEIVED");
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private void processPayload(WhatsAppDTO.InboundWebhook payload) {
        if (payload == null || payload.getEntry() == null) return;

        for (WhatsAppDTO.Entry entry : payload.getEntry()) {
            if (entry.getChanges() == null) continue;
            for (WhatsAppDTO.Change change : entry.getChanges()) {
                if (!"messages".equals(change.getField())) continue;
                processChange(change.getValue());
            }
        }
    }

    private void processChange(WhatsAppDTO.Value value) {
        if (value == null) return;

        // Status updates (delivered/read) — acknowledge and skip
        if (value.getStatuses() != null && !value.getStatuses().isEmpty()) {
            log.debug("[WA-WEBHOOK] Status update received, count={}", value.getStatuses().size());
            return;
        }

        List<WhatsAppDTO.InboundMessage> messages = value.getMessages();
        List<WhatsAppDTO.Contact> contacts = value.getContacts();
        if (messages == null || messages.isEmpty()) return;

        for (WhatsAppDTO.InboundMessage message : messages) {
            String from = message.getFrom(); // e.g. "254712345678"
            String displayName = extractName(contacts, from);
            String text = extractText(message);

            if (text == null || text.isBlank()) {
                log.debug("[WA-WEBHOOK] Non-text message from {} (type={}), ignoring", from, message.getType());
                continue;
            }

            log.info("[WA-WEBHOOK] Message from {} ({}): {}", from, displayName, text);
            botService.handleInbound(from, displayName, text);
        }
    }

    /** Extracts the text body regardless of whether it is a plain text or interactive reply. */
    private String extractText(WhatsAppDTO.InboundMessage message) {
        if (message == null) return null;

        // Plain text
        if ("text".equals(message.getType()) && message.getText() != null) {
            return message.getText().getBody();
        }

        // Interactive button or list reply — use the reply ID as the input to the state machine
        if ("interactive".equals(message.getType()) && message.getInteractive() != null) {
            WhatsAppDTO.Interactive interactive = message.getInteractive();
            if (interactive.getButtonReply() != null) {
                return interactive.getButtonReply().getId();
            }
            if (interactive.getListReply() != null) {
                return interactive.getListReply().getId();
            }
        }

        return null;
    }

    private String extractName(List<WhatsAppDTO.Contact> contacts, String phone) {
        if (contacts == null) return "Customer";
        return contacts.stream()
                .filter(c -> phone.equals(c.getWaId()))
                .findFirst()
                .map(c -> c.getProfile() != null ? c.getProfile().getName() : "Customer")
                .orElse("Customer");
    }
}
