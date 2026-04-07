package com.tufixit.backend.controller;

import com.tufixit.backend.dto.AiDTO;
import com.tufixit.backend.service.AiService;
import com.tufixit.backend.service.ArtisanMatchService;
import com.tufixit.backend.service.PriceEstimateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * AiController — all AI-powered endpoints.
 * All endpoints are public (no JWT required) so the booking form
 * and chat page can call them without authentication.
 *
 * POST /api/ai/enhance-description  — Feature 1: Smart Job Description
 * GET  /api/ai/estimate-price        — Feature 2: Price Estimator
 * POST /api/ai/chat-assistant        — Feature 3: AI Chat Holding Message
 * GET  /api/ai/match-artisans        — Feature 4: Artisan Match Scoring
 */
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;
    private final PriceEstimateService priceEstimateService;
    private final ArtisanMatchService artisanMatchService;

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
}
