import { serverGet } from '@/lib/serverApi';

export const SERVICE_REVALIDATE = 600;

export type ServiceCategory = {
  name: string;
  slug?: string;
  description?: string;
  isActive: boolean;
  indexable?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  skillTypes?: string[];
  artisanCount?: number;
};

export type ServiceWorker = {
  id: number;
  firstName: string;
  lastName: string;
  locationName?: string;
  county?: string;
  town?: string;
  area?: string;
  serviceRadiusKm?: number;
  latitude?: number | null;
  longitude?: number | null;
  trustScore?: number;
  totalReviews?: number;
  totalJobsCompleted?: number;
  vettingLevel?: string;
  availableNow?: boolean;
  skills?: Array<{ skillType: string; description?: string; hourlyRate?: string; services?: Array<{ name: string; slug: string }> }>;
};

export type ServiceOffering = {
  id: number;
  name: string;
  slug: string;
  skillType: string;
  description?: string;
  synonyms?: string[];
  priceFromKes?: number;
  priceToKes?: number;
  isEmergency?: boolean;
  isActive?: boolean;
  indexable?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  artisanCount?: number;
};

export async function getCategory(categorySlug: string): Promise<ServiceCategory | null> {
  const categories = await serverGet<ServiceCategory[]>('/categories/stats', { revalidate: SERVICE_REVALIDATE });
  return categories?.find((category) => category.slug === categorySlug) || null;
}

export async function getServiceOfferings(): Promise<ServiceOffering[]> {
  return (await serverGet<ServiceOffering[]>('/service-offerings', { revalidate: SERVICE_REVALIDATE })) || [];
}

/** Sub-services belonging to a category, via the category's skill types. */
export async function getOfferingsForCategory(skillTypes: string[]): Promise<ServiceOffering[]> {
  const skills = new Set(skillTypes);
  return (await getServiceOfferings()).filter((offering) => skills.has(offering.skillType));
}

export function isIndexableOffering(offering: ServiceOffering | undefined): offering is ServiceOffering {
  return Boolean(offering && offering.isActive !== false && offering.indexable !== false);
}

/** A category is only worth indexing when it is live, opted in and actually has supply. */
export function isIndexableCategory(category: ServiceCategory | null): category is ServiceCategory {
  return Boolean(
    category && category.isActive && category.indexable !== false && category.skillTypes?.length && category.artisanCount,
  );
}

export async function getCategoryWorkers(skillTypes: string[]): Promise<ServiceWorker[]> {
  const results = await Promise.all(
    skillTypes.map((skillType) =>
      serverGet<ServiceWorker[]>(`/workers/search?skillType=${encodeURIComponent(skillType)}`, { revalidate: SERVICE_REVALIDATE }),
    ),
  );
  const byId = new Map(
    results
      .flat()
      .filter((worker): worker is ServiceWorker => worker !== null)
      .map((worker) => [worker.id, worker]),
  );
  return Array.from(byId.values());
}

/** Providers who explicitly offer a sub-service. */
export async function getOfferingWorkers(serviceSlug: string): Promise<ServiceWorker[]> {
  return (
    (await serverGet<ServiceWorker[]>(`/workers/search?serviceSlug=${encodeURIComponent(serviceSlug)}`, {
      revalidate: SERVICE_REVALIDATE,
    })) || []
  );
}
