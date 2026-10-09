# FUDARI SEO Audit and Growth Plan

Audit date: 2026-10-09

## Executive summary

FUDARI already has a strong programmatic SEO base: server-rendered metadata, canonical URL helpers, supply-aware indexability, service/location/provider landing pages, structured data, robots.txt, and segmented XML sitemaps. The best near-term gains are to deploy the completed metadata, publication-control, crawl-control, and sitemap fixes; then deepen high-intent service/location content, build trustworthy hiring and pricing guides, and earn relevant Kenyan citations.

No ranking, search-volume, traffic, domain-authority, or backlink-count claims are made in this report because verified first-party data was not available. The live fetch on 2026-10-09 still showed the older keyword-stuffed homepage title/copy and request-time sitemap-index `lastmod`, so the current repository changes are not yet verified in production.

## Implementation update: 2026-10-09

### Implemented code

- Homepage metadata is stable and independent of categories: `Find Fundis & Service Professionals in Kenya | Fudari` with the approved category-neutral description.
- Homepage H1 and visible introduction now describe the marketplace naturally. Aggregate provider totals are labelled `Active Pros`, not `ID-Verified Pros`, and verification language is conditional on actual profile data.
- Public skill, service, county, town, area, and provider metadata remains data-driven. Public backend slug resolution now excludes inactive skills, service offerings, locations, and areas.
- Skill-location sitemap records now carry the combined skill/location admin indexability flag, preventing known noindex combinations from entering the sitemap.
- County, town, area, and service-location pages remain gated by live provider supply. Legacy county/town URL shapes permanently redirect to canonical town URLs.
- Service-location bucketing prefers normalized provider `town` and `county` fields, using free-text locations only as a legacy fallback.
- Route-level service Open Graph metadata includes a share image. Unsupported `largest` and `leading` claims were removed from public metadata and JSON-LD.
- Homepage hydration no longer repeats category, provider, and statistics API requests when server-rendered data is available.
- The deployment guide now reflects the real Flyway path and the current Flyway/Hibernate production compatibility risk.

### Files changed in this implementation

| Path | Purpose |
| --- | --- |
| `frontend/src/app/page.tsx` | Stable homepage title and description. |
| `frontend/src/app/HomeClient.tsx` | Natural H1, accurate trust copy, and removal of duplicate hydration requests. |
| `frontend/src/app/layout.tsx` | Accurate global social metadata and Organization/WebSite descriptions. |
| `frontend/src/app/artisans/layout.tsx` | Removed hardcoded unused skill list and unsupported scale/verification claims. |
| `frontend/src/app/artisan/[slug]/layout.tsx` | Conditional provider verification metadata and JSON-LD wording. |
| `frontend/src/app/services/page.tsx` | Accurate service-index description and Open Graph image. |
| `frontend/src/app/services/[slug]/page.tsx` | Accurate dynamic provider wording and Open Graph image. |
| `frontend/src/lib/taxonomy.ts` | Effective indexability contract for skill-location records. |
| `frontend/src/lib/sitemapSources.ts` | Excludes admin-noindexed skill/location combinations. |
| `backend/src/main/java/com/tufixit/backend/repository/SkillMetadataRepository.java` | Active-only public skill resolution. |
| `backend/src/main/java/com/tufixit/backend/repository/ServiceOfferingRepository.java` | Active-only public service resolution. |
| `backend/src/main/java/com/tufixit/backend/repository/LocationRepository.java` | Active-only public county, town, and area resolution. |
| `backend/src/main/java/com/tufixit/backend/service/TaxonomyService.java` | Enforces publication state and propagates indexability. |
| `backend/src/main/java/com/tufixit/backend/service/ServiceOfferingService.java` | Returns not found for inactive public offerings. |
| `backend/src/main/java/com/tufixit/backend/dto/TaxonomyDTO.java` | Exposes effective skill-location indexability. |
| `backend/src/test/java/com/tufixit/backend/service/TaxonomyServiceTest.java` | Regression coverage for inactive locations and noindex propagation. |
| `backend/src/test/java/com/tufixit/backend/service/ServiceOfferingServiceTest.java` | Regression coverage for inactive service slugs. |
| `backend/src/test/resources/application-test.properties` | Keeps H2 `create-drop` tests under a single schema owner by disabling Flyway in the test profile only. |
| `DEPLOYMENT.md` | Flyway, schema, and deployment guidance correction. |

