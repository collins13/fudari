import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { absolute, servicePath, skillPath } from '@/lib/seoUrls';
import { skillLabel } from '@/lib/kenya';
import { getServiceOfferings, type ServiceOffering } from '@/lib/services';
import { getSkills } from '@/lib/taxonomy';

// Must be a literal: Next rejects imported constants in segment config.
export const revalidate = 600;

const CANONICAL = absolute('/services');

export const metadata: Metadata = {
  title: 'All Services in Kenya',
  description:
    'Every service bookable on Fudari — from drain unblocking and house wiring to fridge repair, mama fua, car wash and IT support. Verified providers across Kenya.',
  alternates: { canonical: CANONICAL },
  openGraph: { title: 'All Services in Kenya | Fudari', url: CANONICAL, type: 'website' },
};

export default async function ServicesIndexPage() {
  const [offerings, skills] = await Promise.all([getServiceOfferings(), getSkills()]);
  const active = offerings.filter((offering) => offering.isActive !== false);

  const bySkill = new Map<string, ServiceOffering[]>();
  for (const offering of active) {
    const list = bySkill.get(offering.skillType) || [];
    list.push(offering);
    bySkill.set(offering.skillType, list);
  }

  const groups = skills
    .filter((skill) => bySkill.has(skill.skillType))
    .map((skill) => ({ skill, offerings: bySkill.get(skill.skillType) || [] }));

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: 'All services in Kenya',
        url: CANONICAL,
        isPartOf: { '@id': absolute('/#website') },
      },
      {
        '@type': 'ItemList',
        numberOfItems: active.length,
        itemListElement: active.slice(0, 50).map((offering, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: offering.name,
          url: absolute(servicePath(offering.slug)),
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: absolute('/') },
          { '@type': 'ListItem', position: 2, name: 'Services', item: CANONICAL },
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
              <span aria-current="page">Services</span>
            </nav>
            <div className="row justify-content-center">
              <div className="col-lg-8">
                <h1 className="display-5 fw-bold mb-3">All Services in Kenya</h1>
                <p className="lead text-muted mb-0">
                  {active.length} specific services across {groups.length} trades. Pick the exact job you need, or
                  browse by trade and location.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-5">
          <div className="container">
            {groups.length > 0 ? (
              groups.map(({ skill, offerings: items }) => (
                <div className="mb-5" key={skill.slug}>
                  <h2 className="h4 fw-bold mb-1">
                    <Link href={skillPath(skill.slug)}>{skill.pluralName}</Link>
                  </h2>
                  <p className="text-muted small mb-3">{skillLabel(skill.skillType)}</p>
                  <div className="row g-2">
                    {items.map((offering) => (
                      <div className="col-md-6 col-lg-4" key={offering.slug}>
                        <div className="border p-3 h-100">
                          <h3 className="h6 mb-1">
                            <Link href={servicePath(offering.slug)}>{offering.name}</Link>
                            {offering.isEmergency && <span className="badge bg-danger ms-2">24/7</span>}
                          </h3>
                          {offering.priceFromKes && offering.priceToKes && (
                            <p className="text-muted small mb-0">
                              KES {offering.priceFromKes.toLocaleString()}–{offering.priceToKes.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="border bg-light p-4">
                <p className="mb-3">Services are being loaded.</p>
                <Link href="/artisans" className="btn btn-outline-primary rounded-5">Browse all providers</Link>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </>
  );
}
