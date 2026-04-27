package com.tufixit.backend.service;

import jakarta.annotation.PostConstruct;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

/**
 * Transactional email service backed by Spring's JavaMailSender.
 *
 * Configure via env vars:
 *   MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD,
 *   MAIL_FROM_NAME, MAIL_FROM_ADDRESS, MAIL_ENABLED
 *
 * When MAIL_ENABLED=false or password is blank the service logs the message
 * instead of sending it, so the app works without configuration in dev.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${mail.from-name:TUFIXIT}")
    private String fromName;

    @Value("${mail.from-address:no-reply@tufixit.com}")
    private String fromAddress;

    @Value("${spring.mail.username:}")
    private String smtpUsername;

    @Value("${mail.enabled:true}")
    private boolean enabled;

    @Autowired
    private void log(@Value("${spring.mail.host:}") String host,
                     @Value("${spring.mail.port:0}") int port) {
        // No-op: this Setter exists so we can log config in @PostConstruct below.
    }

    @PostConstruct
    void logConfig() {
        log.info("[EMAIL] Config — enabled={}, from={} <{}>", enabled, fromName, fromAddress);
    }

    /** Send a plain-text email. Best-effort; never throws. */
    @Async
    public void sendText(String to, String subject, String body) {
        if (!shouldSend(to)) {
            log.info("[EMAIL-STUB] To: {} | {} | {}", to, subject, body);
            return;
        }
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, false, StandardCharsets.UTF_8.name());
            helper.setFrom(new InternetAddress(fromAddress, fromName));
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, false);
            mailSender.send(msg);
            log.info("[EMAIL] Sent to {} — subject: {}", to, subject);
        } catch (Exception e) {
            log.warn("[EMAIL] Failed to send to {}: {}", to, e.getMessage());
        }
    }

    /** Send an HTML email with a plain-text fallback. Best-effort; never throws. */
    @Async
    public void sendHtml(String to, String subject, String html, String textFallback) {
        if (!shouldSend(to)) {
            log.info("[EMAIL-STUB-HTML] To: {} | {} | {}", to, subject, textFallback);
            return;
        }
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, StandardCharsets.UTF_8.name());
            helper.setFrom(new InternetAddress(fromAddress, fromName));
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(textFallback != null ? textFallback : "", html);
            mailSender.send(msg);
            log.info("[EMAIL] Sent HTML to {} — subject: {}", to, subject);
        } catch (Exception e) {
            log.warn("[EMAIL] Failed to send HTML to {}: {}", to, e.getMessage());
        }
    }

    private boolean shouldSend(String to) {
        if (!enabled) return false;
        if (to == null || to.isBlank()) return false;
        if (smtpUsername == null || smtpUsername.isBlank()) return false;
        return true;
    }

    // ── Templates ─────────────────────────────────────────────────────────────

    /**
     * Confirmation email sent to an artisan after admin-assisted onboarding.
     */
    public void sendArtisanOnboardedEmail(String to, String firstName, String tempPassword,
                                          String phoneNumber, boolean autoApproved) {
        if (to == null || to.isBlank()) return;
        String subject = autoApproved
                ? "Welcome to TUFIXIT — your artisan account is live"
                : "Welcome to TUFIXIT — your application is under review";

        String safeName = escape(firstName);
        String safePhone = escape(phoneNumber);
        String safePassword = escape(tempPassword);
        String statusLine = autoApproved
                ? "Your account has been <strong>approved</strong> and is visible to customers."
                : "Your account is currently <strong>pending review</strong>. We'll notify you once approved.";

        String html = "<!doctype html><html><body style=\"font-family:Arial,sans-serif;background:#f6f7f9;padding:24px;color:#222\">"
                + "<div style=\"max-width:560px;margin:auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #eee\">"
                + "<h2 style=\"color:#F84525;margin:0 0 8px\">Karibu TUFIXIT, " + safeName + "!</h2>"
                + "<p style=\"margin:0 0 16px;color:#555\">" + statusLine + "</p>"
                + "<div style=\"background:#fafafa;border:1px solid #eee;border-radius:8px;padding:16px;margin:16px 0\">"
                + "<p style=\"margin:0 0 8px;font-size:13px;color:#888\">Sign-in credentials</p>"
                + "<p style=\"margin:0\"><strong>Phone:</strong> " + safePhone + "</p>"
                + "<p style=\"margin:0\"><strong>Temporary password:</strong> "
                + "<code style=\"background:#fff;padding:2px 6px;border-radius:4px\">" + safePassword + "</code></p>"
                + "</div>"
                + "<p style=\"margin:0 0 16px\">Please log in and change your password as soon as possible.</p>"
                + "<a href=\"https://tufixit.com/login\" style=\"display:inline-block;background:#F84525;color:#fff;"
                + "padding:10px 22px;border-radius:24px;text-decoration:none;font-weight:600\">Sign in</a>"
                + "<p style=\"margin:24px 0 0;font-size:12px;color:#999\">"
                + "If you did not expect this email please contact support@tufixit.com.</p>"
                + "</div></body></html>";

        String text = "Karibu TUFIXIT, " + firstName + "!\n\n"
                + (autoApproved
                    ? "Your artisan account is approved and live."
                    : "Your artisan application is under review. We will notify you once approved.")
                + "\n\nSign-in details:\n"
                + "Phone: " + phoneNumber + "\n"
                + "Temporary password: " + tempPassword + "\n\n"
                + "Please change your password after you sign in: https://tufixit.com/login\n\n"
                + "— TUFIXIT";

        sendHtml(to, subject, html, text);
    }

    /** Minimal HTML escape for user-supplied substitutions. */
    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#39;");
    }
}
