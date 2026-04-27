package com.tufixit.backend.service.whatsapp;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tufixit.backend.dto.WhatsAppDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * WhatsApp provider backed by the Meta WhatsApp Cloud API.
 *
 * This is the original provider — extracted from WhatsAppBotService and adapted
 * to the {@link WhatsAppProvider} interface.
 *
 * Configuration (environment variables):
 *   WHATSAPP_API_BASE_URL       – e.g. https://graph.facebook.com/v19.0
 *   WHATSAPP_PHONE_NUMBER_ID    – from Meta App Dashboard
 *   WHATSAPP_ACCESS_TOKEN       – permanent system-user token
 */
@Component
@Slf4j
public class MetaWhatsAppProvider implements WhatsAppProvider {

    @Value("${whatsapp.api.base-url:https://graph.facebook.com/v19.0}")
    private String apiBaseUrl;

    @Value("${whatsapp.api.phone-number-id:}")
    private String phoneNumberId;

    @Value("${whatsapp.api.access-token:}")
    private String accessToken;

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final HttpClient HTTP_CLIENT = HttpClient.newHttpClient();

    @Override
    public String providerName() {
        return "meta";
    }

    @Override
    public boolean isConfigured() {
        return phoneNumberId != null && !phoneNumberId.isBlank()
                && accessToken != null && !accessToken.isBlank();
    }

