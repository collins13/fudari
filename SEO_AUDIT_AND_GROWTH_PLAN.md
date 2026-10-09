# FUDARI SEO Audit and Growth Plan

Audit date: 2026-10-09

## Executive summary

FUDARI already has a strong programmatic SEO base: server-rendered metadata, canonical URL helpers, supply-aware indexability, service/location/provider landing pages, structured data, robots.txt, and segmented XML sitemaps. The best near-term gains are to deploy the completed crawl-control and sitemap fixes, deepen high-intent service/location content, build trustworthy hiring and pricing guides, and earn relevant Kenyan citations.

No ranking, search-volume, traffic, domain-authority, or backlink-count claims are made in this report because verified first-party data was not available. Production still serves the older homepage copy, so repository changes are not yet live.

## Technical audit

### Completed in this change set

| Priority | Finding | Resolution |
| --- | --- | --- |
| Critical | Private/auth routes were robots-disallowed but could still be indexed because crawlers could not observe a noindex directive. | Added `X-Robots-Tag: noindex, nofollow` to dashboard, chat, profile completion, auth, and tracking responses. Removed those routes from robots disallow. Added route metadata to register and tracking. |
| High | Homepage did not target the requested phrases. | Added exact title, 160-character description, visible copy, and one-H1 heading structure for `local service professionals kenya`, `hire a fundi nairobi`, and `plumbers in kenya`. |
| High | Global metadata applied Nairobi geo coordinates to unrelated pages. | Removed global geo tags and added route-derived geo metadata to appropriate location pages. |
| Medium | Sitemap index and most sitemap URLs claimed request time as `lastmod`. | Omitted unsupported timestamps; retained real provider `updatedAt` values when available. |
| Medium | Estate detail title was an H2. | Promoted the estate name to the page H1. |
| Medium | Estate JSON-LD was injected without escaping `<`. | Added safe JSON serialization consistent with other routes. |

### Remaining backlog

| Priority | Finding | Recommended action |
| --- | --- | --- |
| High | Public estate resolver returns manager contacts and commercial terms even though a safe public projection exists. | Return the public estate DTO from unauthenticated endpoints; keep sensitive fields authenticated. |
| Medium | Inactive skills, locations, and service offerings can be fetched by slug. | Add active-filtered repository queries and return 404 for unpublished records. |
| Medium | Backend `SeoPolicyService` is not the authoritative sitemap/indexability source. | Apply it to taxonomy and sitemap feeds and test threshold parity with the frontend. |
| Medium | Skill-location sitemap feed performs broad in-memory aggregation without response caching. | Cache results with a short TTL and support ETag or Last-Modified. |
| Medium | Estate pages may be orphaned from ordinary HTML navigation. | Add a public estate hub only for partners that consent to indexation, with crawlable links. |
| Medium | No frontend SEO regression suite protects canonicals, robots, JSON-LD, headings, and sitemaps. | Add route-level metadata and XML tests. |
| Medium | `DEPLOYMENT.md` says Flyway is absent, but Flyway is enabled. | Correct the deployment runbook before the next schema release. |
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
