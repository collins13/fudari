package com.tufixit.backend;

import com.tufixit.backend.service.SeoPolicyService;
import com.tufixit.backend.service.SeoPolicyService.SeoState;
import com.tufixit.backend.util.LocationNormalizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Indexation rules and location folding. No Spring context, no database — these
 * are the two pieces of pure logic that decide what Google sees.
 */
class SeoIndexationTest {

    private SeoPolicyService policy;

    private static final String URL = "https://fudari.co/artisans/plumbers/nairobi";

    @BeforeEach
    void setUp() {
        policy = new SeoPolicyService();
        ReflectionTestUtils.setField(policy, "minProvidersForIndex", 3);
        ReflectionTestUtils.setField(policy, "minProfileCompleteness", 0.6);
    }

    // ── Indexation thresholds ────────────────────────────────────────────────

    @Test
    @DisplayName("Zero providers is never indexable")
    void zeroProvidersNoindex() {
        var decision = policy.decide(URL, 0, 0.0, true, true);
        assertEquals(SeoState.NOINDEX, decision.getState());
        assertFalse(decision.isIndexable());
        assertEquals("No providers", decision.getReason());
    }

    @Test
    @DisplayName("One provider with a thin profile stays noindex")
    void singleThinProviderNoindex() {
        var decision = policy.decide(URL, 1, 0.3, true, true);
        assertEquals(SeoState.NOINDEX, decision.getState());
    }

    @Test
    @DisplayName("One provider with a complete profile is indexable")
    void singleCompleteProviderIndexable() {
        var decision = policy.decide(URL, 1, 0.8, true, true);
        assertEquals(SeoState.INDEXABLE, decision.getState());
        assertTrue(decision.getReason().contains("Single provider"));
    }

    @Test
    @DisplayName("Provider count at the threshold is indexable regardless of completeness")
    void thresholdProvidersIndexable() {
        var decision = policy.decide(URL, 3, 0.0, true, true);
        assertEquals(SeoState.INDEXABLE, decision.getState());
    }

    @Test
    @DisplayName("Many providers is indexable")
    void manyProvidersIndexable() {
        assertTrue(policy.decide(URL, 42, 0.0, true, true).isIndexable());
    }

    @Test
    @DisplayName("Admin noindex overrides a healthy provider count")
    void adminNoindexWins() {
        var decision = policy.decide(URL, 50, 1.0, false, true);
        assertEquals(SeoState.NOINDEX, decision.getState());
    }

    @Test
    @DisplayName("Unpublished entities report NOT_PUBLISHED, not NOINDEX")
    void unpublishedIsDistinct() {
        var decision = policy.decide(URL, 50, 1.0, true, false);
        assertEquals(SeoState.NOT_PUBLISHED, decision.getState());
    }

    @Test
    @DisplayName("Synonym URLs canonicalise to the target page")
    void synonymCanonicalises() {
        var decision = policy.canonicalTo(URL, "Swahili synonym");
        assertEquals(SeoState.CANONICAL_TO_OTHER_PAGE, decision.getState());
        assertEquals(URL, decision.getCanonicalUrl());
        assertFalse(decision.isIndexable());
    }

    // ── Location folding ─────────────────────────────────────────────────────

    @Test
    @DisplayName("County is extracted from free text")
    void parsesCountyFromFreeText() {
        var parsed = LocationNormalizer.parse("Westlands, Nairobi");
        assertEquals("Nairobi", parsed.county());
        assertEquals("Westlands", parsed.area());
    }

    @Test
    @DisplayName("County name embedded in a longer phrase still resolves")
    void parsesEmbeddedCounty() {
        var nairobiCbd = LocationNormalizer.parse("Nairobi CBD");
        assertEquals("Nairobi", nairobiCbd.county());
        assertEquals("Nairobi CBD", nairobiCbd.area());
        assertEquals("Mombasa", LocationNormalizer.parse("Nyali, Mombasa").county());
    }

    @Test
    @DisplayName("Multi-word counties beat shorter substring matches")
    void prefersLongestCountyMatch() {
        assertEquals("Trans Nzoia", LocationNormalizer.parse("Kitale, Trans Nzoia").county());
        assertEquals("Uasin Gishu", LocationNormalizer.parse("Eldoret, Uasin Gishu").county());
    }

    @Test
    @DisplayName("Word boundaries stop false positives")
    void respectsWordBoundaries() {
        assertNull(LocationNormalizer.parse("Merueshi").county());
    }

    @Test
    @DisplayName("Text with no county falls back to the leading place name")
    void fallsBackToLeadingPlace() {
        var parsed = LocationNormalizer.parse("Fedha Estate, Embakasi");
        assertNull(parsed.county());
        assertEquals("Fedha", parsed.area());
        assertEquals("Embakasi", parsed.town());
    }

    @Test
    @DisplayName("Blank and junk input yields no location rather than a bad one")
    void handlesJunkInput() {
        assertNull(LocationNormalizer.parse(null).county());
        assertNull(LocationNormalizer.parse("   ").town());
        assertNull(LocationNormalizer.parse("Kenya").town());
    }

    @Test
    @DisplayName("Slugs are URL-safe and strip diacritics and apostrophes")
    void slugifyIsUrlSafe() {
        assertEquals("muranga", LocationNormalizer.slugify("Murang'a"));
        assertEquals("trans-nzoia", LocationNormalizer.slugify("Trans Nzoia"));
        assertEquals("elgeyo-marakwet", LocationNormalizer.slugify("Elgeyo-Marakwet"));
        assertEquals("nairobi-cbd", LocationNormalizer.slugify("Nairobi CBD"));
        assertNull(LocationNormalizer.slugify("!!!"));
    }

    @Test
    @DisplayName("Canonical place prefers county, then town, then area")
    void canonicalPlacePrecedence() {
        assertEquals("Nairobi", LocationNormalizer.canonicalPlace("Nairobi", "Nairobi", "Westlands"));
        assertEquals("Thika", LocationNormalizer.canonicalPlace(null, "Thika", "Section 9"));
        assertEquals("Westlands", LocationNormalizer.canonicalPlace(null, null, "Westlands"));
        assertNull(LocationNormalizer.canonicalPlace(null, null, null));
    }
}
