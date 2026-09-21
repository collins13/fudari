import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProviderLandingPage, { buildIntro, type Faq, type LinkRef } from '@/components/seo/ProviderLandingPage';
import { absolute, locationPath, skillLocationPath, skillPath } from '@/lib/seoUrls';
import {
  getArea,
  getLocation,
  getLocationChildren,
  getProviders,
  getSkill,
  getSkills,
  isIndexable,
} from '@/lib/taxonomy';

// Must be a literal: Next rejects imported constants in segment config.
export const revalidate = 600;

type PageProps = { params: Promise<{ skillSlug: string; locationSlug: string; areaSlug: string }> };

async function load(skillSlug: string, locationSlug: string, areaSlug: string) {
  const [skill, location, area] = await Promise.all([
    getSkill(skillSlug),
    getLocation(locationSlug),
    getArea(locationSlug, areaSlug),
  ]);
  if (!skill || !location || !area) return null;

  const workers = await getProviders(skill.skillType, { area: area.name });
  return { skill, location, area, workers };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { skillSlug, locationSlug, areaSlug } = await params;
  const data = await load(skillSlug, locationSlug, areaSlug);
  if (!data) return { robots: { index: false, follow: false } };

  const { skill, location, area, workers } = data;
  const title = `${skill.pluralName} in ${area.name}, ${location.name} | Fudari`;
  const description = buildIntro(skill, workers, location, area).slice(0, 300);
  const canonical = absolute(skillLocationPath(skill.slug, location.slug, area.slug));
  const indexable = isIndexable(workers, skill.indexable !== false && area.indexable !== false);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website' },
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function SkillAreaPage({ params }: PageProps) {
  const { skillSlug, locationSlug, areaSlug } = await params;
  const data = await load(skillSlug, locationSlug, areaSlug);
  if (!data) notFound();

  const { skill, location, area, workers } = data;
  const [siblings, allSkills] = await Promise.all([getLocationChildren(location.slug), getSkills()]);

  const relatedLocations: LinkRef[] = siblings
    .filter((sibling) => sibling.slug !== area.slug && sibling.type === 'AREA')
    .slice(0, 12)
    .map((sibling) => ({
      label: `${skill.pluralName} in ${sibling.name}`,
      href: skillLocationPath(skill.slug, location.slug, sibling.slug),
    }));

  const relatedSkills: LinkRef[] = allSkills
    .filter((other) => other.slug !== skill.slug && (other.providerCount || 0) > 0)
    .slice(0, 10)
    .map((other) => ({
      label: `${other.pluralName} in ${area.name}`,
      href: skillLocationPath(other.slug, location.slug, area.slug),
    }));

  const faqs: Faq[] = [
    {
      q: `Do ${skill.pluralName.toLowerCase()} cover ${area.name}?`,
      a: workers.length
        ? `${workers.length} ${workers.length === 1 ? 'provider lists' : 'providers list'} ${area.name} as their service area. Many others in ${location.name} will travel here — check each profile's service radius.`
        : `No provider currently lists ${area.name} specifically, but ${skill.pluralName.toLowerCase()} elsewhere in ${location.name} often cover it. Try the ${location.name} page below.`,
    },
    {
      q: `How quickly can a ${skill.name.toLowerCase()} reach ${area.name}?`,
      a: `Providers showing "available now" have confirmed availability within the last 8 hours. Travel time depends on where in ${location.name} they are based and on traffic.`,
    },
  ];

  return (
    <ProviderLandingPage
      skill={skill}
      location={location}
      area={area}
      workers={workers}
      canonical={absolute(skillLocationPath(skill.slug, location.slug, area.slug))}
      crumbs={[
        { name: 'Home', href: '/' },
        { name: 'Artisans', href: '/artisans' },
        { name: skill.pluralName, href: skillPath(skill.slug) },
        { name: location.name, href: skillLocationPath(skill.slug, location.slug) },
        { name: area.name, href: skillLocationPath(skill.slug, location.slug, area.slug) },
      ]}
      relatedLocations={relatedLocations}
      relatedSkills={relatedSkills}
      faqs={faqs}
      fallbackLinks={[
        { label: `${skill.pluralName} in ${location.name}`, href: skillLocationPath(skill.slug, location.slug) },
        { label: `All services in ${location.name}`, href: locationPath(location.countySlug || location.slug) },
        ...relatedLocations.slice(0, 3),
      ]}
    />
  );
}
