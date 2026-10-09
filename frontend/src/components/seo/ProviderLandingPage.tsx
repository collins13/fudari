import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProviderCard from '@/components/ProviderCard';
import { profileImageFor } from '@/lib/avatar';
import { providerPath, absolute } from '@/lib/seoUrls';
import { skillLabel } from '@/lib/kenya';
import type { ServiceWorker } from '@/lib/services';
import type { LocationTaxonomy, SkillTaxonomy } from '@/lib/taxonomy';

export type Crumb = { name: string; href: string };
export type LinkRef = { label: string; href: string; count?: number };
export type Faq = { q: string; a: string };

type Props = {
  skill: SkillTaxonomy;
  location?: LocationTaxonomy | null;
  area?: LocationTaxonomy | null;
  workers: ServiceWorker[];
  canonical: string;
  crumbs: Crumb[];
  relatedSkills: LinkRef[];
  relatedLocations: LinkRef[];
  childAreas?: LinkRef[];
  faqs: Faq[];
  /** Shown when there is no supply, so the page is useful rather than blank. */
  fallbackLinks?: LinkRef[];
};

function placeName(location?: LocationTaxonomy | null, area?: LocationTaxonomy | null): string {
  if (area && location) return `${area.name}, ${location.name}`;
  if (location) return location.name;
  return 'Kenya';
}

export function buildHeading(skill: SkillTaxonomy, location?: LocationTaxonomy | null, area?: LocationTaxonomy | null): string {
  return `${skill.pluralName} in ${placeName(location, area)}`;
}

/**
 * Intro copy is assembled from live counts and the real areas providers cover,
 * so two locations never share the same paragraph.
 */
export function buildIntro(
  skill: SkillTaxonomy,
  workers: ServiceWorker[],
  location?: LocationTaxonomy | null,
  area?: LocationTaxonomy | null,
): string {
  const place = placeName(location, area);
  if (workers.length === 0) {
    return `No ${skill.pluralName.toLowerCase()} are listed in ${place} yet. Try a nearby area, or browse other services below.`;
  }

  const verified = workers.filter((worker) => worker.isVerified === true).length;
  const jobs = workers.reduce((sum, w) => sum + (w.totalJobsCompleted || 0), 0);
  const reviews = workers.reduce((sum, w) => sum + (w.totalReviews || 0), 0);
  const availableNow = workers.filter((w) => w.availableNow).length;
  const areas = Array.from(
    new Set(workers.map((w) => w.area || w.town).filter((value): value is string => Boolean(value))),
  ).slice(0, 4);

  const parts = [
    `${workers.length} ${workers.length === 1 ? skill.name.toLowerCase() : skill.pluralName.toLowerCase()} available in ${place} on Fudari.`,
  ];
  if (areas.length > 1) parts.push(`Covering ${areas.slice(0, -1).join(', ')} and ${areas[areas.length - 1]}.`);
  if (verified) parts.push(`${verified} ID-verified.`);
  if (availableNow) parts.push(`${availableNow} available right now.`);
  if (jobs) parts.push(`${jobs} jobs completed through the platform.`);
  if (reviews) parts.push(`${reviews} customer reviews.`);
  parts.push('Compare profiles, agree a price up front and pay on completion.');
  return parts.join(' ');
}

