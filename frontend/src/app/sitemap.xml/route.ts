import { SITE_URL } from '@/lib/seoUrls';

/**
 * Sitemap index. Kept split by entity so no single file approaches the 50,000-URL
 * limit as supply grows, and so Search Console reports coverage per page type.
 */
export const dynamic = 'force-dynamic';

const SECTIONS = ['static', 'skills', 'locations', 'services', 'service-locations', 'providers', 'estates'];

export async function GET() {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SECTIONS.map(
  (section) => `  <sitemap>
    <loc>${SITE_URL}/sitemaps/${section}.xml</loc>
  </sitemap>`,
).join('\n')}
</sitemapindex>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  });
}
