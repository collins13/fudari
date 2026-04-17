package com.tufixit.backend.service.whatsapp;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * WhatsApp provider backed by the Twilio Programmable Messaging API.
 *
 * Uses Twilio's REST API directly (no SDK dependency) to keep the footprint
 * small and avoid version-lock issues.
 *
 * Configuration (environment variables):
 *   TWILIO_ACCOUNT_SID      – Twilio Account SID
 *   TWILIO_AUTH_TOKEN        – Twilio Auth Token
 *   TWILIO_WHATSAPP_FROM     – Your Twilio WhatsApp sender (e.g. "whatsapp:+14155238886")
 *
 * Twilio WhatsApp messages use the same /Messages endpoint as SMS, with
 * "whatsapp:" prefixed phone numbers.
 */
@Component
@Slf4j
public class TwilioWhatsAppProvider implements WhatsAppProvider {

    @Value("${twilio.account-sid:}")
    private String accountSid;

    @Value("${twilio.auth-token:}")
    private String authToken;

    @Value("${twilio.whatsapp-from:}")
    private String whatsappFrom;

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final HttpClient HTTP_CLIENT = HttpClient.newHttpClient();

    @Override
    public String providerName() {
        return "twilio";
    }

    @Override
    public boolean isConfigured() {
        return accountSid != null && !accountSid.isBlank()
                && authToken != null && !authToken.isBlank()
                && whatsappFrom != null && !whatsappFrom.isBlank();
    }

