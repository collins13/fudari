import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { absolute, locationPath, skillLocationPath } from '@/lib/seoUrls';
import {
  getLocation,
  getLocationChildren,
  getSkillLocationCounts,
  getSkills,
  MIN_PROVIDERS_FOR_INDEX,
} from '@/lib/taxonomy';

// Must be a literal: Next rejects imported constants in segment config.
export const revalidate = 600;

type PageProps = { params: Promise<{ countySlug: string }> };

async function load(countySlug: string) {
  const location = await getLocation(countySlug);
  if (!location) return null;

  const [counts, skills, children] = await Promise.all([
    getSkillLocationCounts(),
    getSkills(),
    getLocationChildren(countySlug),
  ]);

  const here = counts.filter((entry) => entry.locationSlug === countySlug);
  const bySkill = new Map(here.map((entry) => [entry.skillSlug, entry.providerCount]));
  const available = skills
    .filter((skill) => bySkill.has(skill.slug))
    .map((skill) => ({ skill, count: bySkill.get(skill.slug) || 0 }))
    .sort((a, b) => b.count - a.count);

  const skillBySlug = new Map(skills.map((skill) => [skill.slug, skill]));
  const childLinks = children.map((child) => {
    if (child.type === 'TOWN') return { child, href: locationPath(child.slug) };

    const bestAreaCount = counts
      .filter((entry) =>
        entry.locationType === 'AREA' &&
        entry.locationSlug === child.slug &&
        entry.providerCount >= MIN_PROVIDERS_FOR_INDEX,
      )
      .sort((a, b) => b.providerCount - a.providerCount)[0];
    const areaSkill = bestAreaCount ? skillBySlug.get(bestAreaCount.skillSlug) : null;
    const parentSlug = bestAreaCount?.parentSlug || child.parentSlug;

    return {
      child,
      href: areaSkill && parentSlug
        ? skillLocationPath(areaSkill.slug, parentSlug, child.slug)
        : null,
    };
  });

  const totalProviders = location.providerCount || 0;
  return { location, available, childLinks, totalProviders };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { countySlug } = await params;
  const data = await load(countySlug);
  if (!data) return { robots: { index: false, follow: false } };

  const { location, available, totalProviders } = data;
  const title = location.seoTitle || `Fundis & Service Providers in ${location.name} | Fudari`;
  const description =
    location.seoDescription ||
    `Find verified fundis and service providers in ${location.name}. ${totalProviders} providers across ${available.length} services — compare ratings, availability and price, then book directly.`;
  const canonical = absolute(locationPath(location.slug));

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website' },
    ...(location.latitude && location.longitude
      ? {
          other: {
            'geo.region': 'KE',
            'geo.placename': location.name,
            'geo.position': `${location.latitude};${location.longitude}`,
          },
        }
      : {}),
    ...(totalProviders >= MIN_PROVIDERS_FOR_INDEX && location.indexable !== false
      ? {}
      : { robots: { index: false, follow: true } }),
  };
}

export default async function LocationHubPage({ params }: PageProps) {
  const { countySlug } = await params;
  const data = await load(countySlug);
  if (!data) notFound();

  const { location, available, childLinks, totalProviders } = data;
  const canonical = absolute(locationPath(location.slug));

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: `Fundis and service providers in ${location.name}`,
        url: canonical,
        isPartOf: { '@id': absolute('/#website') },
        about: {
          '@type': 'Place',
          name: location.name,
          address: { '@type': 'PostalAddress', addressLocality: location.name, addressCountry: 'KE' },
          ...(location.latitude && location.longitude
            ? { geo: { '@type': 'GeoCoordinates', latitude: location.latitude, longitude: location.longitude } }
            : {}),
        },
      },
      {
        '@type': 'ItemList',
        numberOfItems: available.length,
        itemListElement: available.slice(0, 25).map((entry, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: `${entry.skill.pluralName} in ${location.name}`,
          url: absolute(skillLocationPath(entry.skill.slug, location.slug)),
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: absolute('/') },
          { '@type': 'ListItem', position: 2, name: 'Locations', item: absolute('/locations') },
          { '@type': 'ListItem', position: 3, name: location.name, item: canonical },
        ],
      },
    ],
  }).replace(/</g, '\\u003c');

  return (
    <>
      <Navbar />
      <main>
        <section className="bg-light py-4 py-lg-5">
          <div className="container">
            <nav aria-label="Breadcrumb" className="small mb-3">
              <Link href="/">Home</Link><span className="mx-2 text-muted">/</span>
              <Link href="/locations">Locations</Link><span className="mx-2 text-muted">/</span>
              <span aria-current="page">{location.name}</span>
            </nav>
            <div className="row justify-content-center">
              <div className="col-lg-8">
                <h1 className="display-5 fw-bold mb-3">Find Fundis and Service Providers in {location.name}</h1>
                <p className="lead text-muted mb-0">
                  {location.description ||
                    (totalProviders
                      ? `${totalProviders} verified providers across ${available.length} services in ${location.name}. Compare ratings and availability, agree a price up front and pay on completion.`
                      : `We are still onboarding providers in ${location.name}. Browse services below or check a nearby county.`)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-5">
          <div className="container">
            {available.length > 0 ? (
              <>
                <h2 className="h3 fw-bold mb-4">Services available in {location.name}</h2>
                <div className="row g-3">
                  {available.map(({ skill, count }) => (
                    <div className="col-md-6 col-lg-4" key={skill.slug}>
                      <article className="border h-100 p-3">
                        <h3 className="h6 mb-1">
                          <Link href={skillLocationPath(skill.slug, location.slug)}>
                            {skill.pluralName} in {location.name}
                          </Link>
                        </h3>
                        <p className="text-muted small mb-0">
                          {count} {count === 1 ? 'provider' : 'providers'}
                        </p>
                      </article>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="border bg-light p-4">
                <p className="mb-3">No providers are listed in {location.name} yet.</p>
                <Link href="/locations" className="btn btn-outline-primary rounded-5">Browse other counties</Link>
              </div>
            )}
          </div>
        </section>

        {childLinks.length > 0 && (
          <section className="py-5 bg-light">
            <div className="container">
              <h2 className="h4 fw-bold mb-3">Towns and areas in {location.name}</h2>
              <ul className="list-inline mb-0">
                {childLinks.map(({ child, href }) => (
                  <li className="list-inline-item me-3 mb-2" key={child.slug}>
                    {href ? <Link href={href}>{child.name}</Link> : <span>{child.name}</span>}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </>
  );
}
