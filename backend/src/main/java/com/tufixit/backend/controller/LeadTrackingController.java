package com.tufixit.backend.controller;

import com.tufixit.backend.service.LeadTrackingService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/leads")
@RequiredArgsConstructor
public class LeadTrackingController {

    private final LeadTrackingService leadTrackingService;

    @PostMapping("/view/{artisanId}")
    public ResponseEntity<Void> trackProfileView(
            @PathVariable Long artisanId,
            HttpServletRequest request) {
        leadTrackingService.trackProfileView(artisanId, request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/call/{artisanId}")
    public ResponseEntity<Void> trackCallClick(
            @PathVariable Long artisanId,
            HttpServletRequest request) {
        leadTrackingService.trackCallClick(artisanId, request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/whatsapp/{artisanId}")
    public ResponseEntity<Void> trackWhatsAppClick(
            @PathVariable Long artisanId,
            HttpServletRequest request) {
        leadTrackingService.trackWhatsAppClick(artisanId, request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getLeadStats() {
        return ResponseEntity.ok(leadTrackingService.getLeadStats());
    }

    @GetMapping("/stats/{artisanId}")
    public ResponseEntity<Map<String, Long>> getLeadStatsForArtisan(@PathVariable Long artisanId) {
        return ResponseEntity.ok(leadTrackingService.getLeadStatsForArtisan(artisanId));
    }
}
