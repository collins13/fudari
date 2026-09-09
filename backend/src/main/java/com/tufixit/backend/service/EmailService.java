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
import java.time.Year;

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

    @Value("${mail.from-name:FUDARI}")
    private String fromName;

    @Value("${mail.from-address:no-reply@fudari.co}")
    private String fromAddress;

    @Value("${spring.mail.username:}")
    private String smtpUsername;

    @Value("${mail.enabled:true}")
    private boolean enabled;

    @Value("${app.base-url:https://fudari.co}")
    private String baseUrl;

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

    // Mirrors the web app's palette (globals.css --bs-primary / --tx-primary-*).
    private static final String TEAL = "#0D5C63";
    private static final String AMBER = "#FFB020";
    private static final String INK = "#12333A";
    private static final String MUTED = "#6C7F84";
    private static final String TINT = "#F0F6F6";
    private static final String BORDER = "#E3ECEC";
    private static final String FONT = "Arial,Helvetica,sans-serif";

    /**
     * Wraps body markup in the branded shell.
     *
     * Table-based with inline styles only — Gmail strips <style> blocks and Outlook
     * ignores flexbox, so this is deliberately not written like the web UI.
     */
    private String shell(String preheader, String heading, String bodyHtml) {
        return """
            <!doctype html>
            <html lang="en">
            <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <meta name="color-scheme" content="light only">
            <meta name="supported-color-schemes" content="light only">
            <title>{{HEADING}}</title>
            </head>
            <body style="margin:0;padding:0;background:{{TINT}};-webkit-font-smoothing:antialiased">
            <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">{{PREHEADER}}</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{{TINT}}">
              <tr><td align="center" style="padding:24px 12px">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid {{BORDER}};border-radius:14px;overflow:hidden">

                  <tr><td style="background:{{TEAL}};padding:26px 32px 22px">
                    <div style="font:800 24px/1 {{FONT}};color:#ffffff;letter-spacing:0.5px">FUDARI</div>
                    <div style="margin-top:8px;font:700 10px/1 {{FONT}};color:#8FBEC2;letter-spacing:1.6px">KENYA'S SERVICES MARKETPLACE</div>
                  </td></tr>
                  <tr><td style="height:4px;background:{{AMBER}};font-size:0;line-height:0">&nbsp;</td></tr>

                  <tr><td style="padding:32px">
                    <h1 style="margin:0 0 14px;font:700 22px/1.3 {{FONT}};color:{{INK}}">{{HEADING}}</h1>
                    {{BODY}}
                  </td></tr>

                  <tr><td style="background:#F7FAFA;border-top:1px solid {{BORDER}};padding:22px 32px">
                    <p style="margin:0 0 6px;font:400 12px/1.6 {{FONT}};color:{{MUTED}}">
                      Need a hand? Write to <a href="mailto:support@fudari.co" style="color:{{TEAL}};font-weight:700;text-decoration:none">support@fudari.co</a>.
                    </p>
                    <p style="margin:0;font:400 11px/1.6 {{FONT}};color:#9AAAAE">
                      &copy; {{YEAR}} Fudari &middot; Nairobi, Kenya
                    </p>
                  </td></tr>

                </table>
              </td></tr>
            </table>
            </body></html>
            """
                .replace("{{BODY}}", bodyHtml)
                .replace("{{HEADING}}", escape(heading))
                .replace("{{PREHEADER}}", escape(preheader))
                .replace("{{YEAR}}", String.valueOf(Year.now().getValue()))
                .replace("{{FONT}}", FONT)
                .replace("{{TINT}}", TINT)
                .replace("{{BORDER}}", BORDER)
                .replace("{{TEAL}}", TEAL)
                .replace("{{AMBER}}", AMBER)
                .replace("{{INK}}", INK)
                .replace("{{MUTED}}", MUTED);
    }

    private String paragraph(String html) {
        return "<p style=\"margin:0 0 16px;font:400 15px/1.65 " + FONT + ";color:#3F5257\">" + html + "</p>";
    }

    /** Amber-flagged panel used for credentials and other must-read details. */
    private String panel(String label, String rowsHtml) {
        return "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\""
                + " style=\"margin:0 0 20px;background:" + TINT + ";border-left:4px solid " + AMBER + ";border-radius:8px\">"
                + "<tr><td style=\"padding:16px 18px\">"
                + "<div style=\"margin:0 0 10px;font:700 11px/1 " + FONT + ";color:" + MUTED + ";letter-spacing:1.2px;text-transform:uppercase\">"
                + escape(label) + "</div>" + rowsHtml
                + "</td></tr></table>";
    }

    private String panelRow(String label, String value, boolean mono) {
        String valueStyle = mono
                ? "font:700 15px/1.5 'Courier New',Courier,monospace;color:" + INK
                : "font:600 15px/1.5 " + FONT + ";color:" + INK;
        return "<div style=\"margin:0 0 6px\">"
                + "<span style=\"font:400 13px/1.5 " + FONT + ";color:" + MUTED + "\">" + escape(label) + ":</span> "
                + "<span style=\"" + valueStyle + "\">" + escape(value) + "</span></div>";
    }

    private String button(String url, String label) {
        return "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin:8px 0 4px\">"
                + "<tr><td align=\"center\" style=\"background:" + TEAL + ";border-radius:8px\">"
                + "<a href=\"" + url + "\" style=\"display:inline-block;padding:13px 30px;font:700 15px/1 " + FONT
                + ";color:#ffffff;text-decoration:none\">" + escape(label) + "</a>"
                + "</td></tr></table>";
    }

    /**
     * Confirmation email sent to an artisan after admin-assisted onboarding.
     */
    public void sendArtisanOnboardedEmail(String to, String firstName, String tempPassword,
                                          String phoneNumber, boolean autoApproved) {
        if (to == null || to.isBlank()) return;
        String subject = autoApproved
                ? "Welcome to FUDARI — your account is live"
                : "Welcome to FUDARI — your application is under review";

        String statusLine = autoApproved
                ? "Your account is <strong style=\"color:" + TEAL + "\">approved</strong> and customers can already find you."
                : "Your account is <strong style=\"color:" + TEAL + "\">pending review</strong>. We'll email you the moment it's approved.";

        String body = paragraph(statusLine)
                + panel("Your sign-in details",
                        panelRow("Phone", phoneNumber, false)
                                + panelRow("Temporary password", tempPassword, true))
                + paragraph("Change this password as soon as you sign in — it was generated for you and is only meant for first access.")
                + button(baseUrl + "/login", "Sign in to your dashboard")
                + paragraph("<span style=\"font-size:13px;color:" + MUTED + "\">Didn't expect this email? "
                        + "Let us know at support@fudari.co and we'll close the account.</span>");

        String text = "Karibu FUDARI, " + firstName + "!\n\n"
                + (autoApproved
                    ? "Your account is approved and live."
                    : "Your application is under review. We will notify you once approved.")
                + "\n\nSign-in details:\n"
                + "Phone: " + phoneNumber + "\n"
                + "Temporary password: " + tempPassword + "\n\n"
                + "Please change your password after you sign in: " + baseUrl + "/login\n\n"
                + "— FUDARI";

        String heading = "Karibu, " + firstName + "!";
        sendHtml(to, subject, shell(subject, heading, body), text);
    }

    /** Sent when an admin approves a pending provider application. */
    public void sendProviderApprovedEmail(String to, String firstName) {
        if (to == null || to.isBlank()) return;
        String subject = "Your FUDARI account is approved";

        String body = paragraph("Good news — your account has been reviewed and <strong style=\"color:" + TEAL
                        + "\">approved</strong>. Your profile is now live and customers in your area can find and book you.")
                + paragraph("To get your first booking faster, add photos of past work, keep your service area accurate, "
                        + "and reply quickly when a request comes in.")
                + button(baseUrl + "/dashboard", "Go to your dashboard");

        String text = "Hi " + firstName + ",\n\n"
                + "Your FUDARI account has been approved and is now visible to customers.\n\n"
                + "Dashboard: " + baseUrl + "/dashboard\n\n— FUDARI";

        sendHtml(to, subject, shell(subject, "You're approved, " + firstName + "!", body), text);
    }

    /** Sent when an admin rejects a provider application. */
    public void sendProviderRejectedEmail(String to, String firstName, String reason) {
        if (to == null || to.isBlank()) return;
        String subject = "Update on your FUDARI application";

        String body = paragraph("Thank you for applying to join FUDARI. After review, we're not able to approve "
                        + "your account at this time.")
                + (reason != null && !reason.isBlank()
                    ? panel("Reason", "<div style=\"font:400 15px/1.6 " + FONT + ";color:" + INK + "\">"
                        + escape(reason) + "</div>")
                    : "")
                + paragraph("This isn't necessarily final. If you can address the point above — or if you think we've "
                        + "made a mistake — reply to this email and we'll take another look.")
                + button("mailto:support@fudari.co", "Contact support");

        String text = "Hi " + firstName + ",\n\n"
                + "After review, your FUDARI application has not been approved at this time.\n"
                + (reason != null && !reason.isBlank() ? "Reason: " + reason + "\n\n" : "\n")
                + "Contact support@fudari.co if you believe this was a mistake.\n\n— FUDARI";

        sendHtml(to, subject, shell(subject, "Hi " + firstName + ",", body), text);
    }

    /** Minimal HTML escape for user-supplied substitutions. */
    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#39;");
    }
}
