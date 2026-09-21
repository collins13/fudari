package com.tufixit.backend.service.whatsapp;

/**
 * Provider-agnostic WhatsApp messaging interface.
 *
 * Each implementation (Twilio, Meta Cloud API) adapts its vendor SDK to this
 * contract so that {@link com.tufixit.backend.service.WhatsAppBotService} and
 * other business-logic classes never couple to a specific vendor.
 *
 * <pre>
 *  ┌────────────────────┐
 *  │  WhatsAppProvider   │  ← interface
 *  └─────┬──────┬───────┘
 *        │      │
 *  ┌─────▼──┐ ┌─▼──────────┐
 *  │ Twilio │ │ Meta Cloud  │
 *  └────────┘ └─────────────┘
 * </pre>
 */
public interface WhatsAppProvider {

    /** Human-readable name for logging (e.g. "twilio", "meta"). */
    String providerName();

    /**
     * Send a plain text message.
     *
     * @param to   recipient phone in E.164 format (e.g. "+254712345678")
     * @param body message text (WhatsApp markdown supported)
     * @return provider-specific message SID / ID, or null on failure
     */
    String sendText(String to, String body);

    /**
     * Send a pre-approved template message.
     *
     * @param to             recipient phone in E.164
     * @param templateName   template name as registered with WhatsApp
     * @param languageCode   BCP-47 code, e.g. "en"
     * @param parameters     positional template parameters
     * @return message SID / ID, or null on failure
     */
    String sendTemplate(String to, String templateName, String languageCode, String... parameters);

    /**
     * Returns {@code true} if the provider is configured (credentials present)
     * and theoretically ready to send messages.
     */
    boolean isConfigured();
}
