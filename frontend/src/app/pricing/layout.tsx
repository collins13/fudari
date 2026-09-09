import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pro Subscription Plans & Pricing",
  description:
    "Affordable FUDARI subscription plans for Kenyan service providers — Free (KES 0), Basic (KES 500/mo or KES 150/wk), Pro (KES 3,000/mo or KES 800/wk). Get more listings, analytics, featured badge, and priority search ranking.",
  keywords: [
    "fudari pricing", "fudari plans", "service provider subscription kenya",
    "artisan subscription kenya", "jua kali pricing plans", "electrician listing fee kenya",
    "how to list on fudari", "services marketplace subscription kenya",
    "affordable provider plan nairobi", "mpesa subscription kenya",
    "featured provider badge kenya",
  ],
  openGraph: {
    type: "website",
    title: "Pro Subscription Plans & Pricing | FUDARI",
    description:
      "Free, Basic (KES 500/mo), and Pro (KES 3,000/mo) plans for verified Kenyan service providers. More visibility, more bookings.",
    url: "https://fudari.co/pricing",
    images: [
      {
        url: "/liston/images/header/lg-01.jpg",
        width: 1200,
        height: 630,
        alt: "FUDARI Provider Subscription Plans",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pro Plans & Pricing | FUDARI",
    description: "Free, Basic KES 500/mo, Pro KES 3,000/mo. Get more listings and bookings in Kenya.",
    images: ["/liston/images/header/lg-01.jpg"],
  },
  alternates: {
    canonical: "https://fudari.co/pricing",
  },
};

const pricingJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://fudari.co" },
        { "@type": "ListItem", position: 2, name: "Pricing", item: "https://fudari.co/pricing" },
      ],
    },
    {
      "@type": "WebPage",
      "@id": "https://fudari.co/pricing#page",
      name: "Provider Subscription Plans & Pricing",
      description: "Subscription plans for Kenyan service providers on FUDARI.",
      url: "https://fudari.co/pricing",
      breadcrumb: { "@id": "https://fudari.co/pricing#breadcrumb" },
      mainEntity: {
        "@type": "ItemList",
        name: "FUDARI Provider Plans",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            item: {
              "@type": "Product",
              name: "FUDARI Free Plan",
              description: "1 active listing, standard search visibility — free forever.",
              offers: {
                "@type": "Offer",
                priceCurrency: "KES",
                price: "0",
                priceValidUntil: "2027-12-31",
                availability: "https://schema.org/InStock",
                url: "https://fudari.co/pricing",
              },
            },
          },
          {
            "@type": "ListItem",
            position: 2,
            item: {
              "@type": "Product",
              name: "FUDARI Basic Plan",
              description: "3 listings, higher search ranking, portfolio uploads.",
              offers: [
                {
                  "@type": "Offer",
                  name: "Monthly",
                  priceCurrency: "KES",
                  price: "500",
                  priceValidUntil: "2027-12-31",
                  availability: "https://schema.org/InStock",
                  url: "https://fudari.co/pricing",
                },
                {
                  "@type": "Offer",
                  name: "Weekly",
                  priceCurrency: "KES",
                  price: "150",
                  priceValidUntil: "2027-12-31",
                  availability: "https://schema.org/InStock",
                  url: "https://fudari.co/pricing",
                },
              ],
            },
          },
          {
            "@type": "ListItem",
            position: 3,
            item: {
              "@type": "Product",
              name: "FUDARI Pro Plan",
              description: "Unlimited listings, top search placement, featured badge, analytics dashboard.",
              offers: [
                {
                  "@type": "Offer",
                  name: "Monthly",
                  priceCurrency: "KES",
                  price: "3000",
                  priceValidUntil: "2027-12-31",
                  availability: "https://schema.org/InStock",
                  url: "https://fudari.co/pricing",
                },
                {
                  "@type": "Offer",
                  name: "Weekly",
                  priceCurrency: "KES",
                  price: "800",
                  priceValidUntil: "2027-12-31",
                  availability: "https://schema.org/InStock",
                  url: "https://fudari.co/pricing",
                },
              ],
            },
          },
        ],
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Can I upgrade or downgrade my FUDARI plan anytime?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Upgrades take effect immediately. Downgrades apply at the end of your current billing period.",
          },
        },
        {
          "@type": "Question",
          name: "How do I pay for a FUDARI artisan plan?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "We accept M-Pesa. Payment is monthly (or weekly) and you can cancel anytime from your dashboard.",
          },
        },
        {
          "@type": "Question",
          name: "Do customers pay to use FUDARI?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. Customers browse and contact service providers completely free. Only service providers pay for subscription plans.",
          },
        },
        {
          "@type": "Question",
          name: "What happens to my listings if I cancel my plan?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Your plan stays active until the end of the billing period. After that, you revert to the Free plan with 1 active listing.",
          },
        },
        {
          "@type": "Question",
          name: "What is the FUDARI featured badge?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Pro members get a crown badge on their profile and appear at the top of search results, significantly increasing their visibility to customers.",
          },
        },
      ],
    },
  ],
});

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: pricingJsonLd }}
      />
      {children}
    </>
  );
}
