package com.tufixit.backend.service;

import com.tufixit.backend.dto.SubscriptionDTO;
import com.tufixit.backend.entity.Subscription;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.repository.SubscriptionRepository;
import com.tufixit.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final MpesaDarajaService mpesaService;

    @Transactional
    public SubscriptionDTO.SubscriptionResponse createSubscription(SubscriptionDTO.CreateSubscriptionRequest request) {
        User artisan = getCurrentUser();

        if (artisan.getRole() != User.UserRole.WORKER) {
            throw new RuntimeException("Only workers can subscribe");
        }

        // FREE plan — no payment required, activate immediately
        if (request.getPlanType() == Subscription.PlanType.FREE) {
            return activateSubscription(artisan, Subscription.PlanType.FREE,
                    Subscription.BillingCycle.MONTHLY, null);
        }

        // Paid plans — require an M-Pesa transaction ID.
        if (request.getMpesaTransactionId() == null || request.getMpesaTransactionId().isBlank()) {
            throw new IllegalArgumentException(
                "M-Pesa payment is required to activate a paid subscription. " +
                "Please complete the payment and provide your transaction ID.");
        }

        Subscription.BillingCycle cycle = request.getBillingCycle() != null
                ? request.getBillingCycle()
                : Subscription.BillingCycle.MONTHLY;

        log.info("[SUBSCRIPTION] Activating {} ({}) for artisan {} with M-Pesa ref {}",
                request.getPlanType(), cycle, artisan.getId(), request.getMpesaTransactionId());

        return activateSubscription(artisan, request.getPlanType(), cycle, request.getMpesaTransactionId());
    }

    /**
     * Initiates an M-Pesa STK Push for subscription payment.
     * Returns the checkoutRequestId so the frontend can poll for confirmation.
     */
    public SubscriptionDTO.StkInitiateResponse initiateSubscriptionPayment(
            SubscriptionDTO.InitiatePaymentRequest request) {
        User artisan = getCurrentUser();

        if (artisan.getRole() != User.UserRole.WORKER) {
            throw new RuntimeException("Only workers can subscribe");
        }
        if (request.getPlanType() == Subscription.PlanType.FREE) {
            throw new IllegalArgumentException("FREE plan does not require payment");
        }

        Subscription.BillingCycle cycle = request.getBillingCycle() != null
                ? request.getBillingCycle()
                : Subscription.BillingCycle.MONTHLY;

        // Calculate price
        int price = switch (request.getPlanType()) {
            case BASIC -> switch (cycle) {
                case DAILY   -> Subscription.BASIC_DAILY_PRICE;
                case WEEKLY  -> Subscription.BASIC_WEEKLY_PRICE;
                case MONTHLY -> Subscription.BASIC_MONTHLY_PRICE;
            };
            case PRO -> switch (cycle) {
                case DAILY   -> Subscription.PRO_DAILY_PRICE;
                case WEEKLY  -> Subscription.PRO_WEEKLY_PRICE;
                case MONTHLY -> Subscription.PRO_MONTHLY_PRICE;
            };
            case FREE -> 0;
        };

        String accountRef = "FUDARI-" + request.getPlanType().name();
        String phone = request.getPhoneNumber() != null ? request.getPhoneNumber() : artisan.getPhoneNumber();

        try {
            MpesaDarajaService.StkPushResult result = mpesaService.initiateSTKPush(
                    phone, price, accountRef,
                    "Fudari " + request.getPlanType() + " subscription (" + cycle + ")");

            return SubscriptionDTO.StkInitiateResponse.builder()
                    .checkoutRequestId(result.checkoutRequestId())
                    .merchantRequestId(result.merchantRequestId())
                    .amount(price)
                    .phoneNumber(phone)
                    .build();
        } catch (Exception e) {
            log.error("[SUBSCRIPTION] STK Push failed for artisan {}", artisan.getId(), e);
            throw new RuntimeException("M-Pesa payment initiation failed: " + e.getMessage());
        }
    }

    /**
     * Verifies a subscription payment via Daraja STK query.
     * Called by frontend after STK Push prompt is acknowledged by user.
     */
    @Transactional
    public SubscriptionDTO.SubscriptionResponse verifyAndActivate(
            SubscriptionDTO.VerifyPaymentRequest request) {
        User artisan = getCurrentUser();

        try {
            MpesaDarajaService.StkQueryResult queryResult =
                    mpesaService.queryStkPush(request.getCheckoutRequestId());

            if (!"0".equals(queryResult.resultCode())) {
                throw new RuntimeException("Payment not completed: " + queryResult.resultDesc());
            }

            Subscription.BillingCycle cycle = request.getBillingCycle() != null
                    ? request.getBillingCycle()
                    : Subscription.BillingCycle.MONTHLY;

            log.info("[SUBSCRIPTION] Payment verified for artisan {} — activating {} ({})",
                    artisan.getId(), request.getPlanType(), cycle);

            return activateSubscription(artisan, request.getPlanType(), cycle, request.getCheckoutRequestId());
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("[SUBSCRIPTION] Payment verification failed for artisan {}", artisan.getId(), e);
            throw new RuntimeException("Payment verification failed: " + e.getMessage());
        }
    }

    private SubscriptionDTO.SubscriptionResponse activateSubscription(
            User artisan, Subscription.PlanType planType,
            Subscription.BillingCycle billingCycle, String mpesaRef) {

        // Cancel any existing active subscription
        subscriptionRepository.findByArtisanIdAndStatus(artisan.getId(), Subscription.SubscriptionStatus.ACTIVE)
                .ifPresent(existing -> {
                    existing.setStatus(Subscription.SubscriptionStatus.CANCELLED);
                    subscriptionRepository.save(existing);
                });
        // Also cancel any grace-period subscription (edge case: artisan re-subscribes during grace)
        subscriptionRepository.findByArtisanIdAndStatus(artisan.getId(), Subscription.SubscriptionStatus.GRACE_PERIOD)
                .ifPresent(existing -> {
                    existing.setStatus(Subscription.SubscriptionStatus.CANCELLED);
                    subscriptionRepository.save(existing);
                });

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime endDate;
        if (planType == Subscription.PlanType.FREE) {
            endDate = now.plusYears(10);
        } else {
            endDate = switch (billingCycle) {
                case DAILY   -> now.plusDays(1);
                case WEEKLY  -> now.plusWeeks(1);
                case MONTHLY -> now.plusMonths(1);
            };
        }

        Subscription subscription = Subscription.builder()
                .artisan(artisan)
                .planType(planType)
                .billingCycle(billingCycle)
                .startDate(now)
                .endDate(endDate)
                .status(Subscription.SubscriptionStatus.ACTIVE)
                .autoRenew(false)
                .mpesaTransactionId(mpesaRef)
                .build();

        subscription = subscriptionRepository.save(subscription);

        // Update user vetting level based on plan
        switch (planType) {
            case PRO -> artisan.setVettingLevel(User.VettingLevel.PRO);
            case BASIC -> artisan.setVettingLevel(User.VettingLevel.VERIFIED);
            case FREE -> artisan.setVettingLevel(User.VettingLevel.STANDARD);
        }
        userRepository.save(artisan);

        return mapToResponse(subscription);
    }

    public SubscriptionDTO.SubscriptionResponse getCurrentSubscription() {
        User artisan = getCurrentUser();
        return subscriptionRepository.findByArtisanIdAndStatus(artisan.getId(), Subscription.SubscriptionStatus.ACTIVE)
                .map(this::mapToResponse)
                .orElseGet(() -> {
                    // Return a default FREE subscription
                    return SubscriptionDTO.SubscriptionResponse.builder()
                            .artisanId(artisan.getId())
                            .planType("FREE")
                            .status("ACTIVE")
                            .maxListings(1)
                            .featured(false)
                            .rankingPriority(1)
                            .build();
                });
    }

    public List<SubscriptionDTO.SubscriptionResponse> getSubscriptionHistory() {
        User artisan = getCurrentUser();
        return subscriptionRepository.findByArtisanIdOrderByCreatedAtDesc(artisan.getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public SubscriptionDTO.SubscriptionResponse getSubscriptionByArtisanId(Long artisanId) {
        return subscriptionRepository.findByArtisanIdAndStatus(artisanId, Subscription.SubscriptionStatus.ACTIVE)
                .map(this::mapToResponse)
                .orElseGet(() -> SubscriptionDTO.SubscriptionResponse.builder()
                        .artisanId(artisanId)
                        .planType("FREE")
                        .status("ACTIVE")
                        .maxListings(1)
                        .featured(false)
                        .rankingPriority(1)
                        .build());
    }

    public List<SubscriptionDTO.PlanInfo> getAvailablePlans() {
        return Arrays.asList(
                SubscriptionDTO.PlanInfo.builder()
                        .name("FREE")
                        .monthlyPrice(0)
                        .weeklyPrice(0)
                        .dailyPrice(0)
                        .maxListings(1)
                        .featured(false)
                        .rankingPriority(1)
                        .features(new String[]{"1 active listing", "Basic search visibility", "Phone & WhatsApp contact"})
                        .build(),
                SubscriptionDTO.PlanInfo.builder()
                        .name("BASIC")
                        .monthlyPrice(Subscription.BASIC_MONTHLY_PRICE)
                        .weeklyPrice(Subscription.BASIC_WEEKLY_PRICE)
                        .dailyPrice(Subscription.BASIC_DAILY_PRICE)
                        .maxListings(3)
                        .featured(false)
                        .rankingPriority(2)
                        .features(new String[]{"3 active listings", "Higher search visibility", "Portfolio upload", "Priority in category"})
                        .build(),
                SubscriptionDTO.PlanInfo.builder()
                        .name("PRO")
                        .monthlyPrice(Subscription.PRO_MONTHLY_PRICE)
                        .weeklyPrice(Subscription.PRO_WEEKLY_PRICE)
                        .dailyPrice(Subscription.PRO_DAILY_PRICE)
                        .maxListings(999)
                        .featured(true)
                        .rankingPriority(3)
                        .features(new String[]{"Unlimited listings", "Featured badge", "Top search ranking", "Analytics dashboard", "Priority support"})
                        .build()
        );
    }

    @Transactional
    public SubscriptionDTO.SubscriptionResponse cancelSubscription() {
        User artisan = getCurrentUser();
        Subscription subscription = subscriptionRepository.findByArtisanIdAndStatus(artisan.getId(), Subscription.SubscriptionStatus.ACTIVE)
                .orElseThrow(() -> new RuntimeException("No active subscription found"));

        subscription.setStatus(Subscription.SubscriptionStatus.CANCELLED);
        subscription = subscriptionRepository.save(subscription);

        artisan.setVettingLevel(User.VettingLevel.STANDARD);
        userRepository.save(artisan);

        return mapToResponse(subscription);
    }

    public boolean canCreateListing(Long artisanId) {
        SubscriptionDTO.SubscriptionResponse sub = getSubscriptionByArtisanId(artisanId);
        // This would need to be combined with a count of current listings
        return true; // Listing count check handled at listing creation
    }

    private SubscriptionDTO.SubscriptionResponse mapToResponse(Subscription sub) {
        return SubscriptionDTO.SubscriptionResponse.builder()
                .id(sub.getId())
                .artisanId(sub.getArtisan().getId())
                .planType(sub.getPlanType().name())
                .billingCycle(sub.getBillingCycle() != null ? sub.getBillingCycle().name() : "MONTHLY")
                .priceKes(sub.getPriceKes())
                .startDate(sub.getStartDate())
                .endDate(sub.getEndDate())
                .status(sub.getStatus().name())
                .autoRenew(sub.getAutoRenew())
                .maxListings(sub.getMaxListings())
                .featured(sub.isFeatured())
                .rankingPriority(sub.getRankingPriority())
                .createdAt(sub.getCreatedAt())
                .build();
    }

    private User getCurrentUser() {
        String emailOrPhone = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(emailOrPhone)
                .or(() -> userRepository.findByPhoneNumber(emailOrPhone))
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
