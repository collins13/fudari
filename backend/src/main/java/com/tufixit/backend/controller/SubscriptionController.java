package com.tufixit.backend.controller;

import com.tufixit.backend.dto.SubscriptionDTO;
import com.tufixit.backend.service.SubscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    @PostMapping
    public ResponseEntity<SubscriptionDTO.SubscriptionResponse> createSubscription(
            @Valid @RequestBody SubscriptionDTO.CreateSubscriptionRequest request) {
        return ResponseEntity.ok(subscriptionService.createSubscription(request));
    }

    @GetMapping("/current")
    public ResponseEntity<SubscriptionDTO.SubscriptionResponse> getCurrentSubscription() {
        return ResponseEntity.ok(subscriptionService.getCurrentSubscription());
    }

    @GetMapping("/history")
    public ResponseEntity<List<SubscriptionDTO.SubscriptionResponse>> getSubscriptionHistory() {
        return ResponseEntity.ok(subscriptionService.getSubscriptionHistory());
    }

    @GetMapping("/artisan/{artisanId}")
    public ResponseEntity<SubscriptionDTO.SubscriptionResponse> getSubscriptionByArtisanId(
            @PathVariable Long artisanId) {
        return ResponseEntity.ok(subscriptionService.getSubscriptionByArtisanId(artisanId));
    }

    @GetMapping("/plans")
    public ResponseEntity<List<SubscriptionDTO.PlanInfo>> getAvailablePlans() {
        return ResponseEntity.ok(subscriptionService.getAvailablePlans());
    }

    @PostMapping("/cancel")
    public ResponseEntity<SubscriptionDTO.SubscriptionResponse> cancelSubscription() {
        return ResponseEntity.ok(subscriptionService.cancelSubscription());
    }
}
