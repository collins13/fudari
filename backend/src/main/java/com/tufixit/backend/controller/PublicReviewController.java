package com.tufixit.backend.controller;

import com.tufixit.backend.dto.PublicReviewDTO;
import com.tufixit.backend.service.PublicReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reviews/public")
@RequiredArgsConstructor
public class PublicReviewController {

    private final PublicReviewService publicReviewService;

    @PostMapping
    public ResponseEntity<PublicReviewDTO.PublicReviewResponse> createReview(
            @Valid @RequestBody PublicReviewDTO.CreatePublicReviewRequest request) {
        return ResponseEntity.ok(publicReviewService.createReview(request));
    }

    @GetMapping("/artisan/{artisanId}")
    public ResponseEntity<List<PublicReviewDTO.PublicReviewResponse>> getReviewsForArtisan(
            @PathVariable Long artisanId) {
        return ResponseEntity.ok(publicReviewService.getReviewsForArtisan(artisanId));
    }

    @GetMapping("/artisan/{artisanId}/summary")
    public ResponseEntity<Map<String, Object>> getArtisanRatingSummary(
            @PathVariable Long artisanId) {
        return ResponseEntity.ok(publicReviewService.getArtisanRatingSummary(artisanId));
    }
}
