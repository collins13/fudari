package com.tufixit.backend.controller;

import com.tufixit.backend.dto.AiDTO;
import com.tufixit.backend.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * AiController — all AI-powered endpoints.
 * All endpoints are public (no JWT required) so the booking form
 * and chat page can call them without authentication.
 *
 * POST /api/ai/enhance-description   — Feature 1: Smart Job Description
 * GET  /api/ai/estimate-price         — Feature 2: Price Estimator (legacy)
 * POST /api/ai/chat-assistant         — Feature 3: AI Chat Holding Message
 * GET  /api/ai/match-artisans         — Feature 4: Artisan Match Scoring
 * GET  /api/ai/smart-price            — Feature 5: Smart Pricing Engine (upgraded)
 * POST /api/ai/job-scoping            — Feature 6: Job Scoping Chatbot
 * GET  /api/ai/predictive-match       — Feature 7: Predictive Match (upgraded)
 * GET  /api/ai/trust-score/{id}       — Feature 8: Trust Score AI
 * POST /api/ai/quality-verify         — Feature 9: Quality Verification
 * GET  /api/ai/demand-forecast        — Feature 10: Demand Forecasting
 */
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;
    private final PriceEstimateService priceEstimateService;
    private final ArtisanMatchService artisanMatchService;
    private final SmartPricingService smartPricingService;
    private final JobScopingService jobScopingService;
    private final TrustScoreService trustScoreService;
    private final QualityVerificationService qualityVerificationService;
    private final DemandForecastService demandForecastService;

    /**
     * Feature 1 — Smart Job Description Assistant
     * POST /api/ai/enhance-description
     * Body: { "description": "my sink is broken", "location": "Westlands" }
     */
    @PostMapping("/enhance-description")
    public ResponseEntity<AiDTO.EnhanceDescriptionResponse> enhanceDescription(
            @Valid @RequestBody AiDTO.EnhanceDescriptionRequest request) {
        return ResponseEntity.ok(
                aiService.enhanceDescription(request.getDescription(), request.getLocation()));
    }

    /**
     * Feature 2 — Instant Price Estimator
     * GET /api/ai/estimate-price?skillType=PLUMBER&location=Westlands
     */
    @GetMapping("/estimate-price")
    public ResponseEntity<AiDTO.PriceEstimateResponse> estimatePrice(
            @RequestParam String skillType,
            @RequestParam(required = false) String location) {
        return ResponseEntity.ok(priceEstimateService.estimate(skillType, location));
    }

    /**
     * Feature 3 — AI Chat Assistant (artisan idle fallback)
     * POST /api/ai/chat-assistant
     * Body: { "artisanFirstName": "James", "artisanSkill": "PLUMBER",
     *         "conversationHistory": "...", "customerLastMessage": "..." }
     */
    @PostMapping("/chat-assistant")
    public ResponseEntity<AiDTO.ChatAssistantResponse> chatAssistant(
            @Valid @RequestBody AiDTO.ChatAssistantRequest request) {
        return ResponseEntity.ok(
                aiService.generateChatHoldingMessage(
                        request.getArtisanFirstName(),
                        request.getArtisanSkill(),
                        request.getConversationHistory(),
                        request.getCustomerLastMessage()));
    }

    /**
     * Feature 4 — Artisan Match Scoring
     * GET /api/ai/match-artisans?skillType=PLUMBER&latitude=-1.286&longitude=36.817
     */
    @GetMapping("/match-artisans")
    public ResponseEntity<List<AiDTO.MatchedArtisan>> matchArtisans(
            @RequestParam String skillType,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude) {
        return ResponseEntity.ok(
                artisanMatchService.findTopMatches(skillType, latitude, longitude));
    }

    // ══════════════════════════════════════════════════════════════════════════
    // NEW AI FEATURES
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Feature 5 — Smart Pricing Engine (upgraded)
     * GET /api/ai/smart-price?skillType=PLUMBER&location=Westlands&urgency=NOW&artisanRating=4.5
     *
     * Enhanced pricing with urgency surcharge, location premium,
     * artisan rating premium, and confidence scoring.
     */
    @GetMapping("/smart-price")
    public ResponseEntity<AiDTO.SmartPriceResponse> smartPrice(
            @RequestParam String skillType,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String urgency,
            @RequestParam(required = false) Double artisanRating) {
        return ResponseEntity.ok(
                smartPricingService.estimate(skillType, location, urgency, artisanRating));
    }

    /**
     * Feature 6 — Job Scoping Chatbot
     * POST /api/ai/job-scoping
     * Body: { "message": "my toilet is leaking", "sessionId": "abc123", "history": [...] }
     *
     * Conversational AI that asks follow-up questions and builds
     * a complete job specification through 2-3 message exchanges.
     */
    @PostMapping("/job-scoping")
    public ResponseEntity<AiDTO.JobScopingResponse> jobScoping(
            @Valid @RequestBody AiDTO.JobScopingRequest request) {
        return ResponseEntity.ok(jobScopingService.processMessage(request));
    }

    /**
     * Feature 7 — Predictive Match (upgraded)
     * GET /api/ai/predictive-match?skillType=PLUMBER&latitude=-1.286&longitude=36.817
     *
     * Returns three ranked lists: Best Match, Fastest Available, Best Value.
     */
    @GetMapping("/predictive-match")
    public ResponseEntity<AiDTO.PredictiveMatchResponse> predictiveMatch(
            @RequestParam String skillType,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude) {
        return ResponseEntity.ok(
                artisanMatchService.findPredictiveMatches(skillType, latitude, longitude));
    }

    /**
     * Feature 8 — Trust Score AI
     * GET /api/ai/trust-score/{artisanId}
     *
     * Comprehensive trust score with breakdown, tier, badges,
     * and NLP-based review sentiment analysis.
     */
    @GetMapping("/trust-score/{artisanId}")
    public ResponseEntity<AiDTO.TrustScoreResponse> trustScore(
            @PathVariable Long artisanId) {
        return ResponseEntity.ok(trustScoreService.computeTrustScore(artisanId));
    }

    /**
     * Feature 9 — Quality Verification
     * POST /api/ai/quality-verify
     * Body: { "jobId": 123 }
     *
     * Compares before/after images to verify job quality.
     * Uses AI Vision when available, heuristic checks as fallback.
     */
    @PostMapping("/quality-verify")
    public ResponseEntity<AiDTO.QualityVerifyResponse> qualityVerify(
            @RequestBody AiDTO.QualityVerifyRequest request) {
        return ResponseEntity.ok(
                qualityVerificationService.verifyJobQuality(request.getJobId()));
    }

    /**
     * Feature 10 — Demand Forecasting
     * GET /api/ai/demand-forecast?skillType=PLUMBER&location=Westlands
     *
     * Market intelligence for artisans: demand trends, supply/demand ratio,
     * seasonal patterns, location hotspots, and pricing advice.
     */
    @GetMapping("/demand-forecast")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AiDTO.DemandForecastResponse> demandForecast(
            @RequestParam String skillType,
            @RequestParam(required = false) String location) {
        return ResponseEntity.ok(demandForecastService.forecast(skillType, location));
    }
}
