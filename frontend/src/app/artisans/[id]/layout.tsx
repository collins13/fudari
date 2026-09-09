import type { Metadata } from "next";
import { notFound } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const res = await fetch(`${API_URL}/workers/${id}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error("Worker not found");

    const worker = await res.json();
    const name = `${worker.firstName} ${worker.lastName}`;
    const primarySkill =
      worker.skills?.[0]?.skillType?.replace(/_/g, " ") || "Artisan";
    const location = worker.locationName || "Kenya";
    const title = `${name} — ${primarySkill} in ${location}`;
    const ratingStr =
      worker.totalReviews > 0
        ? ` Rated ${(worker.averageRating ?? 0).toFixed(1)}/5 from ${worker.totalReviews} reviews.`
        : "";
    const jobsStr =
      worker.totalJobsCompleted > 0
        ? ` ${worker.totalJobsCompleted} jobs completed.`
        : "";
    const description =
      `Hire ${name}, a verified ${primarySkill.toLowerCase()} in ${location}.${ratingStr}${jobsStr} Book on FUDARI Kenya.`;
    const canonical = `https://fudari.co/artisans/${id}`;
    const photo = worker.profileImage
      ? new URL(worker.profileImage, API_URL).toString()
      : null;
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
        `verified ${primarySkill.toLowerCase()} kenya`,
        `book ${primarySkill.toLowerCase()} nairobi`,
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
    };
  } catch {
    return {
      title: "Artisan Profile",
      description: "View provider profile on FUDARI — Kenya's services marketplace.",
      // Without this the page inherits the parent canonical (/artisans) and Google
      // indexes a soft 404 pointing at a different URL.
      robots: { index: false, follow: false },
    };
  }
}

/** Build Person + Service JSON-LD from worker data (server-side, SEO-critical). */
async function getArtisanJsonLd(id: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/workers/${id}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const worker = await res.json();

    const name = `${worker.firstName} ${worker.lastName}`;
    const location = worker.locationName || "Kenya";
    const skills: { skillType: string; hourlyRate?: string }[] =
      worker.skills || [];
    const primarySkill =
      skills[0]?.skillType?.replace(/_/g, " ") || "Artisan";
    const photo = worker.profileImage
      ? new URL(worker.profileImage, API_URL).toString()
      : null;

    const schema: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Person",
          "@id": `https://fudari.co/artisans/${id}#person`,
          name,
          jobTitle: primarySkill,
          url: `https://fudari.co/artisans/${id}`,
          image: photo || undefined,
          worksFor: { "@id": "https://fudari.co/#organization" },
          address: {
            "@type": "PostalAddress",
            addressLocality: location,
            addressCountry: "KE",
          },
          ...(worker.totalReviews > 0 && {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: (worker.averageRating ?? 0).toFixed(1),
              reviewCount: worker.totalReviews,
              bestRating: 5,
              worstRating: 1,
            },
          }),
        },
        ...skills.map((s) => ({
          "@type": "Service",
          name: s.skillType.replace(/_/g, " "),
          provider: { "@id": `https://fudari.co/artisans/${id}#person` },
          areaServed: {
            "@type": "AdministrativeArea",
            name: location,
          },
          url: `https://fudari.co/artisans/${id}`,
          ...(s.hourlyRate && {
            offers: {
              "@type": "Offer",
              priceCurrency: "KES",
              price: s.hourlyRate,
            },
          }),
        })),
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://fudari.co" },
            { "@type": "ListItem", position: 2, name: "Artisans", item: "https://fudari.co/artisans" },
            { "@type": "ListItem", position: 3, name: name, item: `https://fudari.co/artisans/${id}` },
          ],
        },
      ],
    };
    return JSON.stringify(schema);
  } catch {
    return null;
  }
}

export default async function ArtisanDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Only a definitive 404 turns into notFound(); a 5xx or timeout must not
  // deindex a real profile during an API outage.
  const probe = await fetch(`${API_URL}/workers/${id}`, { next: { revalidate: 3600 } })
    .catch(() => null);
  if (probe?.status === 404) notFound();

  const jsonLd = await getArtisanJsonLd(id);
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      )}
      {children}
    </>
  );
}
