package com.tufixit.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * SMS notification service backed by Africa's Talking.
 *
 * Set the following env vars to go live:
 *   AT_API_KEY   – Africa's Talking API key
 *   AT_USERNAME  – Africa's Talking username (use "sandbox" for testing)
 *   AT_SENDER_ID – Short-code or sender ID (e.g. "TUFIXIT")
 *
 * When AT_API_KEY is blank the service logs the message instead of sending it,
 * so the app works without configuration in development.
 */
@Service
@Slf4j
public class SmsService {

    @Value("${africastalking.api-key:}")
    private String apiKey;

    @Value("${africastalking.username:sandbox}")
    private String username;

    @Value("${africastalking.sender-id:TUFIXIT}")
    private String senderId;

    @Value("${africastalking.environment:live}")
    private String environment;

    @jakarta.annotation.PostConstruct
    void logConfig() {
        String maskedKey = (apiKey != null && apiKey.length() > 8)
                ? apiKey.substring(0, 8) + "…" : "(empty)";
        log.info("[SMS] Config — env={}, username={}, apiKey={}, senderId={}",
                environment, username, maskedKey,
                (senderId == null || senderId.isBlank()) ? "(default)" : senderId);
    }

    // ── Public send method ────────────────────────────────────────────────────

    public void send(String phone, String message) {
        if (phone == null || phone.isBlank()) return;
        String normalised = normalise(phone);
        if (normalised == null) {
            log.warn("[SMS] Skipping send — phone could not be normalised: {}", phone);
            return;
        }
        if (apiKey == null || apiKey.isBlank()) {
            log.info("[SMS-STUB] To: {} | {}", normalised, message);
            return;
        }
        try {
            sendViaat(normalised, message);
        } catch (Exception e) {
            log.warn("[SMS] Failed to send to {}: {}", normalised, e.getMessage());
        }
    }

    // ── Template methods ──────────────────────────────────────────────────────

    public void notifyArtisanNewBooking(String artisanPhone, String customerName, String bookingCode) {
        send(artisanPhone,
            "TUFIXIT: New job from " + customerName + ". " +
            "Booking #" + bookingCode + ". View: tufixit.com/dashboard/jobs");
    }

    public void notifyCustomerAccepted(String customerPhone, String artisanName, String bookingCode) {
        send(customerPhone,
            "TUFIXIT: " + artisanName + " accepted your job. " +
            "Track: tufixit.com/track/" + bookingCode);
    }

    public void notifyCustomerDeclined(String customerPhone, String bookingCode, String reason) {
        send(customerPhone,
            "TUFIXIT: Sorry, artisan could not take your job (" + reason + "). " +
            "Browse others: tufixit.com/artisans");
    }

    public void notifyCustomerArtisanArrived(String customerPhone, String startPin, String bookingCode) {
        send(customerPhone,
            "TUFIXIT: Your artisan has arrived! Give them this START PIN: " + startPin +
            ". Track: tufixit.com/track/" + bookingCode);
    }

    public void notifyCustomerJobCompleted(String customerPhone, String artisanName, String bookingCode) {
        send(customerPhone,
            "TUFIXIT: Job complete! Rate " + artisanName + " at tufixit.com/rate/" + bookingCode);
    }

    public void notifyArtisanPaymentReminder(String artisanPhone, String bookingCode) {
        send(artisanPhone,
            "TUFIXIT: Please record payment for job " + bookingCode + ". " +
            "Customers trust artisans who keep complete records.");
    }

    public void notifyCancellation(String phone, String bookingCode, String reason) {
        send(phone,
            "TUFIXIT: Job " + bookingCode + " has been cancelled. Reason: " + reason);
    }

    public void notifyCustomerCounterOffer(String customerPhone, String artisanName,
                                            String bookingCode, Integer counterPrice, String note) {
        String extra = (note != null && !note.isBlank()) ? " Note: " + note + "." : "";
        send(customerPhone,
            "TUFIXIT: " + artisanName + " proposed a new price of KES " + counterPrice +
            " for job " + bookingCode + "." + extra +
            " Accept/reject: tufixit.com/track/" + bookingCode);
    }

    public void notifyArtisanCounterAccepted(String artisanPhone, String bookingCode, Integer price) {
        send(artisanPhone,
            "TUFIXIT: Customer accepted your counter-offer of KES " + price +
            " for job " + bookingCode + ". Proceed to the customer location.");
    }

