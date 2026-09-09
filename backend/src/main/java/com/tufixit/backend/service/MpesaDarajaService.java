package com.tufixit.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Safaricom M-Pesa Daraja 2.0 integration.
 * Supports:
 *  - OAuth token management (auto-refresh)
 *  - STK Push (Lipa Na M-Pesa Online)
 *  - STK Push query (check transaction status)
 *  - Callback HMAC verification
 *
 * Set MPESA_CONSUMER_KEY / MPESA_CONSUMER_SECRET env vars. If blank, runs in stub mode.
 */
@Service
@Slf4j
public class MpesaDarajaService {

    @Value("${mpesa.consumer.key:}")
    private String consumerKey;

    @Value("${mpesa.consumer.secret:}")
    private String consumerSecret;

    @Value("${mpesa.shortcode:174379}")
    private String shortcode;

    @Value("${mpesa.passkey:bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919}")
    private String passkey;

    @Value("${mpesa.callback.url:https://api.fudari.co/api/mpesa/stk-callback}")
    private String callbackUrl;

    @Value("${mpesa.base.url:https://sandbox.safaricom.co.ke}")
    private String baseUrl;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    // Token cache
    private volatile String cachedToken;
    private volatile long tokenExpiresAt;

    // Idempotency: track pending STK push requests
    private final ConcurrentHashMap<String, String> pendingStkRequests = new ConcurrentHashMap<>();

    /**
     * Returns true if M-Pesa credentials are configured. False = stub mode.
     */
    public boolean isConfigured() {
        return consumerKey != null && !consumerKey.isBlank()
                && consumerSecret != null && !consumerSecret.isBlank();
    }

    // ── OAuth Token ──────────────────────────────────────────────────────────

    /**
     * Fetches an OAuth access token from Daraja. Caches until 60s before expiry.
     */
    public String getAccessToken() throws Exception {
        if (cachedToken != null && System.currentTimeMillis() < tokenExpiresAt) {
            return cachedToken;
        }

        if (!isConfigured()) {
            log.warn("[M-Pesa] Not configured — returning stub token");
            return "STUB_TOKEN";
        }

        String credentials = Base64.getEncoder().encodeToString(
                (consumerKey + ":" + consumerSecret).getBytes(StandardCharsets.UTF_8));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/oauth/v1/generate?grant_type=client_credentials"))
                .header("Authorization", "Basic " + credentials)
                .GET()
                .timeout(Duration.ofSeconds(10))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            log.error("[M-Pesa] OAuth failed: {} {}", response.statusCode(), response.body());
            throw new RuntimeException("M-Pesa OAuth failed with status " + response.statusCode());
        }

        JsonNode json = objectMapper.readTree(response.body());
        cachedToken = json.get("access_token").asText();
        long expiresIn = json.has("expires_in") ? json.get("expires_in").asLong() : 3599;
        tokenExpiresAt = System.currentTimeMillis() + (expiresIn - 60) * 1000; // refresh 60s early

