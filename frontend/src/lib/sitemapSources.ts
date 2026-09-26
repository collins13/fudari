import { MetadataRoute } from 'next';
import { getSkillLocationCounts, getSkills, getCounties, MIN_PROVIDERS_FOR_INDEX } from '@/lib/taxonomy';
import { getServiceOfferings } from '@/lib/services';
import { groupByLocation, MIN_INDEXABLE_PROVIDERS } from '@/lib/locations';
import { serverApiUrl } from '@/lib/serverApi';
import { providerPath, servicePath, skillLocationPath, SITE_URL } from '@/lib/seoUrls';

// Built per request, not at build time: `docker compose build` runs before the API
// is reachable, and a build-time fetch failure silently produced a sitemap with no
// artisan or estate URLs at all.
export const dynamic = 'force-dynamic';

export type SitemapWorker = {
  id: number;
  firstName?: string;
  lastName?: string;
  updatedAt?: string;
  vettingLevel?: string;
  county?: string;
  town?: string;
  locationName?: string;
  totalReviews?: number;
  totalJobsCompleted?: number;
  skills?: Array<{ skillType: string; description?: string; services?: Array<{ slug: string }> }>;
};

export async function fetchJson<T>(path: string): Promise<T[]> {
  try {
    // Googlebot drops the sitemap as "Couldn't fetch" if we hang waiting on the API.
    const res = await fetch(`${serverApiUrl()}${path}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (Array.isArray(data) ? data : data.content) || [];
  } catch {
    return [];
  }
}

/** Mirrors SeoPolicyService: a lone provider only carries a page if complete. */
export function providerCompleteness(worker: SitemapWorker): number {
  const checks = [
    Boolean(worker.firstName && worker.lastName),
    Boolean(worker.locationName || worker.town || worker.county),
    Boolean(worker.skills?.length),
    Boolean(worker.skills?.[0]?.description),
    Boolean(worker.totalJobsCompleted),
    Boolean(worker.totalReviews),
    worker.vettingLevel === 'VERIFIED' || worker.vettingLevel === 'PRO',
  ];
  return checks.filter(Boolean).length / checks.length;
}

export async function staticEntries(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/artisans`, lastModified: now, changeFrequency: 'daily', priority: 0.95 },
    { url: `${SITE_URL}/services`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/locations`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
}

/** Skill hubs plus every skill x location pair that clears the supply threshold. */
export async function skillEntries(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [skills, counts] = await Promise.all([getSkills(), getSkillLocationCounts()]);
  const indexableSkills = skills.filter((skill) => skill.indexable !== false);
  const slugs = new Set(indexableSkills.map((skill) => skill.slug));

  const hubs: MetadataRoute.Sitemap = indexableSkills
    .filter((skill) => (skill.providerCount || 0) >= MIN_PROVIDERS_FOR_INDEX)
    .map((skill) => ({
      url: `${SITE_URL}/artisans/${skill.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }));

  const pairs: MetadataRoute.Sitemap = counts
    .filter((entry) =>
      entry.locationType !== 'AREA' &&
      slugs.has(entry.skillSlug) &&
      entry.providerCount >= MIN_PROVIDERS_FOR_INDEX,
    )
    .map((entry) => ({
      url: `${SITE_URL}/artisans/${entry.skillSlug}/${entry.locationSlug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.95,
    }));

  const areas: MetadataRoute.Sitemap = counts.flatMap((entry) => {
    if (
      entry.locationType !== 'AREA' ||
      !entry.parentSlug ||
      !slugs.has(entry.skillSlug) ||
      entry.providerCount < MIN_PROVIDERS_FOR_INDEX
    ) {
      return [];
    }

    return [{
      url: `${SITE_URL}${skillLocationPath(entry.skillSlug, entry.parentSlug, entry.locationSlug)}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }];
  });

  return [...hubs, ...pairs, ...areas];
}

export async function locationEntries(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const counties = await getCounties();
  return counties
    .filter((county) => county.indexable !== false && (county.providerCount || 0) >= MIN_PROVIDERS_FOR_INDEX)
    .map((county) => ({
      url: `${SITE_URL}/locations/${county.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
}

export async function serviceEntries(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [offerings, workers] = await Promise.all([
    getServiceOfferings(),
    fetchJson<SitemapWorker>('/workers/search'),
  ]);

  return offerings
    .filter((offering) => offering.isActive !== false && offering.indexable !== false)
    .filter((offering) => {
      const count = workers.filter((worker) =>
        worker.skills?.some((skill) => skill.services?.some((service) => service.slug === offering.slug)),
      ).length;
      return count >= MIN_PROVIDERS_FOR_INDEX;
    })
    .map((offering) => ({
      url: `${SITE_URL}/services/${offering.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    }));
}

/** Service x location pages backed by enough live supply to remain indexable. */
export async function serviceLocationEntries(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [offerings, workers] = await Promise.all([
    getServiceOfferings(),
    fetchJson<SitemapWorker>('/workers/search'),
  ]);

  return offerings
    .filter((offering) => offering.isActive !== false && offering.indexable !== false)
    .flatMap((offering) => {
      const matchingWorkers = workers.filter((worker) =>
        worker.skills?.some((skill) => skill.services?.some((service) => service.slug === offering.slug)),
      );

      return groupByLocation(matchingWorkers)
        .filter((location) => location.providerCount >= MIN_INDEXABLE_PROVIDERS)
        .map((location) => ({
          url: `${SITE_URL}${servicePath(offering.slug, location.slug)}`,
          lastModified: now,
          changeFrequency: 'weekly' as const,
          priority: 0.9,
        }));
    });
}

export async function providerEntries(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const workers = await fetchJson<SitemapWorker>('/workers/search');
  return workers
    // Thin profiles are noindex, so listing them would only waste crawl budget.
    .filter((worker) => providerCompleteness(worker) >= 0.6)
    .map((worker) => ({
      url: `${SITE_URL}${providerPath(worker)}`,
      lastModified: worker.updatedAt ? new Date(worker.updatedAt) : now,
      changeFrequency: 'weekly' as const,
      priority: worker.vettingLevel === 'PRO' ? 0.8 : worker.vettingLevel === 'VERIFIED' ? 0.7 : 0.6,
    }));
}

export async function estateEntries(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const estates = await fetchJson<{ slug?: string }>('/estates/public');
  return estates
    .filter((estate) => estate.slug)
    .map((estate) => ({
      url: `${SITE_URL}/estate/${estate.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
}
