import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProviderCard from '@/components/ProviderCard';
import { profileImageFor } from '@/lib/avatar';
import { absolute, providerPath, servicePath, skillLocationPath } from '@/lib/seoUrls';
import { canonicalWorkerLocation, groupByLocation, MIN_INDEXABLE_PROVIDERS } from '@/lib/locations';
import { getOfferingWorkers, getServiceOfferings } from '@/lib/services';
import { getSkills } from '@/lib/taxonomy';

// Must be a literal: Next rejects imported constants in segment config.
export const revalidate = 600;

type PageProps = { params: Promise<{ slug: string; locationSlug: string }> };

async function load(slug: string, locationSlug: string) {
  const offering = (await getServiceOfferings()).find((candidate) => candidate.slug === slug);
  if (!offering || offering.isActive === false) return null;

  const all = await getOfferingWorkers(offering.slug);
  const buckets = groupByLocation(all);
  const bucket = buckets.find((candidate) => candidate.slug === locationSlug);
  if (!bucket) return null;

  return {
    offering,
    bucket,
    workers: all.filter((worker) => canonicalWorkerLocation(worker)?.slug === locationSlug),
    otherAreas: buckets
      .filter((b) => b.slug !== locationSlug && b.providerCount >= MIN_INDEXABLE_PROVIDERS)
      .slice(0, 10),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, locationSlug } = await params;
  const data = await load(slug, locationSlug);
  if (!data) return { robots: { index: false, follow: false } };

  const { offering, bucket, workers } = data;
  const title = `${offering.name} in ${bucket.name} | Fudari`;
  const price =
    offering.priceFromKes && offering.priceToKes
      ? ` Typical cost KES ${offering.priceFromKes.toLocaleString()}–${offering.priceToKes.toLocaleString()}.`
      : '';
  const description = `${bucket.providerCount} providers in ${bucket.name} offer ${offering.name.toLowerCase()}.${price} Compare ratings, agree a price up front and pay on completion.`;
  const canonical = absolute(servicePath(offering.slug, bucket.slug));

  return {
    title: { absolute: title },
    description,
    keywords: [
      `${offering.name.toLowerCase()} ${bucket.name.toLowerCase()}`,
      `${offering.name.toLowerCase()} kenya`,
      `hire ${offering.name.toLowerCase()} ${bucket.name.toLowerCase()}`,
    ],
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
    ...(bucket.geo
      ? {
          other: {
            'geo.region': 'KE',
            'geo.placename': bucket.name,
            'geo.position': `${bucket.geo.lat};${bucket.geo.lng}`,
            ICBM: `${bucket.geo.lat}, ${bucket.geo.lng}`,
          },
        }
      : {}),
    ...(workers.length >= MIN_INDEXABLE_PROVIDERS && offering.indexable !== false
      ? {}
      : { robots: { index: false, follow: true } }),
  };
}

