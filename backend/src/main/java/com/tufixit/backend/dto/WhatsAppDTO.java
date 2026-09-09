package com.tufixit.backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTOs that map directly to the Meta WhatsApp Cloud API webhook payload.
 *
 * Reference: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
 *
 * Only the fields Fudari uses are declared; Jackson ignores unknown fields
 * via @JsonIgnoreProperties(ignoreUnknown = true).
 */
public class WhatsAppDTO {

    // ── Inbound: Webhook from Meta ───────────────────────────────────────────

    /** Root envelope sent by Meta to our webhook endpoint. */
    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class InboundWebhook {
        private String object;          // always "whatsapp_business_account"
        private List<Entry> entry;
    }

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Entry {
        private String id;              // WhatsApp Business Account ID
        private List<Change> changes;
    }

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Change {
        private Value value;
        private String field;           // "messages"
    }

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Value {
        @JsonProperty("messaging_product")
        private String messagingProduct;    // "whatsapp"

        @JsonProperty("phone_number_id")
        private String phoneNumberId;       // platform's phone number ID (from Meta App)

        private List<Contact> contacts;     // sender info
        private List<InboundMessage> messages;
        private List<MessageStatus> statuses;
    }

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Contact {
        @JsonProperty("wa_id")
        private String waId;            // E.164 without '+', e.g. "254712345678"
        private Profile profile;
    }

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Profile {
        private String name;            // Display name the customer set on WhatsApp
    }

    /** A single inbound message from a customer. */
    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class InboundMessage {
        private String id;              // message ID (wamid.xxx)
        private String from;            // sender phone, E.164 without '+' (e.g. "254712345678")
        private String timestamp;       // Unix epoch string
        private String type;            // "text", "interactive", "image", etc.
        private TextBody text;
        private Interactive interactive;
    }

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TextBody {
        private String body;
    }

    /** Represents a button/list reply from an interactive message. */
    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Interactive {
        private String type;            // "button_reply" | "list_reply"
        @JsonProperty("button_reply")
        private ButtonReply buttonReply;
        @JsonProperty("list_reply")
        private ListReply listReply;
    }

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ButtonReply {
        private String id;              // e.g. "confirm_yes" | "confirm_no"
        private String title;
    }

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ListReply {
        private String id;              // e.g. "cat_plumbing"
        private String title;
        private String description;
    }

    /** Delivery/read status update from Meta (we log but don't act on these). */
    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class MessageStatus {
        private String id;
        private String status;          // "sent" | "delivered" | "read" | "failed"
        private String timestamp;
        @JsonProperty("recipient_id")
        private String recipientId;
    }

    // ── Outbound: Messages we send via Meta Cloud API ───────────────────────

    /**
     * Generic outbound message request body.
     *
     * Supports text, interactive (buttons/list), and template messages.
     * Build via the static factory methods below.
     */
    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class OutboundMessage {
        @JsonProperty("messaging_product")
        private String messagingProduct = "whatsapp";

        @JsonProperty("recipient_type")
        private String recipientType = "individual";

        private String to;
        private String type;

        // Set only when type = "text"
        private OutboundText text;

        // Set only when type = "interactive"
        private OutboundInteractive interactive;

        // Set only when type = "template"
        private OutboundTemplate template;
    }

    @Data
    @NoArgsConstructor
    public static class OutboundText {
        @JsonProperty("preview_url")
        private boolean previewUrl = false;
        private String body;

        public OutboundText(String body) {
            this.body = body;
        }
    }

    @Data
    @NoArgsConstructor
    public static class OutboundInteractive {
        private String type;                // "button" | "list"
        private InteractiveBody body;
        private InteractiveAction action;
    }

    @Data
    @NoArgsConstructor
    public static class InteractiveBody {
        private String text;
    }

    @Data
    @NoArgsConstructor
    public static class InteractiveAction {
        private String button;              // label for list type
        private List<InteractiveButton> buttons;    // for button type (max 3)
        private List<InteractiveSection> sections;  // for list type
    }

    @Data
    @NoArgsConstructor
    public static class InteractiveButton {
        private String type = "reply";
        private ButtonReply reply;

        public InteractiveButton(String id, String title) {
            this.reply = new ButtonReply();
            this.reply.setId(id);
            this.reply.setTitle(title);
        }
    }

    @Data
    @NoArgsConstructor
    public static class InteractiveSection {
        private String title;
        private List<SectionRow> rows;
    }

    @Data
    @NoArgsConstructor
    public static class SectionRow {
        private String id;
        private String title;
        private String description;

        public SectionRow(String id, String title, String description) {
            this.id = id;
            this.title = title;
            this.description = description;
        }
    }

    @Data
    @NoArgsConstructor
    public static class OutboundTemplate {
        private String name;
        private TemplateLanguage language;
        private List<TemplateComponent> components;
    }

    @Data
    @NoArgsConstructor
    public static class TemplateLanguage {
        private String code = "en";
    }

    @Data
    @NoArgsConstructor
    public static class TemplateComponent {
        private String type;
        private List<TemplateParameter> parameters;
    }

    @Data
    @NoArgsConstructor
    public static class TemplateParameter {
        private String type = "text";
        private String text;

        public TemplateParameter(String text) {
            this.text = text;
        }
    }
}