### Dynamic metadata and lifecycle design

- **Homepage:** fixed metadata; category changes cannot alter the title or description.
- **Skill/category discovery:** active records come from `skill_metadata` and category APIs. Names, slugs, descriptions, breadcrumbs, canonicals, and sitemap URLs are generated from returned records rather than a frontend category list.
- **Services:** active `service_offerings` records own names, slugs, SEO overrides, prices, and indexability. Safe templates apply when SEO overrides are empty.
- **Locations:** the `COUNTY -> TOWN -> AREA` taxonomy owns canonical names, slugs, hierarchy, coordinates, descriptions, and admin indexability.
- **Create:** active records appear after the current Next.js revalidation window and enter sitemaps only when supply/indexability rules pass.
- **Rename:** display metadata changes with the record. Slugs should remain stable unless an explicit redirect record or redirect rule is added.
- **Deactivate:** public slug endpoints now return not found; records leave active navigation and generated sitemaps after cache expiry.
- **Delete:** service deletion is soft. Hard deletion or slug changes still require an explicit replacement decision; do not redirect unrelated records to the homepage.
- **Caching:** public taxonomy and landing data uses 10-minute Next.js revalidation; sitemap responses use a one-hour shared cache. There is no authenticated on-demand revalidation path yet, so admin changes can be stale for up to those windows.

### Indexation rules

- Entities must be active and not disabled by their admin indexability flag.
- Skill, service, location, and combination pages require useful live provider inventory; thin pages render for users but use `noindex,follow` and stay out of sitemaps.
- Public provider profiles require a minimum completeness score; incomplete profiles remain reachable but noindex.
- Query-driven internal search/filter combinations are not treated as canonical landing pages.
- Missing or inactive records return not found rather than a soft homepage redirect.

### Performance and accessibility evidence

- Removed three duplicate client-side data requests on a normally populated homepage, reducing hydration API work and avoiding avoidable content replacement.
- Existing server rendering, image sizing, semantic H1/H2 structure, breadcrumbs, form labels, keyboard-aware search controls, and responsive Bootstrap layout remain in place.
- No Lighthouse, CrUX, Search Console Core Web Vitals, or physical-device measurements were available. LCP, INP, CLS, contrast, and screen-reader outcomes must therefore be measured after deployment rather than claimed as improved.

### Validation evidence

- Frontend production build passed with Next.js 16.1.6, including TypeScript validation and generation of all 46 static pages.
- Backend clean test suite passed: 54 tests, 0 failures, 0 errors, and 0 skipped. This includes 22 integration tests and 32 focused/unit tests.
- The H2 integration profile uses Hibernate `create-drop`, so Flyway is disabled only for that test profile. Production Flyway configuration is unchanged.
- Focused frontend linting passed with two pre-existing unused-helper warnings in `HomeClient.tsx` and no errors.

### Deployment and rollback

1. Back up PostgreSQL and confirm Flyway history before starting the new backend image.
2. Deploy backend before frontend so active-only APIs and the new taxonomy DTO are available when the frontend starts.
3. Deploy frontend through the existing Docker Compose/nginx process. No new environment variables or database migrations are required by this implementation.
4. Verify `/`, `/robots.txt`, `/sitemap.xml`, representative `/artisans/{skill}`, `/locations/{location}`, `/services/{service}`, combination pages, and one provider profile.
5. Confirm inactive test records return 404 and do not appear in segmented sitemaps.
6. Roll back by redeploying the previous backend and frontend image/commit together. The DTO field is additive and no data migration occurs, so database rollback is not required.

Outstanding compatibility risk: production enables Flyway while also defaulting Hibernate to `ddl-auto=update`. Confirm migration history, then move production to `validate` in a separately approved release.

### 30-day roadmap

