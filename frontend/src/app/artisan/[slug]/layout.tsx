import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { resolveProfileImage } from "@/lib/avatar";
import { serverApiUrl } from "@/lib/serverApi";
import { absolute, parseProviderSlug, providerPath, providerSlug } from "@/lib/seoUrls";

const SITE_URL = "https://fudari.co";
const REVALIDATE = 3600;

type Skill = { skillType: string; hourlyRate?: string; description?: string };

type Worker = {
  id: number;
  firstName: string;
  lastName: string;
  locationName?: string;
  county?: string;
  town?: string;
  area?: string;
  profileImage?: string;
  averageRating?: number;
  totalReviews?: number;
  totalJobsCompleted?: number;
  vettingLevel?: string;
  isVerified?: boolean;
  phoneNumber?: string;
  skills?: Skill[];
};

type Props = { params: Promise<{ slug: string }> };

/**
 * A profile only earns indexation if it is worth landing on. Mirrors the
 * single-provider rule in SeoPolicyService.
 */
function completeness(worker: Worker): number {
  const checks = [
    Boolean(worker.firstName && worker.lastName),
    Boolean(worker.locationName || worker.town || worker.county),
    Boolean(worker.skills?.length),
    Boolean(worker.skills?.[0]?.description),
    Boolean(worker.totalJobsCompleted),
    Boolean(worker.totalReviews),
    worker.vettingLevel === "VERIFIED" || worker.vettingLevel === "PRO",
  ];
  return checks.filter(Boolean).length / checks.length;
}

/**
 * Next dedupes this across generateMetadata and the layout within a request, so the
 * profile is fetched once. The status is returned rather than swallowed: only a
 * definitive 404 may call notFound(), a 5xx must not deindex a real profile.
 */
async function loadWorker(id: number): Promise<{ status: number; worker: Worker | null }> {
  try {
    const res = await fetch(`${serverApiUrl()}/workers/${id}`, {
      next: { revalidate: REVALIDATE },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { status: res.status, worker: null };
    return { status: res.status, worker: (await res.json()) as Worker };
  } catch {
    return { status: 0, worker: null };
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const id = parseProviderSlug(slug);
  const { worker } = id ? await loadWorker(id) : { worker: null };

  if (!worker) {
    return {
      title: "Artisan Profile",
      description: "View provider profile on FUDARI — Kenya's services marketplace.",
      // Without this the page inherits the parent canonical (/artisans) and Google
      // indexes a soft 404 pointing at a different URL.
      robots: { index: false, follow: false },
    };
  }

  const name = `${worker.firstName} ${worker.lastName}`;
  const primarySkill = worker.skills?.[0]?.skillType?.replace(/_/g, " ") || "Artisan";
  const location = worker.locationName || "Kenya";
  const title = `${name} — ${primarySkill} in ${location}`;
  const ratingStr = worker.totalReviews
    ? ` Rated ${(worker.averageRating ?? 0).toFixed(1)}/5 from ${worker.totalReviews} reviews.`
    : "";
  const jobsStr = worker.totalJobsCompleted ? ` ${worker.totalJobsCompleted} jobs completed.` : "";
  const verification = worker.isVerified ? "verified " : "";
  const description = `View ${name}, a ${verification}${primarySkill.toLowerCase()} in ${location}.${ratingStr}${jobsStr} Contact this provider through FUDARI Kenya.`;
  const canonical = absolute(providerPath(worker));
  // Must resolve against the public API origin: serverApiUrl() is the in-cluster host.
  const photo = resolveProfileImage(worker.profileImage);
  const ogImage = photo
    ? [{ url: photo, width: 400, height: 400, alt: name }]
    : [{ url: "/liston/images/header/lg-01.jpg", width: 1200, height: 630, alt: name }];

  return {
    title,
    description,
    keywords: [
      `${primarySkill.toLowerCase()} ${location.toLowerCase()}`,
      `${primarySkill.toLowerCase()} kenya`,
      `hire ${primarySkill.toLowerCase()} ${location.toLowerCase()}`,
      `${name.toLowerCase()} fudari`,
      ...(worker.isVerified ? [`verified ${primarySkill.toLowerCase()} kenya`] : []),
    ],
    openGraph: {
      type: "profile",
      title: `${title} | FUDARI`,
      description,
      url: canonical,
      images: ogImage,
    },
    twitter: {
      card: "summary",
      title: `${title} | FUDARI`,
      description,
      images: [ogImage[0].url],
    },
    alternates: { canonical },
    // Thin profiles stay reachable for users but out of the index.
    ...(completeness(worker) >= 0.6 ? {} : { robots: { index: false, follow: true } }),
  };
}

/**
 * ProfessionalService rather than Person: review stars and local-pack eligibility
 * are only granted to business types — Person/aggregateRating is ignored.
 */
function artisanJsonLd(worker: Worker): string {
  const name = `${worker.firstName} ${worker.lastName}`;
  const location = worker.locationName || "Kenya";
  const skills = worker.skills || [];
  const primarySkill = skills[0]?.skillType?.replace(/_/g, " ") || "Artisan";
  const photo = resolveProfileImage(worker.profileImage);
  const profileUrl = absolute(providerPath(worker));
  const rates = skills
    .map((skill) => Number(skill.hourlyRate))
    .filter((rate) => Number.isFinite(rate) && rate > 0);

  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfessionalService",
        "@id": `${profileUrl}#business`,
        name,
        description: `${worker.isVerified ? "Verified " : ""}${primarySkill.toLowerCase()} serving ${location}, available through Fudari.`,
        url: profileUrl,
        image: photo || undefined,
        currenciesAccepted: "KES",
        paymentAccepted: "M-Pesa, Cash",
        parentOrganization: { "@id": `${SITE_URL}/#organization` },
        address: {
          "@type": "PostalAddress",
          addressLocality: location,
          addressCountry: "KE",
        },
        areaServed: { "@type": "Place", name: location },
        makesOffer: skills.map((skill) => ({
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: skill.skillType.replace(/_/g, " ") },
          ...(Number(skill.hourlyRate) > 0 && {
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: skill.hourlyRate,
              priceCurrency: "KES",
              unitCode: "HUR",
            },
          }),
        })),
        ...(rates.length > 0 && {
          priceRange: `KES ${Math.min(...rates)}–${Math.max(...rates)} / hr`,
        }),
        ...(worker.totalReviews
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: (worker.averageRating ?? 0).toFixed(1),
                reviewCount: worker.totalReviews,
                bestRating: 5,
                worstRating: 1,
              },
            }
          : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Artisans", item: `${SITE_URL}/artisans` },
          { "@type": "ListItem", position: 3, name, item: profileUrl },
        ],
      },
    ],
  }).replace(/</g, "\\u003c");
}

export default async function ArtisanDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const id = parseProviderSlug(slug);
  if (!id) notFound();

  const { status, worker } = await loadWorker(id);
  if (status === 404) notFound();

  // Stale or hand-typed slugs fold into the current canonical one.
  if (worker) {
    const canonicalSlug = providerSlug(worker);
    if (canonicalSlug !== slug) permanentRedirect(providerPath(worker));
  }

  return (
    <>
      {worker && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: artisanJsonLd(worker) }}
        />
      )}
      {children}
    </>
  );
}
