import { KENYA_COUNTIES } from '@/lib/kenya';

/**
 * Service locations are derived from live provider data, never hand-listed.
 *
 * A worker's `locationName` is free text, so it is folded to a canonical place:
 * the county when the text mentions one ("Nairobi CBD" -> Nairobi), otherwise the
 * cleaned text itself ("Westlands" stays Westlands, which is a real local query).
 * Supply gating then prunes whatever is too thin to deserve a page.
 */

export type LocationBucket = {
  slug: string;
  name: string;
  providerCount: number;
  /** Distinct raw `locationName` values folded into this bucket, most common first. */
  areas: string[];
  geo: { lat: number; lng: number } | null;
};

type LocatableWorker = {
  locationName?: string;
  latitude?: number | null;
  longitude?: number | null;
};

/**
 * Below this a location page is thin: it still renders so inbound links do not
 * 404, but it is marked noindex and kept out of the sitemap.
 */
export const MIN_INDEXABLE_PROVIDERS = 3;

export function locationSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Longest first so "Trans Nzoia" wins over any shorter substring match.
const COUNTY_MATCHERS = [...KENYA_COUNTIES]
  .sort((a, b) => b.length - a.length)
  .map((county) => ({
    county,
    // Word-bounded so "Meru" does not swallow "Merueshi".
    pattern: new RegExp(`(^|[^a-z])${escapeRegExp(county.toLowerCase())}([^a-z]|$)`, 'i'),
  }));

const NOISE_WORDS = /\b(kenya|county|town|area|estate|ke)\b/gi;

function titleCase(value: string): string {
  return value.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

/** Fold a free-text location into the place a landing page should be built for. */
export function canonicalLocation(locationName?: string | null): { slug: string; name: string } | null {
  if (!locationName) return null;

  const county = COUNTY_MATCHERS.find(({ pattern }) => pattern.test(locationName))?.county;
  if (county) return { slug: locationSlug(county), name: county };

  // Free text like "Westlands, Nairobi - opposite Sarit" keeps only the leading place.
  const cleaned = locationName
    .split(/[,/|(-]/)[0]
    .replace(NOISE_WORDS, '')
    .replace(/[^A-Za-z' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length < 3 || cleaned.split(' ').length > 4) return null;
  const slug = locationSlug(cleaned);
  if (!slug) return null;
  return { slug, name: titleCase(cleaned.toLowerCase()) };
}

/** Bucket providers by canonical location, most supply first. */
export function groupByLocation(workers: LocatableWorker[]): LocationBucket[] {
  const buckets = new Map<string, { name: string; areas: Map<string, number>; lat: number[]; lng: number[] }>();

  for (const worker of workers) {
    const place = canonicalLocation(worker.locationName);
    if (!place) continue;

    let bucket = buckets.get(place.slug);
    if (!bucket) {
      bucket = { name: place.name, areas: new Map(), lat: [], lng: [] };
      buckets.set(place.slug, bucket);
    }

    const rawArea = worker.locationName?.trim();
    if (rawArea) bucket.areas.set(rawArea, (bucket.areas.get(rawArea) || 0) + 1);
    if (typeof worker.latitude === 'number' && typeof worker.longitude === 'number') {
      bucket.lat.push(worker.latitude);
      bucket.lng.push(worker.longitude);
    }
  }

  const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

  return Array.from(buckets.entries())
    .map(([slug, bucket]) => ({
      slug,
      name: bucket.name,
      providerCount: Array.from(bucket.areas.values()).reduce((sum, count) => sum + count, 0),
      areas: Array.from(bucket.areas.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([area]) => area),
      geo: bucket.lat.length ? { lat: average(bucket.lat), lng: average(bucket.lng) } : null,
    }))
    .sort((a, b) => b.providerCount - a.providerCount || a.name.localeCompare(b.name));
}