| Window | Priority | Work and measurable checkpoint |
| --- | --- | --- |
| Days 1-3 | Critical | Deploy and verify rendered title, description, canonical, robots, H1, JSON-LD, redirects, and sitemap XML on representative URLs. Zero eligible pages should return 5xx or soft 404. |
| Days 1-7 | High | Submit the sitemap index in Search Console/Bing; record discovered/indexed counts and exclusion reasons by sitemap section. Establish organic clicks, impressions, CTR, position, WhatsApp clicks, calls, and bookings as the baseline. |
| Days 5-10 | High | Add an authenticated on-demand revalidation mechanism for category/service/location mutations and tests proving create, rename, deactivate, and delete behavior. Target propagation under five minutes. |
| Days 8-14 | High | Validate current provider verification, payment, pricing, availability, and coverage claims with product/operations owners. Remove or qualify anything without an operational source. |
| Days 10-20 | Medium | Publish two reviewed guides from the content plan, each linked to one primary service/skill page and one supply-backed location page. Track impressions and assisted conversions separately. |
| Days 15-25 | Medium | Add frontend route-output regression tests for metadata, canonical, robots, JSON-LD, sitemap XML, and redirect behavior. |
| Days 20-30 | Medium | Manually review the directory and partnership prospects below. Claim only accurate profiles and record referral traffic/conversions; do not evaluate placements by followed-link value alone. |
| Day 30 | Review | Compare page-type cohorts against baseline. Expand only service/location combinations showing both provider supply and real impressions or first-party demand. |

## Technical audit

### Completed in this change set

| Priority | Finding | Resolution |
| --- | --- | --- |
| Critical | Private/auth routes were robots-disallowed but could still be indexed because crawlers could not observe a noindex directive. | Added `X-Robots-Tag: noindex, nofollow` to dashboard, chat, profile completion, auth, and tracking responses. Removed those routes from robots disallow. Added route metadata to register and tracking. |
| High | Homepage metadata and visible copy were keyword-stuffed and made broad verification claims. | Replaced them with stable, natural marketplace wording and one H1; verification is now described conditionally rather than applied to all providers. |
| High | Global metadata applied Nairobi geo coordinates to unrelated pages. | Removed global geo tags and added route-derived geo metadata to appropriate location pages. |
| Medium | Sitemap index and most sitemap URLs claimed request time as `lastmod`. | Omitted unsupported timestamps; retained real provider `updatedAt` values when available. |
| Medium | Estate detail title was an H2. | Promoted the estate name to the page H1. |
| Medium | Estate JSON-LD was injected without escaping `<`. | Added safe JSON serialization consistent with other routes. |

### Remaining backlog

| Priority | Finding | Recommended action |
| --- | --- | --- |
| High | Public estate resolver returns manager contacts and commercial terms even though a safe public projection exists. | Return the public estate DTO from unauthenticated endpoints; keep sensitive fields authenticated. |
| Medium | Backend and frontend still calculate profile-completeness eligibility separately. | Return the complete effective SEO decision from the backend and use it for both metadata and sitemaps. |
| Medium | Skill-location sitemap feed performs broad in-memory aggregation without response caching. | Cache results with a short TTL and support ETag or Last-Modified. |
| Medium | Estate pages may be orphaned from ordinary HTML navigation. | Add a public estate hub only for partners that consent to indexation, with crawlable links. |
| Medium | No frontend SEO regression suite protects canonicals, robots, JSON-LD, headings, and sitemaps. | Add route-level metadata and XML tests. |
| Medium | Admin category/service/location changes have no authenticated on-demand Next.js revalidation. | Add a protected invalidation workflow and lifecycle tests; current staleness is bounded by ISR/cache TTLs. |
| Low | nginx certificate bootstrap serves placeholder content with HTTP 200. | Return 503 plus `Retry-After` outside ACME challenge paths. |

Direct provider phone and WhatsApp details were not removed: direct contact is a visible product promise. Precise coordinates and email exposure should still receive a privacy review.

## Competitor evidence

