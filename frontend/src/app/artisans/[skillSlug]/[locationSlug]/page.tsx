import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import ProviderLandingPage, { buildIntro, type Faq, type LinkRef } from '@/components/seo/ProviderLandingPage';
import { absolute, locationPath, skillLocationPath, skillPath } from '@/lib/seoUrls';
import {
  getLocation,
  getLocationChildren,
  getProviders,
  getSkill,
  getSkillLocationCounts,
  getSkills,
  isIndexable,
  resolveSkillSynonym,
  MIN_PROVIDERS_FOR_INDEX,
} from '@/lib/taxonomy';

// Must be a literal: Next rejects imported constants in segment config.
export const revalidate = 600;

type PageProps = { params: Promise<{ skillSlug: string; locationSlug: string }> };

async function load(skillSlug: string, locationSlug: string) {
  const [skill, location] = await Promise.all([getSkill(skillSlug), getLocation(locationSlug)]);
  if (!skill || !location) return null;

  const filter = location.type === 'COUNTY' ? { county: location.name } : { town: location.name };
  const workers = await getProviders(skill.skillType, filter);
  return { skill, location, workers };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { skillSlug, locationSlug } = await params;
  const data = await load(skillSlug, locationSlug);
  if (!data) return { robots: { index: false, follow: false } };

  const { skill, location, workers } = data;
  const title =
    skill.seoTitleTemplate
      ?.replace('{plural}', skill.pluralName)
      .replace('{skill}', skill.name)
      .replace('{location}', location.name) || `${skill.pluralName} in ${location.name} | Fudari`;
  const description =
    skill.seoDescriptionTemplate
      ?.replace(/{plural_lower}/g, skill.pluralName.toLowerCase())
      .replace(/{plural}/g, skill.pluralName)
      .replace(/{location}/g, location.name) || buildIntro(skill, workers, location).slice(0, 300);

  const canonical = absolute(skillLocationPath(skill.slug, location.slug));
  const indexable = isIndexable(workers, skill.indexable !== false && location.indexable !== false);

  return {
    title,
    description,
    keywords: skill.keywords?.map((keyword) => `${keyword} ${location.name.toLowerCase()}`),
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
    ...(location.latitude && location.longitude
      ? { other: { 'geo.region': 'KE', 'geo.placename': location.name, 'geo.position': `${location.latitude};${location.longitude}` } }
      : {}),
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function SkillLocationPage({ params }: PageProps) {
  const { skillSlug, locationSlug } = await params;

  const canonicalSlug = await resolveSkillSynonym(skillSlug);
  if (canonicalSlug && canonicalSlug !== skillSlug) {
    permanentRedirect(skillLocationPath(canonicalSlug, locationSlug));
  }

  const data = await load(skillSlug, locationSlug);
  if (!data) notFound();
  const { skill, location, workers } = data;

  const [counts, allSkills, children] = await Promise.all([
    getSkillLocationCounts(),
    getSkills(),
    getLocationChildren(location.slug),
  ]);

  const relatedLocations: LinkRef[] = counts
    .filter(
      (entry) =>
        entry.skillSlug === skill.slug &&
        entry.locationType !== 'AREA' &&
        entry.locationSlug !== location.slug &&
        entry.providerCount >= MIN_PROVIDERS_FOR_INDEX,
    )
    .sort((a, b) => b.providerCount - a.providerCount)
    .slice(0, 10)
    .map((entry) => ({
      label: `${skill.pluralName} in ${entry.locationName}`,
      href: skillLocationPath(skill.slug, entry.locationSlug),
      count: entry.providerCount,
    }));

  const skillsHere = new Set(counts.filter((entry) => entry.locationSlug === location.slug).map((e) => e.skillSlug));
  const relatedSkills: LinkRef[] = allSkills
    .filter((other) => other.slug !== skill.slug && skillsHere.has(other.slug))
    .slice(0, 10)
    .map((other) => ({
      label: `${other.pluralName} in ${location.name}`,
      href: skillLocationPath(other.slug, location.slug),
    }));

  const childAreas: LinkRef[] = children
    .filter((child) => child.type !== 'COUNTY')
    .slice(0, 12)
    .map((child) => ({
      label: `${skill.pluralName} in ${child.name}`,
      href: skillLocationPath(skill.slug, location.slug, child.slug),
    }));

  const rates = workers
    .map((worker) => Number(worker.skills?.[0]?.hourlyRate))
    .filter((rate) => Number.isFinite(rate) && rate > 0);
  const swahili = skill.swahiliKeywords?.[0];

  const faqs: Faq[] = [
    {
      q: `How many ${skill.pluralName.toLowerCase()} are available in ${location.name}?`,
      a: workers.length
        ? `${workers.length} ${workers.length === 1 ? 'provider is' : 'providers are'} currently listed in ${location.name}, ${workers.filter((w) => w.vettingLevel === 'VERIFIED' || w.vettingLevel === 'PRO').length} of them ID-verified.`
        : `None are listed in ${location.name} yet. Nearby areas are linked below.`,
    },
    ...(rates.length
      ? [{
          q: `What do ${skill.pluralName.toLowerCase()} charge in ${location.name}?`,
          a: `Published starting rates in ${location.name} range from KES ${Math.min(...rates).toLocaleString()} to KES ${Math.max(...rates).toLocaleString()} per hour. Final price depends on the job and materials, so agree it before work starts.`,
        }]
      : []),
    {
      q: `Can I book a ${skill.name.toLowerCase()} in ${location.name} without an account?`,
      a: `Yes. You can search, view profiles and contact a provider in ${location.name} without signing up. An account is only needed to track a booking history.`,
    },
    ...(swahili
      ? [{
          q: `Nataka ${swahili} ${location.name}. Nifanyeje?`,
          a: `Angalia orodha hapo juu, chagua mtaalamu unayemtaka ${location.name}, kisha wasiliana naye moja kwa moja. Kubaliana bei kabla kazi kuanza.`,
        }]
      : []),
  ];

  return (
    <ProviderLandingPage
      skill={skill}
      location={location}
      workers={workers}
      canonical={absolute(skillLocationPath(skill.slug, location.slug))}
      crumbs={[
        { name: 'Home', href: '/' },
        { name: 'Artisans', href: '/artisans' },
        { name: skill.pluralName, href: skillPath(skill.slug) },
        { name: location.name, href: skillLocationPath(skill.slug, location.slug) },
      ]}
      relatedLocations={relatedLocations}
      relatedSkills={relatedSkills}
      childAreas={childAreas}
      faqs={faqs}
      fallbackLinks={[
        ...relatedLocations.slice(0, 3),
        { label: `All services in ${location.name}`, href: locationPath(location.countySlug || location.slug) },
        { label: `${skill.pluralName} across Kenya`, href: skillPath(skill.slug) },
      ]}
    />
  );
}
