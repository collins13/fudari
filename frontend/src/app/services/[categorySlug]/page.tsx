import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { serverGet } from '@/lib/serverApi';
import { skillLabel } from '@/lib/kenya';

export const revalidate = 600;

const BASE_URL = 'https://fudari.co';

type Category = {
  name: string;
  slug?: string;
  description?: string;
  isActive: boolean;
  indexable?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  skillTypes?: string[];
  artisanCount?: number;
};

type Worker = {
  id: number;
  firstName: string;
  lastName: string;
  locationName?: string;
  trustScore?: number;
  totalReviews?: number;
  totalJobsCompleted?: number;
  vettingLevel?: string;
  skills?: Array<{ skillType: string; description?: string }>;
};

type PageProps = { params: Promise<{ categorySlug: string }> };

async function getCategory(categorySlug: string): Promise<Category | null> {
  const categories = await serverGet<Category[]>('/categories/stats', { revalidate });
  return categories?.find((category) => category.slug === categorySlug) || null;
}

async function getWorkers(skillTypes: string[]): Promise<Worker[]> {
  const results = await Promise.all(
    skillTypes.map((skillType) => serverGet<Worker[]>(`/workers/search?skillType=${encodeURIComponent(skillType)}`, { revalidate })),
  );
  return Array.from(new Map(results.flat().filter((worker): worker is Worker => worker !== null).map((worker) => [worker.id, worker])).values());
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { categorySlug } = await params;
  const category = await getCategory(categorySlug);
  if (!category || !category.isActive || !category.indexable || !category.skillTypes?.length || !category.artisanCount) {
    return { robots: { index: false, follow: false } };
  }
  const title = category.seoTitle || `${category.name} Services in Kenya`;
  const description = category.seoDescription || category.description || `Find ${category.name.toLowerCase()} professionals on Fudari, Kenya's services marketplace.`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/services/${categorySlug}` },
    openGraph: { title, description, url: `${BASE_URL}/services/${categorySlug}`, type: 'website' },
  };
}

export default async function ServiceCategoryPage({ params }: PageProps) {
  const { categorySlug } = await params;
  const category = await getCategory(categorySlug);
  if (!category || !category.isActive) notFound();
  if (!category.indexable || !category.skillTypes?.length) notFound();

  const workers = await getWorkers(category.skillTypes);
  const canonical = `${BASE_URL}/services/${categorySlug}`;
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: `${category.name} Services in Kenya`,
        url: canonical,
        description: category.description || undefined,
        isPartOf: { '@id': `${BASE_URL}/#website` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
          { '@type': 'ListItem', position: 2, name: 'Services', item: `${BASE_URL}/artisans` },
          { '@type': 'ListItem', position: 3, name: category.name, item: canonical },
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
              <Link href="/artisans">Services</Link><span className="mx-2 text-muted">/</span>
              <span aria-current="page">{category.name}</span>
            </nav>
            <div className="row justify-content-center">
              <div className="col-lg-8">
                <h1 className="display-5 fw-bold mb-3">{category.name} Services in Kenya</h1>
                {category.description && <p className="lead text-muted mb-0">{category.description}</p>}
              </div>
            </div>
          </div>
        </section>
        <section className="py-5">
          <div className="container">
            <div className="d-flex flex-wrap align-items-end justify-content-between gap-2 mb-4">
              <div>
                <h2 className="h3 fw-bold mb-1">Available professionals</h2>
                <p className="text-muted mb-0">Browse providers offering {category.skillTypes.map(skillLabel).join(', ')}.</p>
              </div>
              <Link href={`/artisans?category=${encodeURIComponent(categorySlug)}`} className="btn btn-primary">Browse all</Link>
            </div>
            {workers.length > 0 ? (
              <div className="row g-3">
                {workers.slice(0, 12).map((worker) => {
                  const name = `${worker.firstName} ${worker.lastName}`;
                  const primarySkill = worker.skills?.[0]?.skillType;
                  return (
                    <div className="col-md-6 col-lg-4" key={worker.id}>
                      <article className="border h-100 p-4 bg-white">
                        <h3 className="h5 mb-2"><Link href={`/artisans/${worker.id}`}>{name}</Link></h3>
                        {primarySkill && <p className="text-primary small mb-2">{skillLabel(primarySkill)}</p>}
                        <p className="text-muted small mb-3">{worker.locationName || 'Kenya'}</p>
                        <div className="small text-muted">
                          {worker.totalReviews ? `${worker.trustScore?.toFixed(1) || '0.0'} rating from ${worker.totalReviews} reviews` : worker.totalJobsCompleted ? `${worker.totalJobsCompleted} jobs completed` : 'View profile and availability'}
                        </div>
                      </article>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border bg-light p-4">
                <p className="mb-3">Providers in this service are being added to Fudari.</p>
                <Link href="/artisans" className="btn btn-outline-primary">Browse all services</Link>
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