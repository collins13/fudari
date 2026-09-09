package com.tufixit.backend.service;

import com.tufixit.backend.entity.Subscription;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.repository.SubscriptionRepository;
import com.tufixit.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Subscription lifecycle manager for weekly and monthly billing cycles.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  Scheduled jobs (all run within a DB transaction):                  │
 * │                                                                      │
 * │  1. [24h before expiry]  → Send M-Pesa renewal reminder via SMS     │
 * │     "Renew your Fudari PRO weekly — KES 800 to 522522..."          │
 * │                                                                      │
 * │  2. [On expiry]          → Move ACTIVE → GRACE_PERIOD               │
 * │     Artisan retains ranking for 48 hours — no immediate disruption  │
 * │                                                                      │
 * │  3. [48h after expiry]   → Move GRACE_PERIOD → EXPIRED              │
 * │     Artisan rank drops to FREE level (SCORE_FREE = 40)              │
 * │     Artisan receives "your visibility has been reduced" SMS          │
 * │                                                                      │
 * │  Why 48h grace period?                                               │
 * │  Artisans often get paid on a job-completion basis — they may        │
 * │  not have cash at the exact moment of weekly renewal. A 48h        │
 * │  buffer prevents rank disruption for artisans who pay within 2 days.│
 * └──────────────────────────────────────────────────────────────────────┘
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionRenewalScheduler {

    private final SubscriptionRepository subscriptionRepo;
    private final UserRepository userRepository;
    private final SmsService smsService;

    /** Runs every hour, checks for subscriptions needing state transitions. */
    @Scheduled(fixedDelay = 60 * 60 * 1000)
    @Transactional
    public void runRenewalCycle() {
        LocalDateTime now = LocalDateTime.now();
        sendUpcomingRenewalReminders(now);
        enterGracePeriod(now);
        expireGracePeriodSubscriptions(now);
    }

    // ── Step 1: 24-hour reminder ─────────────────────────────────────────────

    /**
     * Find ACTIVE subscriptions expiring in the next 1 hour window
     * that haven't been reminded yet, and send an M-Pesa renewal SMS.
     *
     * We use a 1-hour detection window (runs hourly) to fire the reminder
     * approximately 24 hours before expiry without double-sending.
     */
    private void sendUpcomingRenewalReminders(LocalDateTime now) {
        LocalDateTime reminderWindowStart = now.plusHours(23);
        LocalDateTime reminderWindowEnd   = now.plusHours(25);

        List<Subscription> expiringSoon = subscriptionRepo.findByStatusAndEndDateBetween(
                Subscription.SubscriptionStatus.ACTIVE, reminderWindowStart, reminderWindowEnd);

        for (Subscription sub : expiringSoon) {
            User artisan = sub.getArtisan();
            if (artisan == null || artisan.getPhoneNumber() == null) continue;

            String planLabel = sub.getPlanType().name();
            int price = sub.getPriceKes();
            String cycleLabel = switch (sub.getBillingCycle()) {
                case DAILY   -> "daily";
                case WEEKLY  -> "weekly";
                case MONTHLY -> "monthly";
            };

            smsService.send(artisan.getPhoneNumber(), String.format(
                "FUDARI: Your %s %s plan expires in ~24 hours.\n" +
                "Renew in the app - open Subscription and tap Renew. We'll send an M-Pesa prompt for KES %d.",
                planLabel, cycleLabel, price
            ));

            log.info("[RENEWAL] Reminder sent to artisan {} (plan={}, cycle={}, expires={})",
                    artisan.getId(), planLabel, cycleLabel, sub.getEndDate());
        }
    }

    // ── Step 2: Transition to grace period ──────────────────────────────────

    /** Move ACTIVE subscriptions whose endDate has passed into GRACE_PERIOD. */
    private void enterGracePeriod(LocalDateTime now) {
        List<Subscription> expired = subscriptionRepo.findByStatusAndEndDateBefore(
                Subscription.SubscriptionStatus.ACTIVE, now);

        for (Subscription sub : expired) {
            if (sub.getPlanType() == Subscription.PlanType.FREE) continue; // free never expires

            sub.setStatus(Subscription.SubscriptionStatus.GRACE_PERIOD);
            subscriptionRepo.save(sub);

            User artisan = sub.getArtisan();
            if (artisan != null && artisan.getPhoneNumber() != null) {
                int price = sub.getPriceKes();

                smsService.send(artisan.getPhoneNumber(), String.format(
                    "FUDARI: Your %s plan has expired. You have 48 hours to renew before your " +
                    "search ranking is reduced.\n" +
                    "Renew in the app - open Subscription and tap Renew (KES %d).",
                    sub.getPlanType().name(), price
                ));

                log.info("[RENEWAL] Grace period started for artisan {} (plan={}, was-end={})",
                        artisan.getId(), sub.getPlanType(), sub.getEndDate());
            }
        }
    }

    // ── Step 3: Expire grace period ──────────────────────────────────────────

    /**
     * Move GRACE_PERIOD subscriptions whose endDate was more than 48 hours ago to EXPIRED.
     * Downgrade artisan vetting level to STANDARD.
     */
    private void expireGracePeriodSubscriptions(LocalDateTime now) {
        LocalDateTime graceCutoff = now.minusHours(48);

        List<Subscription> graceExpired = subscriptionRepo.findByStatusAndEndDateBefore(
                Subscription.SubscriptionStatus.GRACE_PERIOD, graceCutoff);

        for (Subscription sub : graceExpired) {
            sub.setStatus(Subscription.SubscriptionStatus.EXPIRED);
            subscriptionRepo.save(sub);

            User artisan = sub.getArtisan();
            if (artisan != null) {
                artisan.setVettingLevel(User.VettingLevel.STANDARD);
                userRepository.save(artisan);

                if (artisan.getPhoneNumber() != null) {
                    smsService.send(artisan.getPhoneNumber(),
                        "FUDARI: Your subscription has ended and your listing ranking has been reduced. " +
                        "Renew anytime: fudari.co/dashboard/subscription"
                    );
                }

                log.info("[RENEWAL] Subscription fully expired for artisan {} (plan={})",
                        artisan.getId(), sub.getPlanType());
            }
        }
    }
}
