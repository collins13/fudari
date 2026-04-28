import { MetadataRoute } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

const SKILL_TYPES = [
  'electrician', 'plumber', 'mechanic', 'painter', 'carpenter', 'welder',
  'hvac_technician', 'appliance_repair', 'roofing', 'tiling', 'mason',
  'gardener', 'cleaner', 'security', 'solar_technician', 'borehole_drilling',
  'fumigation', 'water_tank_cleaning', 'glass_fitter', 'ceiling_board',
  'locksmith', 'cctv_installer', 'interior_designer',
];

const MAJOR_LOCATIONS = [
  'nairobi', 'mombasa', 'kisumu', 'nakuru', 'eldoret',
  'thika', 'nyeri', 'machakos', 'malindi', 'kitale',
  'nanyuki', 'garissa', 'kakamega', 'embu', 'meru',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://tufixit.com';
  const now = new Date();

  // Static indexable pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl,                     lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${baseUrl}/artisans`,       lastModified: now, changeFrequency: 'daily',   priority: 0.95 },
    { url: `${baseUrl}/pricing`,        lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
    { url: `${baseUrl}/terms`,          lastModified: now, changeFrequency: 'yearly',  priority: 0.3  },
    { url: `${baseUrl}/privacy`,        lastModified: now, changeFrequency: 'yearly',  priority: 0.3  },
  ];

  // Category landing pages — use clean query-param URLs (standard for filter-based SPAs)
  const categoryPages: MetadataRoute.Sitemap = SKILL_TYPES.map((skill) => ({
    url: `${baseUrl}/artisans?category=${skill}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }));

  // Top skill × top city combos for local SEO
  const topSkills = SKILL_TYPES.slice(0, 8);
  const topCities = MAJOR_LOCATIONS.slice(0, 8);
  const comboPages: MetadataRoute.Sitemap = topSkills.flatMap((skill) =>
    topCities.map((city) => ({
      url: `${baseUrl}/artisans?category=${skill}&location=${city}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    })),
  );

  // Dynamic artisan profile pages
  let artisanPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_URL}/workers/search?page=0&size=1000`, {
      next: { revalidate: 86400 },
    });
    if (res.ok) {
      const data = await res.json();
      const workers: { id: number; updatedAt?: string; vettingLevel?: string }[] =
        data.content || data || [];
      artisanPages = workers.map((w) => ({
        url: `${baseUrl}/artisans/${w.id}`,
        lastModified: w.updatedAt ? new Date(w.updatedAt) : now,
        changeFrequency: 'weekly' as const,
        // PRO artisans updated more frequently / higher priority
        priority: w.vettingLevel === 'PRO' ? 0.7 : w.vettingLevel === 'VERIFIED' ? 0.65 : 0.55,
      }));
    }
  } catch {
    // API unavailable at build time — skip
  }

  // Dynamic estate portal pages
  let estatePages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_URL}/estates?page=0&size=200`, {
      next: { revalidate: 86400 },
    });
    if (res.ok) {
      const data = await res.json();
      const estates: { slug: string; updatedAt?: string }[] =
        data.content || data || [];
      estatePages = estates.map((e) => ({
        url: `${baseUrl}/estate/${e.slug}`,
        lastModified: e.updatedAt ? new Date(e.updatedAt) : now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    }
  } catch {
    // API unavailable at build time — skip
  }

  return [...staticPages, ...categoryPages, ...comboPages, ...artisanPages, ...estatePages];
}