    public void notifyArtisanCounterRejected(String artisanPhone, String bookingCode) {
        send(artisanPhone,
            "TUFIXIT: Customer rejected your counter-offer for job " + bookingCode +
            ". The booking has been declined.");
    }

    public void notifyGatePass(String phone, String accessCode, String bookingCode, String location) {
        send(phone,
            "TUFIXIT GATEPASS: Access code " + accessCode + " for job " + bookingCode +
            " at " + location + ". Show this code at the estate gate for entry.");
    }

    public void notifyArtisanOnboarded(String artisanPhone, String firstName,
                                        String tempPassword, boolean autoApproved) {
        String status = autoApproved
                ? "Your account is APPROVED and live."
                : "Your account is PENDING admin review.";
        send(artisanPhone,
            "TUFIXIT: Karibu " + firstName + "! " + status +
            " Login at tufixit.com/login with phone " + artisanPhone +
            " and temp password: " + tempPassword + ". Change it after login.");
    }

    // ── Africa's Talking HTTP call ────────────────────────────────────────────

    private void sendViaat(String phone, String message) throws Exception {
        // Africa's Talking REST API — use sandbox URL for testing
        String baseUrl = "sandbox".equalsIgnoreCase(environment)
                ? "https://api.sandbox.africastalking.com/version1/messaging"
                : "https://api.africastalking.com/version1/messaging";
        java.net.URL url = new java.net.URL(baseUrl);
        java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setDoOutput(true);
        conn.setRequestProperty("Accept", "application/json");
        conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
        conn.setRequestProperty("apiKey", apiKey);

        String body = "username=" + java.net.URLEncoder.encode(username, "UTF-8") +
                      "&to=" + java.net.URLEncoder.encode(phone, "UTF-8") +
                      "&message=" + java.net.URLEncoder.encode(message, "UTF-8");

        // Only include sender ID if it is explicitly configured (approved IDs only)
        if (senderId != null && !senderId.isBlank()) {
            body += "&from=" + java.net.URLEncoder.encode(senderId, "UTF-8");
        }

        try (java.io.OutputStream os = conn.getOutputStream()) {
            os.write(body.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        }

        int responseCode = conn.getResponseCode();
        String responseBody = readStream(
                responseCode >= 200 && responseCode < 300
                        ? conn.getInputStream()
                        : conn.getErrorStream());

        if (responseCode == 201 || responseCode == 200) {
            log.info("[SMS] Sent to {} — AT response: {}", phone, responseBody);
        } else {
            log.warn("[SMS] AT returned HTTP {} for {} — response: {}", responseCode, phone, responseBody);
        }
    }

    /** Read an input stream fully into a String, returning "" on null/error. */
    private static String readStream(java.io.InputStream is) {
        if (is == null) return "";
        try (java.io.BufferedReader br = new java.io.BufferedReader(new java.io.InputStreamReader(is, java.nio.charset.StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) sb.append(line);
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    // ── Normalise & validate Kenyan phone to +254 format ──────────────────────

    private static final java.util.regex.Pattern KENYAN_PHONE =
            java.util.regex.Pattern.compile("^\\+254[17]\\d{8}$");

    /**
     * Normalise a Kenyan phone number to international +254… format.
     * Accepts: 0712345678, 254712345678, +254712345678
     * Rejects anything that doesn't resolve to a valid Kenyan mobile/landline.
     */
    String normalise(String phone) {
        if (phone == null) return null;
        // Strip spaces, dashes, parentheses
        phone = phone.trim().replaceAll("[\\s\\-()]+", "");
        if (phone.startsWith("0") && phone.length() == 10) {
            phone = "+254" + phone.substring(1);
        } else if (phone.startsWith("254") && !phone.startsWith("+")) {
            phone = "+" + phone;
        }
        if (!KENYAN_PHONE.matcher(phone).matches()) {
            log.warn("[SMS] Invalid Kenyan phone rejected: {}", phone);
            return null;
        }
        return phone;
    }

    /**
     * Validate phone number format without sending. Useful for pre-send checks.
     */
    public boolean isValidKenyanPhone(String phone) {
        return normalise(phone) != null;
    }
}
