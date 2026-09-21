package com.tufixit.backend.controller;

import com.tufixit.backend.service.WhatsAppBotService;
import com.tufixit.backend.service.whatsapp.DeliveryStatus;
import com.tufixit.backend.service.whatsapp.InboundMessage;
import com.tufixit.backend.service.whatsapp.TwilioWhatsAppProvider;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Receives Twilio WhatsApp webhooks.
 *
 * Configure these URLs in the Twilio Console under your WhatsApp Sender:
 *   - Incoming messages:  POST https://api.fudari.co/api/whatsapp/twilio/inbound
 *   - Status callbacks:   POST https://api.fudari.co/api/whatsapp/twilio/status
 *
 * Twilio sends webhooks as application/x-www-form-urlencoded.
 */
@RestController
@RequestMapping("/api/whatsapp/twilio")
@RequiredArgsConstructor
@Slf4j
public class TwilioWhatsAppWebhookController {

    private final WhatsAppBotService botService;
    private final TwilioWhatsAppProvider twilioProvider;

    @Value("${twilio.webhook.validate-signature:true}")
    private boolean validateSignature;

    /**
     * Inbound WhatsApp message from Twilio.
     * Twilio expects an empty 200 or TwiML response.
     */
    @PostMapping(value = "/inbound", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<String> inbound(@RequestParam Map<String, String> params,
                                          @RequestHeader(value = "X-Twilio-Signature", required = false) String signature,
                                          HttpServletRequest request) {
        try {
            // Validate Twilio signature in production
            if (validateSignature) {
                String url = reconstructRequestUrl(request);
                if (signature == null || !twilioProvider.validateSignature(signature, url, params)) {
                    log.warn("[WA-TWILIO-WEBHOOK] Invalid or missing Twilio signature — rejecting request");
                    return ResponseEntity.status(403).body("Invalid signature");
                }
            }

            InboundMessage message = twilioProvider.parseInbound(params);

            if (message.getText() == null || message.getText().isBlank()) {
                log.debug("[WA-TWILIO-WEBHOOK] Non-text message from {}, replying with hint", message.getFrom());
                botService.handleInbound(message.getFrom(), message.getDisplayName(),
                        "HELP", message.getMessageId());
                return ok();
            }

            log.info("[WA-TWILIO-WEBHOOK] Message from {} ({}): {}",
                    message.getFrom(), message.getDisplayName(), message.getText());

            botService.handleInbound(message.getFrom(), message.getDisplayName(),
                    message.getText(), message.getMessageId());
        } catch (Exception e) {
            log.error("[WA-TWILIO-WEBHOOK] Processing error: {}", e.getMessage(), e);
        }
        return ok();
    }

    /**
     * Delivery status callback from Twilio.
     */
    @PostMapping(value = "/status", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<String> status(@RequestParam Map<String, String> params,
                                         @RequestHeader(value = "X-Twilio-Signature", required = false) String signature,
                                         HttpServletRequest request) {
        try {
            if (validateSignature) {
                String url = reconstructRequestUrl(request);
                if (signature == null || !twilioProvider.validateSignature(signature, url, params)) {
                    log.warn("[WA-TWILIO-STATUS] Invalid or missing Twilio signature — rejecting");
                    return ResponseEntity.status(403).body("Invalid signature");
                }
            }

            DeliveryStatus deliveryStatus = twilioProvider.parseStatus(params);
            log.debug("[WA-TWILIO-STATUS] Message {} → {} to {}",
                    deliveryStatus.getMessageId(),
                    deliveryStatus.getStatus(),
                    deliveryStatus.getRecipientPhone());

            if (deliveryStatus.getStatus() == DeliveryStatus.Status.FAILED
                    || deliveryStatus.getStatus() == DeliveryStatus.Status.UNDELIVERED) {
                log.warn("[WA-TWILIO-STATUS] Message {} failed: code={}, msg={}",
                        deliveryStatus.getMessageId(),
                        deliveryStatus.getErrorCode(),
                        deliveryStatus.getErrorMessage());
            }
        } catch (Exception e) {
            log.error("[WA-TWILIO-STATUS] Processing error: {}", e.getMessage(), e);
        }
        return ok();
    }

    /** Empty 200 — Twilio expects this to avoid retries. */
    private ResponseEntity<String> ok() {
        return ResponseEntity.ok("");
    }

    /**
     * Reconstruct the full public URL that Twilio used to call this webhook.
     * Twilio signs against the original URL, so behind a reverse proxy we must
     * use X-Forwarded-* headers if present.
     */
    private String reconstructRequestUrl(HttpServletRequest request) {
        String proto = request.getHeader("X-Forwarded-Proto");
        String host = request.getHeader("X-Forwarded-Host");
        if (proto == null) proto = request.getScheme();
        if (host == null) host = request.getServerName() + ":" + request.getServerPort();
        return proto + "://" + host + request.getRequestURI();
    }
}
