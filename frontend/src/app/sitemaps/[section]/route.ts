import type { MetadataRoute } from 'next';
import { notFound } from 'next/navigation';
import {
  estateEntries,
  locationEntries,
  providerEntries,
  serviceEntries,
  serviceLocationEntries,
  skillEntries,
  staticEntries,
} from '@/lib/sitemapSources';

export const dynamic = 'force-dynamic';

const SECTIONS: Record<string, () => Promise<MetadataRoute.Sitemap>> = {
  static: staticEntries,
  skills: skillEntries,
  locations: locationEntries,
  services: serviceEntries,
  'service-locations': serviceLocationEntries,
  providers: providerEntries,
  estates: estateEntries,
};

function toXml(entries: MetadataRoute.Sitemap): string {
  const urls = entries
    .map((entry) => {
      const lastMod = entry.lastModified
        ? new Date(entry.lastModified).toISOString()
        : new Date().toISOString();
      return `  <url>
    <loc>${entry.url}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>${entry.changeFrequency ?? 'weekly'}</changefreq>
    <priority>${(entry.priority ?? 0.5).toFixed(2)}</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const name = section.replace(/\.xml$/, '');
  const source = SECTIONS[name];
  if (!source) notFound();

  return new Response(toXml(await source()), {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  });
}
