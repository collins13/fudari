import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { absolute, locationPath } from '@/lib/seoUrls';
import { getLocations, MIN_PROVIDERS_FOR_INDEX } from '@/lib/taxonomy';

// Must be a literal: Next rejects imported constants in segment config.
export const revalidate = 600;

const CANONICAL = absolute('/locations');

export const metadata: Metadata = {
  title: 'Find Fundis by County in Kenya',
  description:
    'Browse verified fundis and service providers by county across Kenya — Nairobi, Mombasa, Kisumu, Nakuru, Uasin Gishu and beyond.',
  alternates: { canonical: CANONICAL },
  openGraph: { title: 'Find Fundis by County in Kenya | Fudari', url: CANONICAL, type: 'website' },
};

export default async function LocationsIndexPage() {
  const locations = await getLocations();
  const counties = locations.filter((location) => location.type === 'COUNTY');
  const towns = locations.filter(
    (location) => location.type === 'TOWN' && (location.providerCount || 0) >= MIN_PROVIDERS_FOR_INDEX,
  );
  const withSupply = counties.filter((county) => (county.providerCount || 0) >= MIN_PROVIDERS_FOR_INDEX);
  const rest = counties.filter((county) => (county.providerCount || 0) < MIN_PROVIDERS_FOR_INDEX);

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: 'Find fundis by county in Kenya',
        url: CANONICAL,
        isPartOf: { '@id': absolute('/#website') },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: absolute('/') },
          { '@type': 'ListItem', position: 2, name: 'Locations', item: CANONICAL },
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
              <span aria-current="page">Locations</span>
            </nav>
            <div className="row justify-content-center">
              <div className="col-lg-8">
                <h1 className="display-5 fw-bold mb-3">Find Fundis by County in Kenya</h1>
                <p className="lead text-muted mb-0">
                  Fudari covers all 47 counties. {withSupply.length} currently have active providers — pick a county
                  to see which services are available there.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-5">
          <div className="container">
            {withSupply.length > 0 && (
              <>
                <h2 className="h3 fw-bold mb-4">Counties with active providers</h2>
                <div className="row g-3 mb-5">
                  {withSupply.map((county) => (
                    <div className="col-md-6 col-lg-3" key={county.slug}>
                      <article className="border h-100 p-3">
                        <h3 className="h6 mb-1">
                          <Link href={locationPath(county.slug)}>{county.name}</Link>
                        </h3>
                        <p className="text-muted small mb-0">{county.providerCount} providers</p>
                      </article>
                    </div>
                  ))}
                </div>
              </>
            )}

            <h2 className="h4 fw-bold mb-3">All counties</h2>
            <ul className="list-inline mb-0">
              {rest.map((county) => (
                <li className="list-inline-item me-3 mb-2" key={county.slug}>
                  <Link href={locationPath(county.slug)}>{county.name}</Link>
                </li>
              ))}
            </ul>

            {towns.length > 0 && (
              <>
                <h2 className="h4 fw-bold mt-5 mb-3">Cities and towns with active providers</h2>
                <ul className="list-inline mb-0">
                  {towns.map((town) => (
                    <li className="list-inline-item me-3 mb-2" key={town.slug}>
                      <Link href={locationPath(town.slug)}>{town.name}</Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </>
  );
}
