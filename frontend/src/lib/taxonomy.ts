import { serverGet } from '@/lib/serverApi';
import type { ServiceWorker } from '@/lib/services';

export const TAXONOMY_REVALIDATE = 600;

export type SkillTaxonomy = {
  id: number;
  skillType: string;
  name: string;
  pluralName: string;
  slug: string;
  description?: string;
  categorySlug?: string;
  categoryName?: string;
  seoTitleTemplate?: string;
  seoDescriptionTemplate?: string;
  keywords?: string[];
  synonyms?: string[];
  swahiliKeywords?: string[];
  indexable?: boolean;
  providerCount?: number;
};

export type LocationTaxonomy = {
  id: number;
  name: string;
  slug: string;
  type: 'COUNTY' | 'TOWN' | 'AREA';
  parentSlug?: string;
  countySlug?: string;
  countyName?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  indexable?: boolean;
  providerCount?: number;
};

export type SkillLocationCount = {
  skillSlug: string;
  locationSlug: string;
  locationName: string;
  locationType: 'COUNTY' | 'TOWN' | 'AREA';
  providerCount: number;
};

/**
 * Providers needed before a page may be indexed. Mirrors
 * `seo.min-providers-for-index` on the backend; the backend remains authoritative.
 */
export const MIN_PROVIDERS_FOR_INDEX = 3;

export async function getSkills(): Promise<SkillTaxonomy[]> {
  return (await serverGet<SkillTaxonomy[]>('/taxonomy/skills', { revalidate: TAXONOMY_REVALIDATE })) || [];
}

export async function getSkill(slug: string): Promise<SkillTaxonomy | null> {
  const skills = await getSkills();
  return skills.find((skill) => skill.slug === slug) || null;
}

/** Resolves a synonym or Swahili phrase to the canonical skill, for 301s. */
export async function resolveSkillSynonym(candidate: string): Promise<string | null> {
  const needle = candidate.toLowerCase().replace(/-/g, ' ').trim();
  const skills = await getSkills();
  const hit = skills.find(
    (skill) =>
      skill.synonyms?.some((s) => s.toLowerCase() === needle) ||
      skill.swahiliKeywords?.some((s) => s.toLowerCase() === needle),
  );
  return hit?.slug || null;
}

export async function getCounties(): Promise<LocationTaxonomy[]> {
  return (await serverGet<LocationTaxonomy[]>('/taxonomy/counties', { revalidate: TAXONOMY_REVALIDATE })) || [];
}

/** Single request; resolves a county or town slug. */
export async function getLocation(slug: string): Promise<LocationTaxonomy | null> {
  return serverGet<LocationTaxonomy>(`/taxonomy/locations/${encodeURIComponent(slug)}`, {
    revalidate: TAXONOMY_REVALIDATE,
  });
}

export async function getArea(parentSlug: string, areaSlug: string): Promise<LocationTaxonomy | null> {
  return serverGet<LocationTaxonomy>(
    `/taxonomy/locations/${encodeURIComponent(parentSlug)}/areas/${encodeURIComponent(areaSlug)}`,
    { revalidate: TAXONOMY_REVALIDATE },
  );
}

export async function getLocationChildren(slug: string): Promise<LocationTaxonomy[]> {
  return (
    (await serverGet<LocationTaxonomy[]>(`/taxonomy/locations/${encodeURIComponent(slug)}/children`, {
      revalidate: TAXONOMY_REVALIDATE,
    })) || []
  );
}

export async function getSkillLocationCounts(): Promise<SkillLocationCount[]> {
  return (
    (await serverGet<SkillLocationCount[]>('/taxonomy/skill-locations', { revalidate: TAXONOMY_REVALIDATE })) || []
  );
}

/** Providers for a skill, optionally narrowed to a county/town/area. */
export async function getProviders(
  skillType: string,
  filters: { county?: string; town?: string; area?: string } = {},
): Promise<ServiceWorker[]> {
  const params = new URLSearchParams({ skillType });
  if (filters.county) params.set('county', filters.county);
  if (filters.town) params.set('town', filters.town);
  if (filters.area) params.set('area', filters.area);
  return (
    (await serverGet<ServiceWorker[]>(`/workers/search?${params.toString()}`, {
      revalidate: TAXONOMY_REVALIDATE,
    })) || []
  );
}

/**
 * Rough profile completeness, used by the single-provider indexation rule.
 * Mirrors the backend's intent: a lone provider only carries a page if the
 * profile is actually worth landing on.
 */
export function profileCompleteness(worker: ServiceWorker): number {
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

/** The one place indexability is decided on the frontend. */
export function isIndexable(workers: ServiceWorker[], adminIndexable = true): boolean {
  if (!adminIndexable) return false;
  if (workers.length >= MIN_PROVIDERS_FOR_INDEX) return true;
  return workers.length === 1 && profileCompleteness(workers[0]) >= 0.6;
}
