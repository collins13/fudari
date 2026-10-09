import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seoUrls';

/**
 * Generated rather than static so the sitemap index stays in sync with the host.
 * CSS, JS and images are deliberately left crawlable — blocking them breaks
 * Google's mobile rendering check.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/artisans/', '/artisan/', '/services/', '/locations/', '/estate/'],
        disallow: [
          '/api/',
          // Filter URLs duplicate the landing pages and canonicalise away.
          '/artisans?',
          '/*?tab=',
          '/*?skill=',
          '/*?category=',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
