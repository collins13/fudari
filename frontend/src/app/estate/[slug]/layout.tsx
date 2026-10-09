import type { Metadata } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const res = await fetch(`${API_URL}/estates/resolve/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error("Estate not found");

    const estate = await res.json();
    const name: string = estate.name || slug;
    const area: string = estate.area || "Kenya";
    const title = `${name} Services — Book a Verified Provider`;
    const description =
      `${name} in ${area} uses FUDARI to connect residents with trusted local service providers. ` +
      `Book electricians, plumbers, carpenters, cleaners, mama fua, movers and more directly via WhatsApp or online.`;
    const canonical = `https://fudari.co/estate/${slug}`;

    return {
      title,
      description,
      keywords: [
        `${name.toLowerCase()} maintenance`,
        `artisan ${area.toLowerCase()}`,
        `electrician ${area.toLowerCase()}`,
        `plumber ${area.toLowerCase()}`,
        `mama fua ${area.toLowerCase()}`,
        `cleaning services ${area.toLowerCase()}`,
        `estate maintenance kenya`,
        `residential services ${area.toLowerCase()}`,
        `book handyman ${name.toLowerCase()}`,
      ],
      openGraph: {
        type: "website",
        title: `${title} | FUDARI`,
        description,
        url: canonical,
        images: [
          {
            url: estate.brandLogoUrl || "/liston/images/header/lg-01.jpg",
            width: 1200,
            height: 630,
            alt: `${name} — FUDARI Estate Portal`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | FUDARI`,
        description,
        images: [estate.brandLogoUrl || "/liston/images/header/lg-01.jpg"],
      },
      alternates: { canonical },
    };
  } catch {
    return {
      title: "Estate Services",
      description:
        "Book verified local service providers for your estate through FUDARI, Kenya's trusted services marketplace.",
      alternates: { canonical: `https://fudari.co/estate/${slug}` },
      robots: { index: false, follow: true },
    };
  }
}

/** Build LocalBusiness + Service JSON-LD for the estate portal. */
async function getEstateJsonLd(slug: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/estates/resolve/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const estate = await res.json();

    const name: string = estate.name || slug;
    const area: string = estate.area || "Kenya";

    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "LocalBusiness",
          "@id": `https://fudari.co/estate/${slug}#estate`,
          name: `${name} — FUDARI Estate Portal`,
          url: `https://fudari.co/estate/${slug}`,
          description: `Maintenance & home services portal for ${name} residents, powered by FUDARI.`,
          address: {
            "@type": "PostalAddress",
            addressLocality: area,
            addressCountry: "KE",
          },
          parentOrganization: { "@id": "https://fudari.co/#organization" },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://fudari.co" },
            { "@type": "ListItem", position: 2, name: name, item: `https://fudari.co/estate/${slug}` },
          ],
        },
      ],
    };
    return JSON.stringify(schema).replace(/</g, '\\u003c');
  } catch {
    return null;
  }
}

export default async function EstateLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const jsonLd = await getEstateJsonLd(slug);
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
