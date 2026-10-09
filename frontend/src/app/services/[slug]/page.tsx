import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { absolute, servicePath, skillPath, skillLocationPath, providerPath } from '@/lib/seoUrls';
import { skillLabel } from '@/lib/kenya';
import { groupByLocation, MIN_INDEXABLE_PROVIDERS } from '@/lib/locations';
import { getOfferingWorkers, getServiceOfferings } from '@/lib/services';
import { getSkills } from '@/lib/taxonomy';
import { serverGet } from '@/lib/serverApi';

// Must be a literal: Next rejects imported constants in segment config.
export const revalidate = 600;

type PageProps = { params: Promise<{ slug: string }> };

type LegacyCategory = { slug?: string; skillTypes?: string[]; isActive?: boolean };

/**
 * The taxonomy used to live at /services/{category}. Those slugs now 301 to the
 * equivalent skill page so nothing that was crawled dead-ends.
 */
async function redirectLegacyCategory(slug: string): Promise<never | void> {
  const categories = await serverGet<LegacyCategory[]>('/categories/stats', { revalidate: 600 });
  const category = categories?.find((candidate) => candidate.slug === slug);
  const primarySkill = category?.skillTypes?.[0];
  if (!primarySkill) return;

  const skill = (await getSkills()).find((candidate) => candidate.skillType === primarySkill);
  if (skill) permanentRedirect(skillPath(skill.slug));
}

async function load(slug: string) {
  const offering = (await getServiceOfferings()).find((candidate) => candidate.slug === slug);
  if (!offering || offering.isActive === false) return null;
  const workers = await getOfferingWorkers(offering.slug);
  return { offering, workers };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) return { robots: { index: false, follow: false } };

  const { offering, workers } = data;
  const title = offering.seoTitle || `${offering.name} in Kenya | Fudari`;
  const price =
    offering.priceFromKes && offering.priceToKes
      ? ` Typical cost KES ${offering.priceFromKes.toLocaleString()}–${offering.priceToKes.toLocaleString()}.`
      : '';
  const description =
    offering.seoDescription ||
    `${workers.length} providers offer ${offering.name.toLowerCase()} on Fudari.${price} Compare profiles, ratings and availability, then contact a provider directly.`;

  return {
    title,
    description,
    alternates: { canonical: absolute(servicePath(offering.slug)) },
    openGraph: {
      title,
      description,
      url: absolute(servicePath(offering.slug)),
      type: 'website',
      images: ['/liston/images/header/lg-01.jpg'],
    },
    ...(workers.length >= MIN_INDEXABLE_PROVIDERS && offering.indexable !== false
      ? {}
      : { robots: { index: false, follow: true } }),
  };
}

export default async function ServicePage({ params }: PageProps) {
  const { slug } = await params;

  const data = await load(slug);
  if (!data) {
    await redirectLegacyCategory(slug);
    notFound();
  }

  const { offering, workers } = data;
  const canonical = absolute(servicePath(offering.slug));
  const locations = groupByLocation(workers).filter((l) => l.providerCount >= MIN_INDEXABLE_PROVIDERS);
  const skill = (await getSkills()).find((candidate) => candidate.skillType === offering.skillType);

  const priceLine =
    offering.priceFromKes && offering.priceToKes
      ? `Typical cost is KES ${offering.priceFromKes.toLocaleString()}–${offering.priceToKes.toLocaleString()}, depending on the job and materials.`
      : '';
  const intro = workers.length
    ? `${workers.length} verified providers on Fudari offer ${offering.name.toLowerCase()}. ${priceLine} Agree the price up front and pay on completion.`
    : `No providers currently offer ${offering.name.toLowerCase()} on Fudari. ${priceLine}`;

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: `${offering.name} in Kenya`,
        url: canonical,
        description: intro,
        isPartOf: { '@id': absolute('/#website') },
        about: {
          '@type': 'Service',
          name: offering.name,
          serviceType: skillLabel(offering.skillType),
          provider: { '@id': absolute('/#organization') },
          areaServed: { '@type': 'Country', name: 'Kenya' },
          ...(offering.priceFromKes
            ? {
                offers: {
                  '@type': 'AggregateOffer',
                  priceCurrency: 'KES',
                  lowPrice: offering.priceFromKes,
                  highPrice: offering.priceToKes,
                  offerCount: workers.length,
                },
              }
            : {}),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: absolute('/') },
          { '@type': 'ListItem', position: 2, name: 'Services', item: absolute('/services') },
          { '@type': 'ListItem', position: 3, name: offering.name, item: canonical },
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
              <Link href="/services">Services</Link><span className="mx-2 text-muted">/</span>
              <span aria-current="page">{offering.name}</span>
            </nav>
            <div className="row justify-content-center">
              <div className="col-lg-8">
                {offering.isEmergency && <span className="badge bg-danger mb-2">Emergency callout</span>}
                <h1 className="display-5 fw-bold mb-3">{offering.name} in Kenya</h1>
                <p className="lead text-muted mb-0">{offering.description || intro}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-5">
          <div className="container">
            <h2 className="h3 fw-bold mb-4">Providers offering {offering.name.toLowerCase()}</h2>
            {workers.length > 0 ? (
              <div className="row g-3">
                {workers.slice(0, 24).map((worker) => (
                  <div className="col-md-6 col-lg-4" key={worker.id}>
                    <article className="border h-100 p-4 bg-white">
                      <h3 className="h5 mb-2">
                        <Link href={providerPath(worker)}>{worker.firstName} {worker.lastName}</Link>
                      </h3>
                      <p className="text-muted small mb-3">{worker.area || worker.town || worker.locationName || 'Kenya'}</p>
                      <div className="small text-muted">
                        {worker.totalReviews
                          ? `${worker.trustScore?.toFixed(1) || '0.0'} from ${worker.totalReviews} reviews`
                          : worker.totalJobsCompleted
                            ? `${worker.totalJobsCompleted} jobs completed`
                            : 'View profile and availability'}
                      </div>
                    </article>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border bg-light p-4">
                <p className="mb-3">No providers have listed this service yet.</p>
                {skill && (
                  <Link href={skillPath(skill.slug)} className="btn btn-outline-primary rounded-5">
                    Browse all {skill.pluralName.toLowerCase()}
                  </Link>
                )}
              </div>
            )}
          </div>
        </section>

        {(locations.length > 0 || skill) && (
          <section className="py-5 bg-light">
            <div className="container">
              <div className="row">
                {locations.length > 0 && (
                  <div className="col-lg-6 mb-4">
                    <h2 className="h5 fw-bold mb-3">{offering.name} by location</h2>
                    <ul className="list-unstyled small mb-0">
                      {locations.map((location) => (
                        <li className="mb-1" key={location.slug}>
                          <Link href={servicePath(offering.slug, location.slug)}>
                            {offering.name} in {location.name}
                          </Link>
                          <span className="text-muted ms-1">({location.providerCount})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {skill && (
                  <div className="col-lg-6 mb-4">
                    <h2 className="h5 fw-bold mb-3">Related</h2>
                    <ul className="list-unstyled small mb-0">
                      <li className="mb-1">
                        <Link href={skillPath(skill.slug)}>All {skill.pluralName.toLowerCase()} in Kenya</Link>
                      </li>
                      {locations.slice(0, 5).map((location) => (
                        <li className="mb-1" key={location.slug}>
                          <Link href={skillLocationPath(skill.slug, location.slug)}>
                            {skill.pluralName} in {location.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </>
  );
}
