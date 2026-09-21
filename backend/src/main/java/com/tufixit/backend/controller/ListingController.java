package com.tufixit.backend.controller;

import com.tufixit.backend.dto.ListingDTO;
import com.tufixit.backend.service.ListingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/listings")
@RequiredArgsConstructor
public class ListingController {

    private final ListingService listingService;

    /** Public - browse approved listings */
    @GetMapping
    public ResponseEntity<Page<ListingDTO.ListingResponse>> getListings(
            @RequestParam(required = false) String skillType,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String location,
            @PageableDefault(size = 20) Pageable pageable) {

        if (skillType != null || categoryId != null || location != null) {
            return ResponseEntity.ok(listingService.searchListings(skillType, categoryId, location, pageable));
        }
        return ResponseEntity.ok(listingService.getApprovedListings(pageable));
    }

    /** Public - view single listing */
    @GetMapping("/{id}")
    public ResponseEntity<ListingDTO.ListingResponse> getListing(@PathVariable Long id) {
        return ResponseEntity.ok(listingService.getListingById(id));
    }

    /** Authenticated artisan - create listing */
    @PostMapping
    public ResponseEntity<ListingDTO.ListingResponse> createListing(
            @Valid @RequestBody ListingDTO.CreateListingRequest request) {
        return ResponseEntity.ok(listingService.createListing(request));
    }

    /** Authenticated artisan/admin - update listing */
    @PutMapping("/{id}")
    public ResponseEntity<ListingDTO.ListingResponse> updateListing(
            @PathVariable Long id,
            @Valid @RequestBody ListingDTO.UpdateListingRequest request) {
        return ResponseEntity.ok(listingService.updateListing(id, request));
    }

    /** Authenticated artisan/admin - delete listing */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteListing(@PathVariable Long id) {
        listingService.deleteListing(id);
        return ResponseEntity.ok().build();
    }

    /** Authenticated artisan - my listings */
    @GetMapping("/my")
    public ResponseEntity<Page<ListingDTO.ListingResponse>> getMyListings(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(listingService.getMyListings(pageable));
    }

    /** Track listing view (public) */
    @PostMapping("/{id}/view")
    public ResponseEntity<Void> trackView(@PathVariable Long id) {
        listingService.incrementViewCount(id);
        return ResponseEntity.ok().build();
    }
}