export default async function ServiceLocationPage({ params }: PageProps) {
  const { slug, locationSlug } = await params;
  const data = await load(slug, locationSlug);
  if (!data) notFound();

  const { offering, bucket, workers, otherAreas } = data;
  const canonical = absolute(servicePath(offering.slug, bucket.slug));
  const skill = (await getSkills()).find((candidate) => candidate.skillType === offering.skillType);

  const areas = bucket.areas.slice(0, 4);
  const intro = [
    `${bucket.providerCount} providers in ${bucket.name} offer ${offering.name.toLowerCase()} on Fudari.`,
    areas.length > 1 ? `Covering ${areas.slice(0, -1).join(', ')} and ${areas[areas.length - 1]}.` : '',
    offering.priceFromKes && offering.priceToKes
      ? `Typical cost KES ${offering.priceFromKes.toLocaleString()}–${offering.priceToKes.toLocaleString()}.`
      : '',
    'Agree the price up front and pay on completion.',
  ]
    .filter(Boolean)
    .join(' ');

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: `${offering.name} in ${bucket.name}`,
        url: canonical,
        description: intro,
        isPartOf: { '@id': absolute('/#website') },
        about: {
          '@type': 'Service',
          name: offering.name,
          provider: { '@id': absolute('/#organization') },
          areaServed: {
            '@type': 'Place',
            name: bucket.name,
            address: { '@type': 'PostalAddress', addressLocality: bucket.name, addressCountry: 'KE' },
            ...(bucket.geo
              ? { geo: { '@type': 'GeoCoordinates', latitude: bucket.geo.lat, longitude: bucket.geo.lng } }
              : {}),
          },
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
        '@type': 'ItemList',
        numberOfItems: workers.length,
        itemListElement: workers.slice(0, 12).map((worker, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: absolute(providerPath(worker)),
          name: `${worker.firstName} ${worker.lastName}`,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: absolute('/') },
          { '@type': 'ListItem', position: 2, name: 'Services', item: absolute('/services') },
          { '@type': 'ListItem', position: 3, name: offering.name, item: absolute(servicePath(offering.slug)) },
          { '@type': 'ListItem', position: 4, name: bucket.name, item: canonical },
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
              <Link href={servicePath(offering.slug)}>{offering.name}</Link><span className="mx-2 text-muted">/</span>
              <span aria-current="page">{bucket.name}</span>
            </nav>
            <div className="row justify-content-center">
              <div className="col-lg-8">
                {offering.isEmergency && <span className="badge bg-danger mb-2">Emergency callout</span>}
                <h1 className="display-5 fw-bold mb-3">{offering.name} in {bucket.name}</h1>
                <p className="lead text-muted mb-0">{intro}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-5">
          <div className="container">
            <h2 className="h3 fw-bold mb-4">Providers in {bucket.name}</h2>
            {workers.length > 0 ? (
              <div className="row g-3">
                {workers.slice(0, 24).map((worker) => (
                  <div className="col-md-6 col-lg-4" key={worker.id}>
                    <ProviderCard
                      variant="compact"
                      provider={{
                        name: `${worker.firstName} ${worker.lastName}`,
                        href: providerPath(worker),
                        image: profileImageFor(worker.profileImage, `${worker.firstName} ${worker.lastName}`, worker.id),
                        skill: offering.name,
                        location: worker.area || worker.town || worker.locationName || bucket.name,
                        price: worker.skills?.[0]?.hourlyRate ? Number(worker.skills[0].hourlyRate) : undefined,
                        rating: worker.trustScore,
                        reviews: worker.totalReviews,
                        jobs: worker.totalJobsCompleted,
                        availableNow: worker.availableNow,
                        verified: worker.isVerified === true,
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="border bg-light p-4">
                <p className="mb-3">
                  No providers offer {offering.name.toLowerCase()} in {bucket.name} yet. These are the closest options.
                </p>
                <ul className="list-inline mb-0">
                  <li className="list-inline-item me-3 mb-2">
                    <Link href={servicePath(offering.slug)} className="btn btn-sm btn-outline-primary rounded-5">
                      {offering.name} across Kenya
                    </Link>
                  </li>
                  {otherAreas.slice(0, 3).map((area) => (
                    <li className="list-inline-item me-3 mb-2" key={area.slug}>
                      <Link href={servicePath(offering.slug, area.slug)} className="btn btn-sm btn-outline-primary rounded-5">
                        {area.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        <section className="py-5 bg-light">
          <div className="container">
            <div className="row">
              {otherAreas.length > 0 && (
                <div className="col-lg-6 mb-4">
                  <h2 className="h5 fw-bold mb-3">{offering.name} in other areas</h2>
                  <ul className="list-unstyled small mb-0">
                    {otherAreas.map((area) => (
                      <li className="mb-1" key={area.slug}>
                        <Link href={servicePath(offering.slug, area.slug)}>
                          {offering.name} in {area.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {skill && (
                <div className="col-lg-6 mb-4">
                  <h2 className="h5 fw-bold mb-3">Related in {bucket.name}</h2>
                  <ul className="list-unstyled small mb-0">
                    <li className="mb-1">
                      <Link href={skillLocationPath(skill.slug, bucket.slug)}>
                        All {skill.pluralName.toLowerCase()} in {bucket.name}
                      </Link>
                    </li>
                    <li className="mb-1">
                      <Link href={servicePath(offering.slug)}>{offering.name} across Kenya</Link>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </>
  );
}
