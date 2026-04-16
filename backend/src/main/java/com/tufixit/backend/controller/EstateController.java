package com.tufixit.backend.controller;

import com.tufixit.backend.dto.EstateDTO;
import com.tufixit.backend.service.EstateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Estate management endpoints — B2B distribution channel for TuFixIt.
 *
 * Public endpoints:
 *   GET /api/estates/{slug}          — Resolve an estate by slug (used by branded booking link)
 *
 * Admin endpoints:
 *   POST   /api/estates              — Create estate
 *   PUT    /api/estates/{id}         — Update estate details
 *   DELETE /api/estates/{id}         — Deactivate estate
 *   GET    /api/estates              — List all active estates
 *   GET    /api/estates/{id}/analytics — Estate booking analytics
 *
 * Artisan approval endpoints:
 *   POST   /api/estates/{id}/artisans          — Approve artisan for estate
 *   GET    /api/estates/{id}/artisans          — List approved artisans
 *   DELETE /api/estates/{id}/artisans/{artisanId} — Remove approval
 */
@RestController
@RequestMapping("/api/estates")
@RequiredArgsConstructor
public class EstateController {

    private final EstateService estateService;

    // ── Public ───────────────────────────────────────────────────────────────

    /**
     * Resolve estate by slug — called when a customer hits the branded booking link.
     * Returns estate info so the frontend can pre-fill location and tag the booking.
     */
    @GetMapping("/resolve/{slug}")
    public ResponseEntity<EstateDTO.EstateResponse> resolveBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(estateService.getEstateBySlug(slug));
    }

    // ── Admin: Estate CRUD ───────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<EstateDTO.EstateResponse> createEstate(
            @Valid @RequestBody EstateDTO.CreateEstateRequest request) {
        return ResponseEntity.ok(estateService.createEstate(request));
    }

    @GetMapping
    public ResponseEntity<List<EstateDTO.EstateResponse>> listEstates() {
        return ResponseEntity.ok(estateService.listActiveEstates());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EstateDTO.EstateResponse> getEstate(@PathVariable Long id) {
        return ResponseEntity.ok(estateService.getEstateById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EstateDTO.EstateResponse> updateEstate(
            @PathVariable Long id,
            @Valid @RequestBody EstateDTO.CreateEstateRequest request) {
        return ResponseEntity.ok(estateService.updateEstate(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateEstate(@PathVariable Long id) {
        estateService.deactivateEstate(id);
        return ResponseEntity.noContent().build();
    }

    // ── Admin: Estate Analytics ──────────────────────────────────────────────

    @GetMapping("/{id}/analytics")
    public ResponseEntity<EstateDTO.EstateAnalytics> getAnalytics(@PathVariable Long id) {
        return ResponseEntity.ok(estateService.getEstateAnalytics(id));
    }

    // ── Artisan Approvals ────────────────────────────────────────────────────

    @PostMapping("/{id}/artisans")
    public ResponseEntity<EstateDTO.ApprovedArtisanResponse> approveArtisan(
            @PathVariable Long id,
            @Valid @RequestBody EstateDTO.ApproveArtisanRequest request) {
        return ResponseEntity.ok(estateService.approveArtisan(id, request));
    }

    @GetMapping("/{id}/artisans")
    public ResponseEntity<List<EstateDTO.ApprovedArtisanResponse>> listApprovedArtisans(
            @PathVariable Long id) {
        return ResponseEntity.ok(estateService.listApprovedArtisans(id));
    }

    @DeleteMapping("/{id}/artisans/{artisanId}")
    public ResponseEntity<Void> removeArtisanApproval(
            @PathVariable Long id,
            @PathVariable Long artisanId) {
        estateService.removeArtisanApproval(id, artisanId);
        return ResponseEntity.noContent().build();
    }
}
