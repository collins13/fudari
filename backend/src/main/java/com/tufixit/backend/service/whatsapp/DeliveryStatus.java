package com.tufixit.backend.service.whatsapp;

import lombok.Builder;
import lombok.Data;

/**
 * Normalised delivery status — produced by provider-specific webhook
 * controllers for consistent status tracking across providers.
 */
@Data
@Builder
public class DeliveryStatus {
    /** Provider-specific message ID. */
    private String messageId;
    /** Normalised status. */
    private Status status;
    /** Recipient phone in E.164. */
    private String recipientPhone;
    /** Unix epoch seconds (as string, matching WhatsApp convention). */
    private String timestamp;
    /** Optional error code from the provider. */
    private String errorCode;
    /** Optional error message. */
    private String errorMessage;

    public enum Status {
        QUEUED, SENT, DELIVERED, READ, FAILED, UNDELIVERED
    }
}
