import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import ProviderLandingPage, { buildIntro, type Faq, type LinkRef } from '@/components/seo/ProviderLandingPage';
import { absolute, skillLocationPath, skillPath, providerPath } from '@/lib/seoUrls';
import {
  getProviders,
  getSkill,
  getSkillLocationCounts,
  getSkills,
  isIndexable,
  resolveSkillSynonym,
  MIN_PROVIDERS_FOR_INDEX,
} from '@/lib/taxonomy';
import { serverGet } from '@/lib/serverApi';
import type { ServiceWorker } from '@/lib/services';

// Must be a literal: Next rejects imported constants in segment config.
export const revalidate = 600;

type PageProps = { params: Promise<{ skillSlug: string }> };

/**
 * This segment used to be the provider id (/artisans/42). Those URLs now live at
 * /artisan/{slug}-{id}, so a numeric segment permanently redirects.
 */
async function redirectLegacyProvider(slug: string): Promise<never | void> {
  if (!/^\d+$/.test(slug)) return;
  const worker = await serverGet<ServiceWorker>(`/workers/${slug}`, { revalidate: 3600 });
  if (!worker) notFound();
  permanentRedirect(providerPath(worker));
}

async function load(skillSlug: string) {
  const skill = await getSkill(skillSlug);
  if (!skill) return null;
  const workers = await getProviders(skill.skillType);
  return { skill, workers };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { skillSlug } = await params;
  const data = await load(skillSlug);
  if (!data) return { robots: { index: false, follow: false } };

  const { skill, workers } = data;
  const title = `${skill.pluralName} in Kenya | Find Trusted ${skill.pluralName} | Fudari`;
  const description = buildIntro(skill, workers).slice(0, 300);
  const canonical = absolute(skillPath(skill.slug));

  return {
    title,
    description,
    keywords: skill.keywords,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
    ...(isIndexable(workers, skill.indexable) ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function SkillPage({ params }: PageProps) {
  const { skillSlug } = await params;

  await redirectLegacyProvider(skillSlug);

  // Synonyms and Swahili phrases fold into the canonical skill page.
  const canonicalSlug = await resolveSkillSynonym(skillSlug);
  if (canonicalSlug && canonicalSlug !== skillSlug) permanentRedirect(skillPath(canonicalSlug));

  const data = await load(skillSlug);
  if (!data) notFound();
  const { skill, workers } = data;

  const [counts, allSkills] = await Promise.all([getSkillLocationCounts(), getSkills()]);

  const relatedLocations: LinkRef[] = counts
    .filter((entry) => entry.skillSlug === skill.slug && entry.providerCount >= MIN_PROVIDERS_FOR_INDEX)
    .sort((a, b) => b.providerCount - a.providerCount)
    .slice(0, 12)
    .map((entry) => ({
      label: `${skill.pluralName} in ${entry.locationName}`,
      href: skillLocationPath(skill.slug, entry.locationSlug),
      count: entry.providerCount,
    }));

  const relatedSkills: LinkRef[] = allSkills
    .filter((other) => other.slug !== skill.slug && (other.providerCount || 0) > 0)
    .sort((a, b) => (b.providerCount || 0) - (a.providerCount || 0))
    .slice(0, 10)
    .map((other) => ({ label: other.pluralName, href: skillPath(other.slug) }));

  const swahili = skill.swahiliKeywords?.[0];
  const faqs: Faq[] = [
    {
      q: `How do I find a ${skill.name.toLowerCase()} on Fudari?`,
      a: `Search by service and location, compare providers by rating, reviews and availability, then contact them directly. You do not need an account to search or to contact a provider.`,
    },
    {
      q: `Are ${skill.pluralName.toLowerCase()} on Fudari verified?`,
      a: `Providers marked Verified or Pro have submitted a national ID and a Certificate of Good Conduct, which an admin has checked. Standard providers have not completed that process yet.`,
    },
    {
      q: `How much do ${skill.pluralName.toLowerCase()} charge in Kenya?`,
      a: `Rates vary by job, location and materials. Many providers publish a starting hourly rate on their profile, but agree the full price with them before work begins.`,
    },
    ...(swahili
      ? [{
          q: `Naweza kupata ${swahili} hapa?`,
          a: `Ndio. ${skill.pluralName} kwenye Fudari wanapatikana kote Kenya. Tafuta kwa eneo lako, angalia ratings na uwasiliane nao moja kwa moja.`,
        }]
      : []),
  ];

  return (
    <ProviderLandingPage
      skill={skill}
      workers={workers}
      canonical={absolute(skillPath(skill.slug))}
      crumbs={[
        { name: 'Home', href: '/' },
        { name: 'Artisans', href: '/artisans' },
        { name: skill.pluralName, href: skillPath(skill.slug) },
      ]}
      relatedLocations={relatedLocations}
      relatedSkills={relatedSkills}
      faqs={faqs}
      fallbackLinks={relatedSkills.slice(0, 5)}
    />
  );
}
