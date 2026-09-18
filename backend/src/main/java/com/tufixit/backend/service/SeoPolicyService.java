package com.tufixit.backend.service;

import lombok.Builder;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Single source of truth for whether a generated page may be indexed.
 *
 * Indexation must never be an accident of frontend behaviour: every SEO surface
 * asks this service and renders the answer. Thresholds are configurable so the
 * quality bar can be raised as supply grows.
 */
@Service
@Slf4j
public class SeoPolicyService {

    /** Providers needed before a page is indexable on count alone. */
    @Value("${seo.min-providers-for-index:3}")
    private int minProvidersForIndex;

    /**
     * A single provider can carry a page, but only if that profile is complete
     * enough to be worth a click.
     */
    @Value("${seo.min-profile-completeness:0.6}")
    private double minProfileCompleteness;

    public enum SeoState {
        INDEXABLE,
        NOINDEX,
        CANONICAL_TO_OTHER_PAGE,
        NOT_PUBLISHED
    }

    @Data
    @Builder
    public static class SeoDecision {
        private SeoState state;
        private String canonicalUrl;
        /** Why the decision was made — surfaced in the admin SEO report. */
        private String reason;

        public boolean isIndexable() {
            return state == SeoState.INDEXABLE;
        }
    }

    /**
     * @param providerCount     active providers on the page
     * @param bestCompleteness  completeness (0-1) of the strongest profile
     * @param adminIndexable    admin kill-switch on the skill/location row
     * @param published         the underlying entities are active
     */
    public SeoDecision decide(String canonicalUrl,
                              int providerCount,
                              double bestCompleteness,
                              boolean adminIndexable,
                              boolean published) {
        if (!published) {
            return decision(SeoState.NOT_PUBLISHED, canonicalUrl, "Entity is inactive or unpublished");
        }
        if (!adminIndexable) {
            return decision(SeoState.NOINDEX, canonicalUrl, "Admin marked this page noindex");
        }
        if (providerCount >= minProvidersForIndex) {
            return decision(SeoState.INDEXABLE, canonicalUrl, providerCount + " providers");
        }
        if (providerCount >= 1 && bestCompleteness >= minProfileCompleteness) {
            return decision(SeoState.INDEXABLE, canonicalUrl,
                    "Single provider with a complete profile (" + Math.round(bestCompleteness * 100) + "%)");
        }
        if (providerCount >= 1) {
            return decision(SeoState.NOINDEX, canonicalUrl,
                    "Below " + minProvidersForIndex + " providers and profile is incomplete");
        }
        return decision(SeoState.NOINDEX, canonicalUrl, "No providers");
    }

    /** A synonym or alternate-language URL that must fold into the main page. */
    public SeoDecision canonicalTo(String targetUrl, String reason) {
        return decision(SeoState.CANONICAL_TO_OTHER_PAGE, targetUrl, reason);
    }

    public int getMinProvidersForIndex() {
        return minProvidersForIndex;
    }

    private static SeoDecision decision(SeoState state, String canonicalUrl, String reason) {
        return SeoDecision.builder().state(state).canonicalUrl(canonicalUrl).reason(reason).build();
    }
}