    @Override
    public String sendText(String to, String body) {
        if (!isConfigured()) {
            log.info("[WA-TWILIO-STUB] To: {} | {}", to, body);
            return null;
        }
        try {
            String twilioTo = toTwilioPhone(to);
            String twilioFrom = whatsappFrom.startsWith("whatsapp:")
                    ? whatsappFrom : "whatsapp:" + whatsappFrom;

            String formBody = "To=" + encode(twilioTo)
                    + "&From=" + encode(twilioFrom)
                    + "&Body=" + encode(body);

            String url = "https://api.twilio.com/2010-04-01/Accounts/"
                    + accountSid + "/Messages.json";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", basicAuth())
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(formBody))
                    .build();

            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                @SuppressWarnings("unchecked")
                Map<String, Object> json = MAPPER.readValue(response.body(), Map.class);
                String sid = (String) json.get("sid");
                log.debug("[WA-TWILIO] Sent to {}, SID={}", to, sid);
                return sid;
            } else {
                log.warn("[WA-TWILIO] Send failed to {}, status={}, body={}",
                        to, response.statusCode(), response.body());
                return null;
            }
        } catch (Exception e) {
            log.error("[WA-TWILIO] Error sending to {}: {}", to, e.getMessage());
            return null;
        }
    }

    @Override
    public String sendTemplate(String to, String templateName, String languageCode, String... parameters) {
        // Twilio WhatsApp templates are sent as Content Templates via a separate API.
        // For the initial integration, templates are sent as freeform messages within
        // the 24-hour session window. For out-of-session messages, Twilio requires
        // pre-approved templates configured in the Twilio Console.
        //
        // Twilio Content API: POST /v1/Content
        // For now, we construct a plain-text representation.
        if (!isConfigured()) {
            log.info("[WA-TWILIO-STUB] Template to: {} | template={}, params={}",
                    to, templateName, List.of(parameters));
            return null;
        }

        try {
            String twilioTo = toTwilioPhone(to);
            String twilioFrom = whatsappFrom.startsWith("whatsapp:")
                    ? whatsappFrom : "whatsapp:" + whatsappFrom;

            // Use ContentSid if template is registered in Twilio Content API
            // For now, fall back to Body-based template (session messages only)
            StringBuilder bodyBuilder = new StringBuilder("[Template: ").append(templateName).append("] ");
            for (int i = 0; i < parameters.length; i++) {
                bodyBuilder.append("{{").append(i + 1).append("}}=").append(parameters[i]);
                if (i < parameters.length - 1) bodyBuilder.append(", ");
            }

            String formBody = "To=" + encode(twilioTo)
                    + "&From=" + encode(twilioFrom)
                    + "&Body=" + encode(bodyBuilder.toString());

            String url = "https://api.twilio.com/2010-04-01/Accounts/"
                    + accountSid + "/Messages.json";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", basicAuth())
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(formBody))
                    .build();

            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                @SuppressWarnings("unchecked")
                Map<String, Object> json = MAPPER.readValue(response.body(), Map.class);
                String sid = (String) json.get("sid");
                log.debug("[WA-TWILIO] Template sent to {}, SID={}", to, sid);
                return sid;
            } else {
                log.warn("[WA-TWILIO] Template send failed to {}, status={}", to, response.statusCode());
                return null;
            }
        } catch (Exception e) {
            log.error("[WA-TWILIO] Error sending template to {}: {}", to, e.getMessage());
            return null;
        }
    }

    // ── Twilio webhook payload parsing (used by the webhook controller) ──────

    /**
     * Parse a Twilio inbound WhatsApp message from the webhook form parameters.
     */
    public InboundMessage parseInbound(Map<String, String> params) {
        String from = params.getOrDefault("From", "");
        String body = params.getOrDefault("Body", "");
        String messageSid = params.getOrDefault("MessageSid", "");
        String profileName = params.getOrDefault("ProfileName", "Customer");

        // Strip "whatsapp:" prefix
        if (from.startsWith("whatsapp:")) {
            from = from.substring("whatsapp:".length());
        }

        return InboundMessage.builder()
                .from(from)
                .displayName(profileName)
                .text(body)
                .messageId(messageSid)
                .build();
    }

    /**
     * Parse a Twilio delivery status callback from the webhook form parameters.
     */
    public DeliveryStatus parseStatus(Map<String, String> params) {
        String messageSid = params.getOrDefault("MessageSid", "");
        String messageStatus = params.getOrDefault("MessageStatus", "");
        String to = params.getOrDefault("To", "");
        String errorCode = params.getOrDefault("ErrorCode", "");
        String errorMessage = params.getOrDefault("ErrorMessage", "");

        if (to.startsWith("whatsapp:")) {
            to = to.substring("whatsapp:".length());
        }

        return DeliveryStatus.builder()
                .messageId(messageSid)
                .status(mapTwilioStatus(messageStatus))
                .recipientPhone(to)
                .errorCode(errorCode.isBlank() ? null : errorCode)
                .errorMessage(errorMessage.isBlank() ? null : errorMessage)
                .build();
    }

    /**
     * Validate that a Twilio webhook request is authentic using the X-Twilio-Signature header.
     * In production, use Twilio's RequestValidator with your auth token.
     */
    public boolean validateSignature(String signature, String url, Map<String, String> params) {
        if (authToken == null || authToken.isBlank()) return true; // skip in dev
        try {
            // Build the data string: URL + sorted params
            StringBuilder data = new StringBuilder(url);
            params.entrySet().stream()
                    .sorted(Map.Entry.comparingByKey())
                    .forEach(e -> data.append(e.getKey()).append(e.getValue()));

            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA1");
            mac.init(new javax.crypto.spec.SecretKeySpec(authToken.getBytes(), "HmacSHA1"));
            String expected = java.util.Base64.getEncoder().encodeToString(mac.doFinal(data.toString().getBytes()));
            return expected.equals(signature);
        } catch (Exception e) {
            log.warn("[WA-TWILIO] Signature validation error: {}", e.getMessage());
            return false;
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private String toTwilioPhone(String e164Phone) {
        // Twilio WhatsApp requires "whatsapp:+254..." format
        String phone = e164Phone.startsWith("+") ? e164Phone : "+" + e164Phone;
        return "whatsapp:" + phone;
    }

    private String basicAuth() {
        String credentials = accountSid + ":" + authToken;
        return "Basic " + java.util.Base64.getEncoder().encodeToString(credentials.getBytes());
    }

    private String encode(String value) {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8);
    }

    private DeliveryStatus.Status mapTwilioStatus(String twilioStatus) {
        return switch (twilioStatus.toLowerCase()) {
            case "queued", "accepted" -> DeliveryStatus.Status.QUEUED;
            case "sending", "sent" -> DeliveryStatus.Status.SENT;
            case "delivered" -> DeliveryStatus.Status.DELIVERED;
            case "read" -> DeliveryStatus.Status.READ;
            case "failed" -> DeliveryStatus.Status.FAILED;
            case "undelivered" -> DeliveryStatus.Status.UNDELIVERED;
            default -> DeliveryStatus.Status.SENT;
        };
    }
}