        log.info("[M-Pesa] OAuth token acquired, expires in {}s", expiresIn);
        return cachedToken;
    }

    // ── STK Push ─────────────────────────────────────────────────────────────

    /**
     * Initiates an M-Pesa STK Push (Lipa Na M-Pesa Online).
     *
     * @param phoneNumber Kenyan phone number (254XXXXXXXXX format)
     * @param amount      Amount in KES (integer)
     * @param accountRef  Account reference (e.g. "FUDARI-PRO" or "TUF-ABC123")
     * @param description Transaction description
     * @return StkPushResult with CheckoutRequestID and merchant request ID
     */
    public StkPushResult initiateSTKPush(String phoneNumber, int amount, String accountRef, String description) throws Exception {
        String phone = normalizePhone(phoneNumber);

        if (!isConfigured()) {
            log.info("[M-Pesa STUB] STK Push: phone={}, amount={}, ref={}", phone, amount, accountRef);
            return new StkPushResult("STUB_CHECKOUT_" + System.currentTimeMillis(),
                    "STUB_MERCHANT_" + System.currentTimeMillis(), "0", "Success. Request accepted for processing");
        }

        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String password = Base64.getEncoder().encodeToString(
                (shortcode + passkey + timestamp).getBytes(StandardCharsets.UTF_8));

        String token = getAccessToken();

        var payload = new java.util.LinkedHashMap<String, Object>();
        payload.put("BusinessShortCode", shortcode);
        payload.put("Password", password);
        payload.put("Timestamp", timestamp);
        payload.put("TransactionType", "CustomerPayBillOnline");
        payload.put("Amount", amount);
        payload.put("PartyA", phone);
        payload.put("PartyB", shortcode);
        payload.put("PhoneNumber", phone);
        payload.put("CallBackURL", callbackUrl);
        payload.put("AccountReference", accountRef);
        payload.put("TransactionDesc", description != null ? description : "Fudari Payment");

        String body = objectMapper.writeValueAsString(payload);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/mpesa/stkpush/v1/processrequest"))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .timeout(Duration.ofSeconds(30))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        log.info("[M-Pesa] STK Push response: {}", response.body());

        JsonNode json = objectMapper.readTree(response.body());

        String responseCode = json.has("ResponseCode") ? json.get("ResponseCode").asText() : "";
        if (!"0".equals(responseCode)) {
            String desc = json.has("ResponseDescription") ? json.get("ResponseDescription").asText() : response.body();
            log.error("[M-Pesa] STK Push failed: {}", desc);
            throw new RuntimeException("M-Pesa STK Push failed: " + desc);
        }

        String checkoutRequestId = json.get("CheckoutRequestID").asText();
        String merchantRequestId = json.get("MerchantRequestID").asText();

        // Track pending request
        pendingStkRequests.put(checkoutRequestId, phone);

        return new StkPushResult(checkoutRequestId, merchantRequestId, responseCode,
                json.get("ResponseDescription").asText());
    }

    // ── STK Push Query ───────────────────────────────────────────────────────

    /**
     * Queries the status of an STK Push transaction.
     *
     * @param checkoutRequestId The CheckoutRequestID from initiateSTKPush
     * @return StkQueryResult with the result code and description
     */
    public StkQueryResult queryStkPush(String checkoutRequestId) throws Exception {
        if (!isConfigured()) {
            log.info("[M-Pesa STUB] STK Query: checkoutRequestId={}", checkoutRequestId);
            return new StkQueryResult("0", "The service request is processed successfully.");
        }

        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String password = Base64.getEncoder().encodeToString(
                (shortcode + passkey + timestamp).getBytes(StandardCharsets.UTF_8));

        String token = getAccessToken();

        Map<String, Object> payload = Map.of(
                "BusinessShortCode", shortcode,
                "Password", password,
                "Timestamp", timestamp,
                "CheckoutRequestID", checkoutRequestId
        );

        String body = objectMapper.writeValueAsString(payload);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/mpesa/stkpushquery/v1/query"))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .timeout(Duration.ofSeconds(15))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        JsonNode json = objectMapper.readTree(response.body());
        String resultCode = json.has("ResultCode") ? json.get("ResultCode").asText() : "-1";
        String resultDesc = json.has("ResultDesc") ? json.get("ResultDesc").asText() : "Unknown";

        return new StkQueryResult(resultCode, resultDesc);
    }

    // ── Callback Verification ────────────────────────────────────────────────

    /**
     * Verifies M-Pesa callback authenticity using HMAC-SHA256.
     * Safaricom signs the callback body with the passkey.
     *
     * @param rawBody    The raw request body as bytes
     * @param signature  The X-Signature header value from Safaricom
     * @return true if verified, false otherwise
     */
    public boolean verifyCallbackSignature(byte[] rawBody, String signature) {
        if (signature == null || signature.isBlank()) {
            log.warn("[M-Pesa] Callback missing signature header");
            return false;
        }
        if (!isConfigured()) {
            log.info("[M-Pesa STUB] Skipping callback verification in stub mode");
            return true;
        }

        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(
                    passkey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] hmac = mac.doFinal(rawBody);
            String computed = HexFormat.of().formatHex(hmac);

            boolean valid = computed.equalsIgnoreCase(signature);
            if (!valid) {
                log.warn("[M-Pesa] Callback HMAC mismatch. Expected={}, Got={}", computed, signature);
            }
            return valid;
        } catch (Exception e) {
            log.error("[M-Pesa] HMAC verification error", e);
            return false;
        }
    }

    /**
     * Parses the STK Push callback body.
     * Safaricom callback format:
     * { "Body": { "stkCallback": { "MerchantRequestID":"...", "CheckoutRequestID":"...",
     *   "ResultCode":0, "ResultDesc":"...", "CallbackMetadata": { "Item": [...] } } } }
     */
    public StkCallbackData parseCallback(String body) throws Exception {
        JsonNode root = objectMapper.readTree(body);
        JsonNode callback = root.path("Body").path("stkCallback");

        String merchantRequestId = callback.path("MerchantRequestID").asText("");
        String checkoutRequestId = callback.path("CheckoutRequestID").asText("");
        int resultCode = callback.path("ResultCode").asInt(-1);
        String resultDesc = callback.path("ResultDesc").asText("");

        String mpesaReceiptNumber = null;
        String phoneNumber = null;
        double amount = 0;

        if (resultCode == 0 && callback.has("CallbackMetadata")) {
            JsonNode items = callback.path("CallbackMetadata").path("Item");
            for (JsonNode item : items) {
                String name = item.path("Name").asText();
                switch (name) {
                    case "MpesaReceiptNumber" -> mpesaReceiptNumber = item.path("Value").asText();
                    case "PhoneNumber" -> phoneNumber = String.valueOf(item.path("Value").asLong());
                    case "Amount" -> amount = item.path("Value").asDouble();
                }
            }
        }

        // Clean up pending tracking
        pendingStkRequests.remove(checkoutRequestId);

        return new StkCallbackData(merchantRequestId, checkoutRequestId, resultCode, resultDesc,
                mpesaReceiptNumber, phoneNumber, amount);
    }

    // ── Phone normalization ──────────────────────────────────────────────────

    /**
     * Normalizes a Kenyan phone to 254XXXXXXXXX format.
     */
    public String normalizePhone(String phone) {
        if (phone == null) throw new IllegalArgumentException("Phone number is required");
        String cleaned = phone.replaceAll("[\\s\\-()]", "");
        if (cleaned.startsWith("+")) cleaned = cleaned.substring(1);
        if (cleaned.startsWith("0")) cleaned = "254" + cleaned.substring(1);
        if (!cleaned.matches("254[17]\\d{8}")) {
            throw new IllegalArgumentException("Invalid Kenyan phone number: " + phone);
        }
        return cleaned;
    }

    // ── DTOs ─────────────────────────────────────────────────────────────────

    public record StkPushResult(String checkoutRequestId, String merchantRequestId,
                                String responseCode, String responseDescription) {}

    public record StkQueryResult(String resultCode, String resultDesc) {}

    public record StkCallbackData(String merchantRequestId, String checkoutRequestId,
                                  int resultCode, String resultDesc,
                                  String mpesaReceiptNumber, String phoneNumber, double amount) {
        public boolean isSuccess() { return resultCode == 0; }
    }
}
