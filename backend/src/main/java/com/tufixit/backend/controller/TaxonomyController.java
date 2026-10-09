package com.tufixit.backend.controller;

import com.tufixit.backend.dto.TaxonomyDTO;
import com.tufixit.backend.service.TaxonomyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Read-only taxonomy feed for the SEO landing pages. Public by design. */
@RestController
@RequestMapping("/api/taxonomy")
@RequiredArgsConstructor
public class TaxonomyController {

    private final TaxonomyService taxonomyService;

    @GetMapping("/skills")
    public ResponseEntity<List<TaxonomyDTO.SkillResponse>> skills() {
        return ResponseEntity.ok(taxonomyService.getActiveSkills());
    }

    @GetMapping("/skills/{slug}")
    public ResponseEntity<TaxonomyDTO.SkillResponse> skill(@PathVariable String slug) {
        return taxonomyService.getSkillBySlug(slug)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Returns the canonical slug for a synonym or Swahili phrase, if one exists. */
    @GetMapping("/skills/resolve/{candidate}")
    public ResponseEntity<Map<String, String>> resolveSkill(@PathVariable String candidate) {
        return taxonomyService.canonicalSkillSlug(candidate)
                .map(slug -> ResponseEntity.ok(Map.of("slug", slug)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/counties")
    public ResponseEntity<List<TaxonomyDTO.LocationResponse>> counties() {
        return ResponseEntity.ok(taxonomyService.getCounties());
    }

    @GetMapping("/locations")
    public ResponseEntity<List<TaxonomyDTO.LocationResponse>> locations() {
        return ResponseEntity.ok(taxonomyService.getActiveCountiesAndTowns());
    }

    @GetMapping("/locations/{slug}")
    public ResponseEntity<TaxonomyDTO.LocationResponse> location(@PathVariable String slug) {
        return taxonomyService.getLocationBySlug(slug)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/locations/{parentSlug}/areas/{areaSlug}")
    public ResponseEntity<TaxonomyDTO.LocationResponse> area(@PathVariable String parentSlug,
                                                             @PathVariable String areaSlug) {
        return taxonomyService.getAreaBySlug(parentSlug, areaSlug)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/locations/{slug}/children")
    public ResponseEntity<List<TaxonomyDTO.LocationResponse>> children(@PathVariable String slug) {
        return ResponseEntity.ok(taxonomyService.getChildren(slug));
    }

    /** Every skill x location pair with supply. Feeds the sitemap and link blocks. */
    @GetMapping("/skill-locations")
    public ResponseEntity<List<TaxonomyDTO.SkillLocationCount>> skillLocations() {
        return ResponseEntity.ok(taxonomyService.skillLocationCounts());
    }
}