function LinkBlock({ title, links }: { title: string; links: LinkRef[] }) {
  if (links.length === 0) return null;
  return (
    <div className="col-md-6 col-lg-4 mb-4">
      <h3 className="h6 fw-bold mb-2">{title}</h3>
      <ul className="list-unstyled mb-0 small">
        {links.map((link) => (
          <li className="mb-1" key={link.href}>
            <Link href={link.href}>{link.label}</Link>
            {typeof link.count === 'number' && <span className="text-muted ms-1">({link.count})</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ProviderLandingPage({
  skill,
  location,
  area,
  workers,
  canonical,
  crumbs,
  relatedSkills,
  relatedLocations,
  childAreas = [],
  faqs,
  fallbackLinks = [],
}: Props) {
  const heading = buildHeading(skill, location, area);
  const intro = buildIntro(skill, workers, location, area);
  const place = placeName(location, area);
  const geoSource = area || location;

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'CollectionPage',
      name: heading,
      url: canonical,
      description: intro,
      isPartOf: { '@id': absolute('/#website') },
      about: {
        '@type': 'Service',
        name: heading,
        serviceType: skill.name,
        provider: { '@id': absolute('/#organization') },
        areaServed: location
          ? {
              '@type': 'Place',
              name: place,
              address: { '@type': 'PostalAddress', addressLocality: place, addressCountry: 'KE' },
              ...(geoSource?.latitude && geoSource?.longitude
                ? { geo: { '@type': 'GeoCoordinates', latitude: geoSource.latitude, longitude: geoSource.longitude } }
                : {}),
            }
          : { '@type': 'Country', name: 'Kenya' },
      },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: absolute(crumb.href),
      })),
    },
  ];

  if (workers.length > 0) {
    graph.push({
      '@type': 'ItemList',
      numberOfItems: workers.length,
      itemListElement: workers.slice(0, 20).map((worker, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: absolute(providerPath(worker)),
        name: `${worker.firstName} ${worker.lastName}`,
      })),
    });
  }

  // FAQPage only when the questions are actually rendered below.
  if (faqs.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: { '@type': 'Answer', text: faq.a },
      })),
    });
  }

  const jsonLd = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');

  return (
    <>
      <Navbar />
      <main>
        <section className="bg-light py-4 py-lg-5">
          <div className="container">
            <nav aria-label="Breadcrumb" className="small mb-3">
              {crumbs.map((crumb, index) => (
                <span key={crumb.href}>
                  {index > 0 && <span className="mx-2 text-muted">/</span>}
                  {index === crumbs.length - 1 ? (
                    <span aria-current="page">{crumb.name}</span>
                  ) : (
                    <Link href={crumb.href}>{crumb.name}</Link>
                  )}
                </span>
              ))}
            </nav>
            <div className="row justify-content-center">
              <div className="col-lg-8">
                <h1 className="display-5 fw-bold mb-3">{heading}</h1>
                <p className="lead text-muted mb-0">{intro}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-5">
          <div className="container">
            {workers.length > 0 ? (
              <>
                <h2 className="h3 fw-bold mb-4">
                  {workers.length} {workers.length === 1 ? 'provider' : 'providers'} in {place}
                </h2>
                <div className="row g-3">
                  {workers.slice(0, 24).map((worker) => (
                    <div className="col-md-6 col-lg-4" key={worker.id}>
                      <ProviderCard
                        variant="compact"
                        provider={{
                          name: `${worker.firstName} ${worker.lastName}`,
                          href: providerPath(worker),
                          image: profileImageFor(worker.profileImage, `${worker.firstName} ${worker.lastName}`, worker.id),
                          skill: worker.skills?.[0]?.skillType ? skillLabel(worker.skills[0].skillType) : skill.name,
                          location: worker.area || worker.town || worker.locationName || 'Kenya',
                          price: worker.skills?.[0]?.hourlyRate ? Number(worker.skills[0].hourlyRate) : undefined,
                          rating: worker.trustScore,
                          reviews: worker.totalReviews,
                          jobs: worker.totalJobsCompleted,
                          availableNow: worker.availableNow,
                          verified: worker.isVerified === true,
                          services: worker.skills?.[0]?.services?.map((service) => service.name),
                        }}
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="border bg-light p-4">
                <h2 className="h4 fw-bold mb-2">
                  No {skill.pluralName.toLowerCase()} listed in {place} yet
                </h2>
                <p className="text-muted mb-3">
                  We are still onboarding providers here. These are the closest options right now.
                </p>
                <ul className="list-inline mb-0">
                  {fallbackLinks.map((link) => (
                    <li className="list-inline-item me-3 mb-2" key={link.href}>
                      <Link href={link.href} className="btn btn-sm btn-outline-primary rounded-5">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {faqs.length > 0 && (
          <section className="py-5 bg-white border-top">
            <div className="container">
              <div className="row justify-content-center">
                <div className="col-lg-8">
                  <h2 className="h3 fw-bold mb-4">Common questions</h2>
                  {faqs.map((faq) => (
                    <div className="mb-4" key={faq.q}>
                      <h3 className="h6 fw-bold mb-1">{faq.q}</h3>
                      <p className="text-muted mb-0">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="py-5 bg-light">
          <div className="container">
            <div className="row">
              <LinkBlock title={`${skill.pluralName} in other areas`} links={relatedLocations} />
              <LinkBlock title={location ? `Other services in ${location.name}` : 'Related services'} links={relatedSkills} />
              <LinkBlock title={location ? `Areas in ${location.name}` : 'Popular areas'} links={childAreas} />
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </>
  );
}
