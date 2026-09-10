import { MetadataRoute } from 'next';
import { serverApiUrl } from '@/lib/serverApi';

// Built per request, not at build time: `docker compose build` runs before the API
// is reachable, and a build-time fetch failure silently produced a sitemap with no
// artisan or estate URLs at all.
export const dynamic = 'force-dynamic';

const BASE = 'https://fudari.co';

type Worker = { id: number; updatedAt?: string; vettingLevel?: string };
type Estate = { slug: string };
type Category = { slug?: string; isActive: boolean; indexable?: boolean; skillTypes?: string[]; artisanCount?: number; updatedAt?: string };

async function getJson<T>(path: string): Promise<T[]> {
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Filter URLs are deliberately excluded: /artisans?skill=… is client-side
  // filtered, so every variant serves identical HTML and canonicalises to
  // /artisans. Listing them was asking Google to index 104 duplicates.
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE}/artisans`, lastModified: now, changeFrequency: 'daily', priority: 0.95 },
    { url: `${BASE}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
    { url: `${BASE}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const [workers, estates, categories] = await Promise.all([
    getJson<Worker>('/workers/search?page=0&size=1000'),
    getJson<Estate>('/estates/public'),
    getJson<Category>('/categories/stats'),
  ]);

  const artisanPages: MetadataRoute.Sitemap = workers.map((w) => ({
    url: `${BASE}/artisans/${w.id}`,
    lastModified: w.updatedAt ? new Date(w.updatedAt) : now,
    changeFrequency: 'weekly' as const,
    priority: w.vettingLevel === 'PRO' ? 0.8 : w.vettingLevel === 'VERIFIED' ? 0.7 : 0.6,
  }));

  const estatePages: MetadataRoute.Sitemap = estates
    .filter((e) => e.slug)
    .map((e) => ({
      url: `${BASE}/estate/${e.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

  const categoryPages: MetadataRoute.Sitemap = categories
    .filter((category) => category.slug && category.isActive && category.indexable !== false && category.skillTypes?.length && category.artisanCount)
    .map((category) => ({
      url: `${BASE}/services/${category.slug}`,
      lastModified: category.updatedAt ? new Date(category.updatedAt) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

  return [...staticPages, ...categoryPages, ...artisanPages, ...estatePages];
}