| Site | Verified positioning | Notable organic/content pattern | Opportunity for FUDARI |
| --- | --- | --- | --- |
| fundis.co.ke | African technical/vocational career and hiring platform | Broad trade categories, workforce verification, learning/certification, blog | Win consumer repair intent with local availability, transparent prices, booking, and payment-on-completion proof. |
| weera.co | Coming-soon marketplace with verified providers and M-Pesa escrow | Minimal public content | Differentiate with live supply and indexable service/location inventory. |
| tumafundi.ke | Kenyan artisan marketplace claiming all-county coverage | Categories, locations, profiles, jobs, blog/guides, direct WhatsApp/call | Publish evidence-led pricing and hiring guides; strengthen real inventory pages rather than unsupported scale claims. |
| kuba.co.ke | Home and business services marketplace | Deep service pages, providers, commercial pages, journal, policy documents | Build richer service-specific scope/pricing/quality content and estate/property-manager workflows. |
| mtaanifix.tech | Verified fundis with SafeHire escrow and dispute support | Service pages, job workflow, materials-payment explanation, trust comparison | Explain FUDARI PIN verification, payment timing, dispute handling, and materials safeguards in detail. |
| fimbo.co.ke | Broad Kenyan local-services marketplace | City/category combinations, provider listings, business listing acquisition | Prioritize high-supply city/service pages and avoid thin combinations. Also treat it as a competitor, not merely a directory. |
| veriso.co.ke | Unverified | Fetch returned HTTP 402 | Recheck manually before using in strategy. |

## Keyword-to-URL map

One intent should have one primary URL. Do not create a second page when an existing route already owns the query.

| Intent cluster | Primary URL pattern | Core examples | Content requirement |
| --- | --- | --- | --- |
| Marketplace | `/` | local service professionals kenya; hire a fundi nairobi | Trust, process, categories, locations, live proof, clear CTA. |
| Skill hub | `/artisans/{skill}` | plumbers in kenya; electricians in kenya | Trade overview, common jobs, selection criteria, live providers, FAQs. |
| Skill + county | `/artisans/{skill}/{county}` | plumber nairobi; electrician kiambu | Local supply, areas served, local price context, response expectations. |
| Skill + area | `/artisans/{skill}/{county}/{area}` | plumber westlands; electrician ruiru | Publish only above the supply threshold; use genuinely local facts. |
| Service detail | `/services/{service}` | drain unblocking; house rewiring | Scope, exclusions, price drivers, safety, preparation, related services. |
| Service + location | `/services/{service}/{location}` | drain unblocking nairobi | Local providers and practical local context; avoid templated filler. |
| County hub | `/locations/{county}` | fundis in nairobi; service professionals kiambu | Available trades, popular areas, live counts, local FAQs. |
| Provider | `/artisan/{slug}` | provider name + trade/location | Credentials, work history, reviews, service area, clear booking action. |
| Estate | `/estate/{slug}` | estate maintenance services | Index only with partner consent and enough distinct public value. |
| Editorial guide | Future `/guides/{slug}` | plumbing cost nairobi; how to hire a fundi | Original, reviewed guidance that links into transactional pages. |

## Content plan

Do not publish filler at scale. Each guide needs an accountable author/reviewer, a reviewed date, sources for safety or regulatory statements, and contextual links to the relevant service and location pages.

1. **How much does a plumber cost in Nairobi?** Price drivers, call-out fees, parts versus labour, sample scopes, warning signs. Link to plumbing hubs and services.
2. **How to hire a fundi in Nairobi safely** Identity checks, written scope, price agreement, PIN process, payment timing, dispute path.
3. **Emergency plumbing checklist for Kenyan homes** Immediate shutoff steps, what not to do, information to send the plumber.
4. **Electrician verification and electrical safety in Kenya** Use qualified review and cite current official guidance before publication.
5. **Repair or replace? Appliance decision guide** Diagnostic questions, age/parts/warranty factors, estimate checklist.
6. **Property manager maintenance checklist** Preventive schedules, vendor records, emergency escalation, estate workflow.
7. **M-Pesa payment safety when hiring home-service providers** Receipts, staged materials, labour release, fraud warning signs.
8. **Service-area pages for proven demand** Expand only where Search Console demand and live provider supply justify a distinct page.

Recommended cadence: two high-quality guides per month, then update based on impressions, engagement, booking conversion, and support questions. Use Search Console and first-party booking data for prioritization before commissioning more topics.