    @Override
    public String sendText(String to, String body) {
        if (!isConfigured()) {
            log.info("[WA-META-STUB] To: {} | {}", to, body);
            return null;
        }
        try {
            String metaPhone = toMetaPhone(to);

            WhatsAppDTO.OutboundMessage msg = new WhatsAppDTO.OutboundMessage();
            msg.setTo(metaPhone);
            msg.setType("text");
            msg.setText(new WhatsAppDTO.OutboundText(body));

            String json = MAPPER.writeValueAsString(msg);
            String url = apiBaseUrl + "/" + phoneNumberId + "/messages";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                @SuppressWarnings("unchecked")
                Map<String, Object> respJson = MAPPER.readValue(response.body(), Map.class);
                @SuppressWarnings("unchecked")
                List<Map<String, String>> messages = (List<Map<String, String>>) respJson.get("messages");
                String messageId = (messages != null && !messages.isEmpty())
                        ? messages.get(0).get("id") : null;
                log.debug("[WA-META] Sent to {}, id={}", to, messageId);
                return messageId;
            } else {
                log.warn("[WA-META] Send failed to {}, status={}, body={}",
                        to, response.statusCode(), response.body());
                return null;
            }
        } catch (Exception e) {
            log.error("[WA-META] Error sending to {}: {}", to, e.getMessage());
            return null;
        }
    }

    @Override
    public String sendTemplate(String to, String templateName, String languageCode, String... parameters) {
        if (!isConfigured()) {
            log.info("[WA-META-STUB] Template to: {} | template={}, params={}",
                    to, templateName, List.of(parameters));
            return null;
        }
        try {
            String metaPhone = toMetaPhone(to);

            WhatsAppDTO.OutboundMessage msg = new WhatsAppDTO.OutboundMessage();
            msg.setTo(metaPhone);
            msg.setType("template");

            WhatsAppDTO.OutboundTemplate template = new WhatsAppDTO.OutboundTemplate();
            template.setName(templateName);
            WhatsAppDTO.TemplateLanguage lang = new WhatsAppDTO.TemplateLanguage();
            lang.setCode(languageCode != null ? languageCode : "en");
            template.setLanguage(lang);

            if (parameters.length > 0) {
                List<WhatsAppDTO.TemplateParameter> params = new ArrayList<>();
                for (String param : parameters) {
                    params.add(new WhatsAppDTO.TemplateParameter(param));
                }
                WhatsAppDTO.TemplateComponent bodyComponent = new WhatsAppDTO.TemplateComponent();
                bodyComponent.setType("body");
                bodyComponent.setParameters(params);
                template.setComponents(List.of(bodyComponent));
            }
            msg.setTemplate(template);

            String json = MAPPER.writeValueAsString(msg);
            String url = apiBaseUrl + "/" + phoneNumberId + "/messages";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.debug("[WA-META] Template sent to {}", to);
                @SuppressWarnings("unchecked")
                Map<String, Object> respJson = MAPPER.readValue(response.body(), Map.class);
                @SuppressWarnings("unchecked")
                List<Map<String, String>> messages = (List<Map<String, String>>) respJson.get("messages");
                return (messages != null && !messages.isEmpty()) ? messages.get(0).get("id") : null;
            } else {
                log.warn("[WA-META] Template send failed to {}, status={}", to, response.statusCode());
                return null;
            }
        } catch (Exception e) {
            log.error("[WA-META] Error sending template to {}: {}", to, e.getMessage());
            return null;
        }
    }

    // ── Meta webhook payload parsing (used by the webhook controller) ────────

    /**
     * Parse inbound messages from a Meta webhook payload.
     */
    public List<InboundMessage> parseInbound(WhatsAppDTO.InboundWebhook payload) {
        List<InboundMessage> result = new ArrayList<>();
        if (payload == null || payload.getEntry() == null) return result;

        for (WhatsAppDTO.Entry entry : payload.getEntry()) {
            if (entry.getChanges() == null) continue;
            for (WhatsAppDTO.Change change : entry.getChanges()) {
                if (!"messages".equals(change.getField())) continue;
                WhatsAppDTO.Value value = change.getValue();
                if (value == null || value.getMessages() == null) continue;

                for (WhatsAppDTO.InboundMessage msg : value.getMessages()) {
                    String text = extractText(msg);
                    if (text == null || text.isBlank()) continue;

                    String displayName = extractName(value.getContacts(), msg.getFrom());

                    result.add(InboundMessage.builder()
                            .from(msg.getFrom())
                            .displayName(displayName)
                            .text(text)
                            .messageId(msg.getId())
                            .build());
                }
            }
        }
        return result;
    }

    /**
     * Parse delivery statuses from a Meta webhook payload.
     */
    public List<DeliveryStatus> parseStatuses(WhatsAppDTO.InboundWebhook payload) {
        List<DeliveryStatus> result = new ArrayList<>();
        if (payload == null || payload.getEntry() == null) return result;

        for (WhatsAppDTO.Entry entry : payload.getEntry()) {
            if (entry.getChanges() == null) continue;
            for (WhatsAppDTO.Change change : entry.getChanges()) {
                WhatsAppDTO.Value value = change.getValue();
                if (value == null || value.getStatuses() == null) continue;

                for (WhatsAppDTO.MessageStatus status : value.getStatuses()) {
                    result.add(DeliveryStatus.builder()
                            .messageId(status.getId())
                            .status(mapMetaStatus(status.getStatus()))
                            .recipientPhone(status.getRecipientId())
                            .timestamp(status.getTimestamp())
                            .build());
                }
            }
        }
        return result;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Extract sender phone numbers from any message types (including non-text).
     * Used to send a help reply when we can't parse the message content.
     */
    public List<String> extractSenderPhones(WhatsAppDTO.InboundWebhook payload) {
        List<String> phones = new ArrayList<>();
        if (payload == null || payload.getEntry() == null) return phones;
        for (WhatsAppDTO.Entry entry : payload.getEntry()) {
            if (entry.getChanges() == null) continue;
            for (WhatsAppDTO.Change change : entry.getChanges()) {
                WhatsAppDTO.Value value = change.getValue();
                if (value == null || value.getMessages() == null) continue;
                for (WhatsAppDTO.InboundMessage msg : value.getMessages()) {
                    if (msg.getFrom() != null && !msg.getFrom().isBlank()) {
                        phones.add(msg.getFrom());
                    }
                }
            }
        }
        return phones;
    }

    private String toMetaPhone(String e164Phone) {
        // Meta requires E.164 without leading '+'
        return e164Phone.startsWith("+") ? e164Phone.substring(1) : e164Phone;
    }

    private String extractText(WhatsAppDTO.InboundMessage message) {
        if (message == null) return null;
        if ("text".equals(message.getType()) && message.getText() != null) {
            return message.getText().getBody();
        }
        if ("interactive".equals(message.getType()) && message.getInteractive() != null) {
            WhatsAppDTO.Interactive interactive = message.getInteractive();
            if (interactive.getButtonReply() != null) return interactive.getButtonReply().getId();
            if (interactive.getListReply() != null) return interactive.getListReply().getId();
        }
        return null;
    }

    private String extractName(List<WhatsAppDTO.Contact> contacts, String phone) {
        if (contacts == null) return "Customer";
        return contacts.stream()
                .filter(c -> phone.equals(c.getWaId()))
                .map(c -> c.getProfile() != null ? c.getProfile().getName() : "Customer")
                .findFirst()
                .orElse("Customer");
    }

    private DeliveryStatus.Status mapMetaStatus(String metaStatus) {
        if (metaStatus == null) return DeliveryStatus.Status.SENT;
        return switch (metaStatus.toLowerCase()) {
            case "sent" -> DeliveryStatus.Status.SENT;
            case "delivered" -> DeliveryStatus.Status.DELIVERED;
            case "read" -> DeliveryStatus.Status.READ;
            case "failed" -> DeliveryStatus.Status.FAILED;
            default -> DeliveryStatus.Status.SENT;
        };
    }
}
