import type { Metadata } from "next";

const SKILL_LABELS = [
  "electricians", "plumbers", "mechanics", "painters", "carpenters",
  "welders", "HVAC technicians", "solar technicians", "tilers", "roofers",
  "masons", "gardeners", "cleaners", "mama fua", "CCTV installers", "locksmiths",
  "movers", "transport providers", "boda boda riders", "tuk tuk operators", "couriers",
  "barbers", "hair salons", "makeup artists", "car wash services", "tyre services",
  "photographers", "graphic designers", "IT technicians", "event lighting providers",
];

export const metadata: Metadata = {
  title: "Artisans, Cleaners, Riders, Barbers & More Near You in Kenya",
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
    "mama fua near me", "boda boda nairobi", "tuk tuk kenya", "courier nairobi",
    "barber near me nairobi", "hair salon nairobi", "makeup artist kenya",
    "car wash near me nairobi", "tyre repair nairobi",
    "photographer near me kenya", "graphic designer nairobi", "laptop repair nairobi",
    "services marketplace kenya", "home repair kenya", "handyman directory kenya",
    "service provider directory nairobi",
  ],
  openGraph: {
    type: "website",
    title: "Artisans, Cleaners, Riders, Barbers & More Near You in Kenya | FUDARI",
    description:
      "Kenya's largest directory of verified service pros. Compare trust scores, read reviews and book directly.",
    url: "https://fudari.co/artisans",
    images: [
      {
        url: "/liston/images/header/lg-01.jpg",
        width: 1200,
        height: 630,
        alt: "Browse verified service pros on FUDARI Kenya",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Artisans, Cleaners, Riders, Barbers & More Near You in Kenya | FUDARI",
    description: "Kenya's largest directory of verified service pros. Book directly.",
    images: ["/liston/images/header/lg-01.jpg"],
  },
  alternates: {
    canonical: "https://fudari.co/artisans",
  },
};

/** CollectionPage + ItemList schema for the artisans directory */
const artisansJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": "https://fudari.co/artisans#page",
  name: "Find Verified Service Providers Near You in Kenya",
  description:
    "Browse Kenya's largest directory of verified service providers across every category.",
  url: "https://fudari.co/artisans",
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://fudari.co" },
      { "@type": "ListItem", position: 2, name: "Find Providers", item: "https://fudari.co/artisans" },
    ],
  },
  about: {
    "@type": "Service",
    name: "Local Services Marketplace",
    serviceType: "Local Services Directory",
    provider: { "@id": "https://fudari.co/#organization" },
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