## Internal linking plan

- Link every guide to one primary service/skill page and one relevant location page.
- Add contextual links from service pages to adjacent services, not generic keyword lists.
- Link county hubs to indexable skill/county pages using live supply data.
- Add breadcrumb navigation and matching `BreadcrumbList` schema where absent.
- Link provider profiles back to their skill and location hubs.
- Keep noindex/thin URLs out of sitemaps and prominent crawl paths.
- Add estate links only where public discovery is contractually appropriate.

## Backlink opportunity register

These are opportunities for manual review, not endorsements. Do not automate submissions, create accounts, or pay without approval.

| Site | Verified listing path/process | Cost observed on audit date | Link attribute | Relevance and caution |
| --- | --- | --- | --- | --- |
| businessfinder.co.ke | `/submit-business` or `/signup` | Free workflow stated | Unavailable | Relevant Kenyan directory; verify moderation and final outbound-link behavior before submission. |
| bizregistry.co.ke | `/list-your-business?plan=free` | Basic free; Plus KSh 2,500/year; Pro KSh 6,000/year | Unavailable | Relevant Kenyan SME citation. Start free; paid placement should be justified by referral leads, not link value. |
| businesslist.co.ke | `/create-business-listing` and package signup URLs | Basic KES 1,500 one-time; Premium KES 6,500/year; Lifetime KES 15,500 one-time | Unavailable | Established Kenyan directory signals visible, but verify terms, current pricing, and profile quality manually. |
| yellowpages.co.ke | `/business-owner` | Unavailable | Unavailable | Relevant Kenyan directory/advertising platform. Request current package and link details directly. |
| fimbo.co.ke | `/list-your-business` | Unavailable | Unavailable | Highly relevant but also a direct marketplace competitor; assess commercial/data-sharing implications first. |
| gebiedsgids.nl | Registration exists for Dutch community pages | Unavailable | Unavailable | Not relevant to a Kenyan services marketplace; do not pursue. |

Additional relationship-led prospects:

- Estate/property-management partners already using FUDARI: request a factual vendor/resource link where editorially useful.
- Kenyan hardware shops and suppliers: co-author maintenance or materials guides without paid anchor-text arrangements.
- Trade schools and TVET institutions: provider career resources, verification education, and graduate pathways.
- Professional/trade associations: only where FUDARI meets membership or resource-list criteria.
- Local media and housing publications: pitch original first-party service-demand or pricing research once enough clean data exists.

Avoid link exchanges at scale, paid followed links, automated directory blasts, exact-match guest-post campaigns, and claims of verification/coverage unsupported by operational data.

## Measurement plan

Baseline these after deployment:

- Search Console indexed pages, excluded reasons, impressions, clicks, CTR, and average position by page type.
- Sitemap discovered/indexed counts by section.
- Organic landing-page bookings, WhatsApp clicks, calls, provider-profile views, and completed jobs.
- Core Web Vitals by template.
- Referring domains and referral conversions from manually approved placements.
- Thin/no-supply URL count and API/sitemap generation latency.

Review weekly for crawl/index errors and monthly for content and conversion decisions. Compare cohorts by page type rather than treating all organic traffic as equally valuable.

## Manual rollout checklist

1. Review the public estate DTO and provider privacy policy with product/legal owners.
2. Deploy frontend changes through the normal release process; no deployment was performed during this audit.
3. Verify response headers on `/dashboard`, `/login`, `/register`, `/chat/*`, `/complete-profile`, and `/track`.
4. Verify robots.txt no longer blocks those HTML routes while still blocking `/api/` and duplicate query URLs.
5. Verify sitemap XML has no fabricated request-time `lastmod` values.
6. Run URL Inspection for the homepage and priority service/location pages, then request indexing selectively.
7. Submit the sitemap index in Google Search Console and Bing Webmaster Tools if not already submitted.
8. Manually validate Organization, FAQ, Breadcrumb, LocalBusiness, and provider structured data with current testing tools.
9. Claim directory profiles only after confirming ownership, current fees, data policy, and outbound-link behavior.
10. Do not deploy, buy listings, create third-party accounts, or contact partners without authorization.
