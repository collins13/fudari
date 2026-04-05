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

    // ── Public send method ────────────────────────────────────────────────────

    public void send(String phone, String message) {
        if (phone == null || phone.isBlank()) return;
        String normalised = normalise(phone);
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

    // ── Africa's Talking HTTP call ────────────────────────────────────────────

    private void sendViaat(String phone, String message) throws Exception {
        // Africa's Talking REST API
        java.net.URL url = new java.net.URL("https://api.africastalking.com/version1/messaging");
        java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setDoOutput(true);
        conn.setRequestProperty("Accept", "application/json");
        conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
        conn.setRequestProperty("apiKey", apiKey);

        String body = "username=" + java.net.URLEncoder.encode(username, "UTF-8") +
                      "&to=" + java.net.URLEncoder.encode(phone, "UTF-8") +
                      "&message=" + java.net.URLEncoder.encode(message, "UTF-8") +
                      "&from=" + java.net.URLEncoder.encode(senderId, "UTF-8");

        try (java.io.OutputStream os = conn.getOutputStream()) {
            os.write(body.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        }

        int responseCode = conn.getResponseCode();
        if (responseCode == 201 || responseCode == 200) {
            log.info("[SMS] Sent to {}", phone);
        } else {
            log.warn("[SMS] AT returned HTTP {} for {}", responseCode, phone);
        }
    }

    // ── Normalise Kenyan phone to +254 format ─────────────────────────────────

    private String normalise(String phone) {
        phone = phone.trim().replaceAll("\\s+", "");
        if (phone.startsWith("0") && phone.length() == 10) {
            return "+254" + phone.substring(1);
        }
        if (phone.startsWith("254") && !phone.startsWith("+")) {
            return "+" + phone;
        }
        return phone;
    }
}
