import HomeClient, { type HomeInitialData } from './HomeClient';
import { serverGet } from '@/lib/serverApi';
import {
  FEATURED_ARTISAN_LIMIT,
  toCategoryItem,
  toFeaturedArtisan,
  type PlatformStats,
} from '@/lib/homeData';

// Categories and featured pros are fetched here rather than in the browser so the
// HTML crawlers receive contains real trade names and provider listings.
export const revalidate = 600;

const FAQ = [
  {
    q: 'Do I need an account to book?',
    a: 'No. Search, compare and book as a guest with just your phone number. Creating an account only adds booking history and saved details.',
  },
  {
    q: 'When do I pay, and how?',
    a: 'After the work is done, by M-Pesa or cash. FUDARI charges customers no booking fee, and the price is whatever you and the provider agreed before work started.',
  },
  {
    q: 'How do I know the right person turned up?',
    a: 'Each booking issues you a start PIN and a completion PIN. You give the start PIN when the provider arrives and the completion PIN only when you are satisfied, so the job cannot be marked done without you.',
  },
  {
    q: 'What if something goes wrong?',
    a: 'Raise a dispute from the booking and our team reviews it. Ratings and reviews are tied to completed jobs, so poor work follows a provider and good work is rewarded.',
  },
  {
    q: 'Can I check a job I already booked?',
    a: 'Yes — use your booking code on the job tracking page to see status without signing in.',
  },
  {
    q: 'I want to offer my services. What does it cost?',
    a: 'Listing is free to start. Paid tiers add more listings, better search placement and analytics.',
  },
];

export default async function Home() {
  const [categoriesRes, workersRes, statsRes] = await Promise.all([
    serverGet<unknown[]>('/categories/stats', { revalidate }),
    serverGet<unknown[]>('/workers/search', { revalidate }),
    serverGet<PlatformStats>('/categories/platform-stats', { revalidate }),
  ]);

  const initial: HomeInitialData = {
    categories: (categoriesRes || []).map(toCategoryItem),
    artisans: (workersRes || []).slice(0, FEATURED_ARTISAN_LIMIT).map(toFeaturedArtisan),
    stats: statsRes,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            '@id': 'https://fudari.co/#faq',
            mainEntity: FAQ.map(({ q, a }) => ({
              '@type': 'Question',
              name: q,
              acceptedAnswer: { '@type': 'Answer', text: a },
            })),
          }),
        }}
      />
      <HomeClient initial={initial} />
    </>
  );
}
