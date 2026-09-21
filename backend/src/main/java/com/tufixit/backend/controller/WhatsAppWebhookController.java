package com.tufixit.backend.controller;

import com.tufixit.backend.dto.WhatsAppDTO;
import com.tufixit.backend.service.WhatsAppBotService;
import com.tufixit.backend.service.whatsapp.DeliveryStatus;
import com.tufixit.backend.service.whatsapp.InboundMessage;
import com.tufixit.backend.service.whatsapp.MetaWhatsAppProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
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
    private final MetaWhatsAppProvider metaProvider;
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Value("${whatsapp.verify-token:tufixit_whatsapp_verify_token}")
    private String verifyToken;

    @Value("${whatsapp.app-secret:}")
    private String appSecret;

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
    public ResponseEntity<String> receiveWebhook(
            @RequestBody String rawBody,
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String signatureHeader) {
        try {
            // Validate Meta X-Hub-Signature-256 if app secret is configured
            if (appSecret != null && !appSecret.isBlank()) {
                if (!validateMetaSignature(rawBody, signatureHeader)) {
                    log.warn("[WA-WEBHOOK] Invalid X-Hub-Signature-256 — rejecting request");
                    return ResponseEntity.status(403).body("Invalid signature");
                }
            }

            WhatsAppDTO.InboundWebhook payload = MAPPER.readValue(rawBody, WhatsAppDTO.InboundWebhook.class);
            processPayload(payload);
        } catch (Exception e) {
            // Log but do not propagate — Meta must receive 200 or it will retry
            log.error("[WA-WEBHOOK] Processing error: {}", e.getMessage(), e);
        }
        return ResponseEntity.ok("EVENT_RECEIVED");
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private boolean validateMetaSignature(String body, String signatureHeader) {
        if (signatureHeader == null || !signatureHeader.startsWith("sha256=")) return false;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(appSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(body.getBytes(StandardCharsets.UTF_8));
            String expected = "sha256=" + HexFormat.of().formatHex(hash);
            return expected.equals(signatureHeader);
        } catch (Exception e) {
            log.warn("[WA-WEBHOOK] Signature validation error: {}", e.getMessage());
            return false;
        }
    }

    private void processPayload(WhatsAppDTO.InboundWebhook payload) {
        // Parse delivery statuses
        List<DeliveryStatus> statuses = metaProvider.parseStatuses(payload);
        if (!statuses.isEmpty()) {
            log.debug("[WA-WEBHOOK] Status updates received, count={}", statuses.size());
            for (DeliveryStatus status : statuses) {
                if (status.getStatus() == DeliveryStatus.Status.FAILED) {
                    log.warn("[WA-WEBHOOK] Message {} failed for {}", status.getMessageId(), status.getRecipientPhone());
                }
            }
        }

        // Parse inbound messages
        List<InboundMessage> messages = metaProvider.parseInbound(payload);
        if (messages.isEmpty()) {
            // Non-text messages (images, voice notes, etc.) — send help hint
            List<String> senders = metaProvider.extractSenderPhones(payload);
            for (String sender : senders) {
                botService.handleInbound(sender, null, "HELP", null);
            }
        }
        for (InboundMessage message : messages) {
            log.info("[WA-WEBHOOK] Message from {} ({}): {}",
                    message.getFrom(), message.getDisplayName(), message.getText());
            botService.handleInbound(message.getFrom(), message.getDisplayName(),
                    message.getText(), message.getMessageId());
        }
    }
}
