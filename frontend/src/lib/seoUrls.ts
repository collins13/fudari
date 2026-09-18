/**
 * Canonical SEO URLs.
 *
 * Every link to a provider or landing page goes through here so the scheme can
 * change in one place. Provider URLs are slug + id: the slug carries keywords,
 * the id makes the lookup exact, and a stale slug 301s to the current one.
 */

export const SITE_URL = 'https://fudari.co';

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type ProviderLike = {
  id: number;
  firstName?: string;
  lastName?: string;
  skills?: Array<{ skillType?: string }>;
  county?: string;
  town?: string;
  locationName?: string;
};

/** e.g. john-kamau-plumber-nairobi-42 */
export function providerSlug(provider: ProviderLike, skillLabel?: string): string {
  const name = [provider.firstName, provider.lastName].filter(Boolean).join(' ');
  const skill = skillLabel || provider.skills?.[0]?.skillType?.replace(/_/g, ' ') || '';
  const place = provider.town || provider.county || provider.locationName || '';
  const parts = [name, skill, place].filter(Boolean).map(slugify).filter(Boolean);
  return `${parts.join('-')}-${provider.id}`;
}

export function providerPath(provider: ProviderLike, skillLabel?: string): string {
  return `/artisan/${providerSlug(provider, skillLabel)}`;
}

/** Trailing -{digits} is the id; everything before it is cosmetic. */
export function parseProviderSlug(slug: string): number | null {
  const match = /-(\d+)$/.exec(slug);
  if (match) return Number(match[1]);
  return /^\d+$/.test(slug) ? Number(slug) : null;
}

export function skillPath(skillSlug: string): string {
  return `/artisans/${skillSlug}`;
}

export function skillLocationPath(skillSlug: string, locationSlug: string, areaSlug?: string): string {
  return areaSlug
    ? `/artisans/${skillSlug}/${locationSlug}/${areaSlug}`
    : `/artisans/${skillSlug}/${locationSlug}`;
}

export function locationPath(countySlug: string): string {
  return `/locations/${countySlug}`;
}

export function servicePath(serviceSlug: string, locationSlug?: string): string {
  return locationSlug ? `/services/${serviceSlug}/${locationSlug}` : `/services/${serviceSlug}`;
}

export function absolute(path: string): string {
  return `${SITE_URL}${path}`;
}
