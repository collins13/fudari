package com.tufixit.backend.service.whatsapp;

import lombok.Builder;
import lombok.Data;

/**
 * Normalised inbound message — produced by provider-specific webhook
 * controllers and consumed by {@link com.tufixit.backend.service.WhatsAppBotService}.
 */
@Data
@Builder
public class InboundMessage {
    /** Sender phone in E.164 (e.g. "+254712345678"). */
    private String from;
    /** Sender display name (may be null). */
    private String displayName;
    /** Plain-text body or interactive-reply ID. */
    private String text;
    /** Provider-specific message ID (for idempotency / logging). */
    private String messageId;
}
