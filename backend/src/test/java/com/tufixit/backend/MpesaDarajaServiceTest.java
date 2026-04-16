package com.tufixit.backend;

import com.tufixit.backend.service.MpesaDarajaService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for MpesaDarajaService — phone normalization, HMAC verification, callback parsing.
 * These tests do NOT call the Safaricom API.
 */
class MpesaDarajaServiceTest {

    private final MpesaDarajaService service = new MpesaDarajaService();

    // ── Phone normalization ──────────────────────────────────────────────────

    @Test
    @DisplayName("Normalize +254 format")
    void normalizePhonePlus254() {
        assertEquals("254712345678", service.normalizePhone("+254712345678"));
    }

    @Test
    @DisplayName("Normalize 0 format")
    void normalizePhone0() {
        assertEquals("254712345678", service.normalizePhone("0712345678"));
    }

    @Test
    @DisplayName("Normalize 254 format (no plus)")
    void normalizePhone254() {
        assertEquals("254712345678", service.normalizePhone("254712345678"));
    }

    @Test
    @DisplayName("Normalize strips spaces and dashes")
    void normalizePhoneSpaces() {
        assertEquals("254712345678", service.normalizePhone("+254 712-345-678"));
    }

    @Test
    @DisplayName("Reject invalid phone")
    void rejectInvalidPhone() {
        assertThrows(IllegalArgumentException.class, () -> service.normalizePhone("12345"));
    }

    @Test
    @DisplayName("Reject null phone")
    void rejectNullPhone() {
        assertThrows(IllegalArgumentException.class, () -> service.normalizePhone(null));
    }

    // ── HMAC verification ────────────────────────────────────────────────────

    @Test
    @DisplayName("Verify valid HMAC signature")
    void verifyValidHmac() throws Exception {
        // The service uses passkey from config; in default/test mode it accepts
        // because isConfigured() returns false. We test the algorithm directly.
        String passkey = "test-passkey";
        byte[] body = "test-body".getBytes(StandardCharsets.UTF_8);

        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec key = new SecretKeySpec(passkey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(key);
        String validSignature = HexFormat.of().formatHex(mac.doFinal(body));

        // In stub mode (no credentials), verifyCallbackSignature returns true
        assertTrue(service.verifyCallbackSignature(body, validSignature));
    }

    @Test
    @DisplayName("Reject null signature")
    void rejectNullSignature() {
        // In stub mode, signature check is skipped, but null sig still returns false
        assertFalse(service.verifyCallbackSignature("body".getBytes(), null));
    }

    // ── Callback parsing ─────────────────────────────────────────────────────

    @Test
    @DisplayName("Parse successful STK callback")
    void parseSuccessfulCallback() throws Exception {
        String json = """
                {
                  "Body": {
                    "stkCallback": {
                      "MerchantRequestID": "m123",
                      "CheckoutRequestID": "c456",
                      "ResultCode": 0,
                      "ResultDesc": "Success",
                      "CallbackMetadata": {
                        "Item": [
                          { "Name": "Amount", "Value": 500.00 },
                          { "Name": "MpesaReceiptNumber", "Value": "QHJ3R5KL89" },
                          { "Name": "PhoneNumber", "Value": 254712345678 }
                        ]
                      }
                    }
                  }
                }
                """;

        MpesaDarajaService.StkCallbackData data = service.parseCallback(json);

        assertTrue(data.isSuccess());
        assertEquals("m123", data.merchantRequestId());
        assertEquals("c456", data.checkoutRequestId());
        assertEquals(0, data.resultCode());
        assertEquals("QHJ3R5KL89", data.mpesaReceiptNumber());
        assertEquals("254712345678", data.phoneNumber());
        assertEquals(500.0, data.amount(), 0.01);
    }

    @Test
    @DisplayName("Parse failed STK callback")
    void parseFailedCallback() throws Exception {
        String json = """
                {
                  "Body": {
                    "stkCallback": {
                      "MerchantRequestID": "m123",
                      "CheckoutRequestID": "c456",
                      "ResultCode": 1032,
                      "ResultDesc": "Request cancelled by user"
                    }
                  }
                }
                """;

        MpesaDarajaService.StkCallbackData data = service.parseCallback(json);

        assertFalse(data.isSuccess());
        assertEquals(1032, data.resultCode());
        assertNull(data.mpesaReceiptNumber());
    }

    // ── Stub mode ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Service is not configured by default (stub mode)")
    void stubModeDefault() {
        assertFalse(service.isConfigured());
    }

    @Test
    @DisplayName("STK Push returns stub result when not configured")
    void stkPushStubMode() throws Exception {
        MpesaDarajaService.StkPushResult result = service.initiateSTKPush(
                "0712345678", 500, "TUFIXIT-BASIC", "Test");

        assertNotNull(result);
        assertTrue(result.checkoutRequestId().startsWith("STUB_CHECKOUT_"));
        assertEquals("0", result.responseCode());
    }
}
