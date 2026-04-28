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

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/artisans`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Category pages — one per skill type
  const categoryPages: MetadataRoute.Sitemap = SKILL_TYPES.map((skill) => ({
    url: `${baseUrl}/artisans?category=${skill}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Category + location combos (top 5 skills × top 5 cities)
  const topSkills = SKILL_TYPES.slice(0, 5);
  const topCities = MAJOR_LOCATIONS.slice(0, 5);
  const comboPages: MetadataRoute.Sitemap = topSkills.flatMap((skill) =>
    topCities.map((city) => ({
      url: `${baseUrl}/artisans?category=${skill}&location=${city}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  );

  // Dynamic artisan profile pages (fetch from API, with fallback)
  let artisanPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_URL}/workers/search?page=0&size=500`, {
      next: { revalidate: 86400 },
    });
    if (res.ok) {
      const data = await res.json();
      const workers = data.content || data || [];
      artisanPages = workers.map((w: { id: number; updatedAt?: string }) => ({
        url: `${baseUrl}/artisans/${w.id}`,
        lastModified: w.updatedAt ? new Date(w.updatedAt) : now,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
    }
  } catch {
    // API unavailable at build time — skip dynamic pages
  }

  return [...staticPages, ...categoryPages, ...comboPages, ...artisanPages];
}
