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
    const title = `${name} Maintenance Services — Book a Verified Artisan`;
    const description =
      `${name} in ${area} uses TUFIXIT to connect residents with trusted Jua Kali artisans. ` +
      `Book electricians, plumbers, carpenters and more directly via WhatsApp or online.`;
    const canonical = `https://tufixit.com/estate/${slug}`;

    return {
      title,
      description,
      keywords: [
        `${name.toLowerCase()} maintenance`,
        `artisan ${area.toLowerCase()}`,
        `electrician ${area.toLowerCase()}`,
        `plumber ${area.toLowerCase()}`,
        `estate maintenance kenya`,
        `residential services ${area.toLowerCase()}`,
        `book handyman ${name.toLowerCase()}`,
      ],
      openGraph: {
        type: "website",
        title: `${title} | TUFIXIT`,
        description,
        url: canonical,
        images: [
          {
            url: estate.brandLogoUrl || "/liston/images/header/lg-01.jpg",
            width: 1200,
            height: 630,
            alt: `${name} — TUFIXIT Estate Portal`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | TUFIXIT`,
        description,
        images: [estate.brandLogoUrl || "/liston/images/header/lg-01.jpg"],
      },
      alternates: { canonical },
    };
  } catch {
    return {
      title: "Estate Maintenance Services",
      description:
        "Book verified Jua Kali artisans for your estate through TUFIXIT Kenya's trusted home services marketplace.",
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
          "@id": `https://tufixit.com/estate/${slug}#estate`,
          name: `${name} — TUFIXIT Estate Portal`,
          url: `https://tufixit.com/estate/${slug}`,
          description: `Maintenance & home services portal for ${name} residents, powered by TUFIXIT.`,
          address: {
            "@type": "PostalAddress",
            addressLocality: area,
            addressCountry: "KE",
          },
          parentOrganization: { "@id": "https://tufixit.com/#organization" },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://tufixit.com" },
            { "@type": "ListItem", position: 2, name: name, item: `https://tufixit.com/estate/${slug}` },
          ],
        },
      ],
    };
    return JSON.stringify(schema);
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
