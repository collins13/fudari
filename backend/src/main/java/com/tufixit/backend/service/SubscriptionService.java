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

    @Transactional
    public SubscriptionDTO.SubscriptionResponse createSubscription(SubscriptionDTO.CreateSubscriptionRequest request) {
        User artisan = getCurrentUser();

        if (artisan.getRole() != User.UserRole.WORKER) {
            throw new RuntimeException("Only workers can subscribe");
        }

        // FREE plan — no payment required, activate immediately
        if (request.getPlanType() == Subscription.PlanType.FREE) {
            return activateSubscription(artisan, Subscription.PlanType.FREE, null);
        }

        // Paid plans — require an M-Pesa transaction ID as confirmation.
        // The client is expected to have already completed the M-Pesa STK Push payment
        // and to supply the resulting transaction ID.
        if (request.getMpesaTransactionId() == null || request.getMpesaTransactionId().isBlank()) {
            throw new IllegalArgumentException(
                "M-Pesa payment is required to activate a paid subscription. " +
                "Please complete the payment and provide your transaction ID.");
        }

        // TODO: verify the transaction ID against the Daraja API when M-Pesa is fully integrated.
        // For now we record it and trust the client — this prevents completely free upgrades.
        log.info("[SUBSCRIPTION] Activating {} for artisan {} with M-Pesa ref {}",
                request.getPlanType(), artisan.getId(), request.getMpesaTransactionId());

        return activateSubscription(artisan, request.getPlanType(), request.getMpesaTransactionId());
    }

    private SubscriptionDTO.SubscriptionResponse activateSubscription(
            User artisan, Subscription.PlanType planType, String mpesaRef) {

        // Cancel any existing active subscription
        subscriptionRepository.findByArtisanIdAndStatus(artisan.getId(), Subscription.SubscriptionStatus.ACTIVE)
                .ifPresent(existing -> {
                    existing.setStatus(Subscription.SubscriptionStatus.CANCELLED);
                    subscriptionRepository.save(existing);
                });

        LocalDateTime now = LocalDateTime.now();
        Subscription subscription = Subscription.builder()
                .artisan(artisan)
                .planType(planType)
                .startDate(now)
                .endDate(planType == Subscription.PlanType.FREE ? now.plusYears(10) : now.plusMonths(1))
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
                        .price(0)
                        .maxListings(1)
                        .featured(false)
                        .rankingPriority(1)
                        .features(new String[]{"1 active listing", "Basic search visibility", "Phone & WhatsApp contact"})
                        .build(),
                SubscriptionDTO.PlanInfo.builder()
                        .name("BASIC")
                        .price(500)
                        .maxListings(3)
                        .featured(false)
                        .rankingPriority(2)
                        .features(new String[]{"3 active listings", "Higher search visibility", "Portfolio upload", "Priority in category"})
                        .build(),
                SubscriptionDTO.PlanInfo.builder()
                        .name("PRO")
                        .price(3000)
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
