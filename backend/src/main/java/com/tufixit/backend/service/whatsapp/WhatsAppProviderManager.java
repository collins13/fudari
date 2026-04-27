package com.tufixit.backend.service.whatsapp;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Factory / façade that selects the active {@link WhatsAppProvider} based on
 * configuration and provides transparent fallback when the primary fails.
 *
 * <pre>
 *  ┌───────────────────────────────────────────────────────────┐
 *  │                WhatsAppProviderManager                     │
 *  │                                                           │
 *  │  whatsapp.provider = twilio | meta                        │
 *  │  whatsapp.fallback.enabled = true | false                 │
 *  │                                                           │
 *  │  sendText(to, body)                                       │
 *  │    ├── try primary provider                               │
 *  │    │   └── success → return                               │
 *  │    └── if fallback enabled                                │
 *  │        └── try secondary provider                         │
 *  └───────────────────────────────────────────────────────────┘
 * </pre>
 *
 * To switch providers, change the {@code WHATSAPP_PROVIDER} env var
 * and restart. No code changes needed.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WhatsAppProviderManager {

    private final TwilioWhatsAppProvider twilioProvider;
    private final MetaWhatsAppProvider metaProvider;

    /** Active provider name: "twilio" or "meta". Defaults to "twilio". */
    @Value("${whatsapp.provider:twilio}")
    private String activeProviderName;

    /** Whether to attempt the other provider if the primary fails. */
    @Value("${whatsapp.fallback.enabled:false}")
    private boolean fallbackEnabled;

    private WhatsAppProvider primary;
    private WhatsAppProvider secondary;

    @PostConstruct
    void init() {
        if ("meta".equalsIgnoreCase(activeProviderName)) {
            primary = metaProvider;
            secondary = twilioProvider;
        } else {
            primary = twilioProvider;
            secondary = metaProvider;
        }
        log.info("[WA-MANAGER] Primary provider: {} (configured={}), fallback={} (configured={})",
                primary.providerName(), primary.isConfigured(),
                fallbackEnabled ? secondary.providerName() : "disabled",
                secondary.isConfigured());
    }

    /** Returns the currently active primary provider. */
    public WhatsAppProvider getPrimary() {
        return primary;
    }

    /** Returns the active provider name ("twilio" or "meta"). */
    public String getActiveProviderName() {
        return primary.providerName();
    }

    /**
     * Send a text message via the primary provider, falling back to the
     * secondary if enabled and the primary fails.
     *
     * @return message ID from the successful provider, or null if both fail
     */
    public String sendText(String to, String body) {
        String messageId = primary.sendText(to, body);
        if (messageId != null) return messageId;

        // Primary returned null — was it a stub or a real failure?
        if (!primary.isConfigured()) {
            // Stub mode — don't fallback, the primary intentionally logged it
            return null;
        }

        if (fallbackEnabled && secondary.isConfigured()) {
            log.warn("[WA-MANAGER] Primary ({}) failed for {}, falling back to {}",
                    primary.providerName(), to, secondary.providerName());
            return secondary.sendText(to, body);
        }
        return null;
    }

    /**
     * Send a template message via the primary provider, with fallback.
     */
    public String sendTemplate(String to, String templateName, String languageCode, String... parameters) {
        String messageId = primary.sendTemplate(to, templateName, languageCode, parameters);
        if (messageId != null) return messageId;

        if (!primary.isConfigured()) return null;

        if (fallbackEnabled && secondary.isConfigured()) {
            log.warn("[WA-MANAGER] Primary ({}) template failed for {}, falling back to {}",
                    primary.providerName(), to, secondary.providerName());
            return secondary.sendTemplate(to, templateName, languageCode, parameters);
        }
        return null;
    }

    /** Returns true if at least one provider is configured. */
    public boolean isAnyProviderConfigured() {
        return primary.isConfigured() || secondary.isConfigured();
    }
}
