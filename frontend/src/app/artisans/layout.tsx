import type { Metadata } from "next";

const SKILL_LABELS = [
  "electricians", "plumbers", "mechanics", "painters", "carpenters",
  "welders", "HVAC technicians", "solar technicians", "tilers", "roofers",
  "masons", "gardeners", "cleaners", "CCTV installers", "locksmiths",
  "movers", "transport providers", "event lighting providers",
];

export const metadata: Metadata = {
  title: "Plumbers, Electricians, Movers & More Near You in Kenya",
  description:
    "Browse Kenya's largest directory of verified service pros — " +
    SKILL_LABELS.join(", ") +
    " and more. Compare trust scores, read real reviews, and book directly via phone or WhatsApp.",
  // "fundi" carries real search volume for the trade categories, so it stays a
  // keyword target even though it is not the umbrella label for every provider.
  keywords: [
    "find fundi kenya", "fundi near me", "fundi nairobi", "tafuta fundi",
    "fundi mabomba nairobi", "fundi stima nairobi", "fundi seremala kenya",
    "find artisan kenya", "browse artisans nairobi", "jua kali directory",
    "verified electrician nairobi", "plumber near me kenya", "mechanic near me nairobi",
    "hire carpenter kenya", "trusted painter nairobi", "book artisan online",
    "movers nairobi", "transport providers kenya", "event lighting nairobi",
    "artisan marketplace kenya", "home repair kenya", "handyman directory kenya",
    "service provider directory nairobi",
  ],
  openGraph: {
    type: "website",
    title: "Plumbers, Electricians, Movers & More Near You in Kenya | TUFIXIT",
    description:
      "Kenya's largest directory of verified service pros. Compare trust scores, read reviews and book directly.",
    url: "https://tufixit.com/artisans",
    images: [
      {
        url: "/liston/images/header/lg-01.jpg",
        width: 1200,
        height: 630,
        alt: "Browse verified service pros on TUFIXIT Kenya",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Plumbers, Electricians, Movers & More Near You in Kenya | TUFIXIT",
    description: "Kenya's largest directory of verified service pros. Book directly.",
    images: ["/liston/images/header/lg-01.jpg"],
  },
  alternates: {
    canonical: "https://tufixit.com/artisans",
  },
};

/** CollectionPage + ItemList schema for the artisans directory */
const artisansJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": "https://tufixit.com/artisans#page",
  name: "Find Verified Artisans Near You in Kenya",
  description:
    "Browse Kenya's largest directory of verified Jua Kali artisans across all skill categories.",
  url: "https://tufixit.com/artisans",
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://tufixit.com" },
      { "@type": "ListItem", position: 2, name: "Find Artisans", item: "https://tufixit.com/artisans" },
    ],
  },
  about: {
    "@type": "Service",
    name: "Jua Kali Artisan Marketplace",
    serviceType: "Home Services Directory",
    provider: { "@id": "https://tufixit.com/#organization" },
    areaServed: { "@type": "Country", name: "Kenya" },
  },
});

export default function ArtisansLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: artisansJsonLd }}
      />
      {children}
    </>
  );
}
