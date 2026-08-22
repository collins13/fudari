import type { Metadata } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

// Self-hosted so the production build cannot fail on a Google Fonts fetch,
// and so first paint costs users no third-party round trip.
const wixMadefor = localFont({
  src: '../fonts/wix-madefor-display.woff2',
  weight: '400 800',
  style: 'normal',
  variable: '--font-wix-madefor',
  display: 'swap',
});

const caveat = localFont({
  src: '../fonts/caveat.woff2',
  weight: '400 700',
  style: 'normal',
  variable: '--font-caveat',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: "TUFIXIT Kenya: Get It Fixed Today",
    template: "%s | TUFIXIT Kenya",
  },
  description:
    "Hire verified service providers in Nairobi and across Kenya. Book trusted electricians, plumbers, mechanics, movers, transport providers and more on TUFIXIT.",
  keywords: [
    // Brand
    "tufixit", "tufixit kenya", "tufixit nairobi",
    // Core intent
    "jua kali", "jua kali nairobi", "find artisan kenya", "hire handyman nairobi",
    "home services kenya", "service provider kenya", "book artisan online kenya",
    // Skill-specific
    "electrician nairobi", "electrician kenya", "licensed electrician kenya",
    "plumber nairobi", "plumber kenya", "emergency plumber nairobi",
    "mechanic nairobi", "mechanic kenya", "mobile mechanic kenya",
    "carpenter nairobi", "carpenter kenya", "furniture carpenter kenya",
    "painter nairobi", "painter kenya", "house painter nairobi",
    "welder nairobi", "welder kenya", "fabrication kenya",
    "hvac technician kenya", "appliance repair nairobi",
    "roofing contractor kenya", "tiler kenya", "mason nairobi",
    "gardener nairobi", "cleaner nairobi", "fumigation kenya",
    "solar technician kenya", "cctv installer nairobi", "locksmith nairobi",
    "movers nairobi", "house movers kenya", "office movers nairobi",
    "transport provider kenya", "pickup transport nairobi", "truck for hire kenya",
    "event lighting kenya", "stage lighting nairobi", "party lighting services kenya",
    // Location + service combos
    "verified artisans kenya", "trusted handyman kenya", "artisan marketplace kenya",
  ],
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TUFIXIT",
  },
  metadataBase: new URL("https://tufixit.com"),
  alternates: {
    canonical: "https://tufixit.com",
    languages: {
      "en-KE": "https://tufixit.com",
    },
  },
  openGraph: {
    type: "website",
    locale: "en_KE",
    url: "https://tufixit.com",
    siteName: "TUFIXIT",
    title: "TUFIXIT – Find Verified Artisans & Service Providers in Kenya",
    description:
      "Kenya's #1 Jua Kali marketplace. Book verified electricians, plumbers, mechanics, movers, transport providers, event lighting pros and more in Nairobi, Mombasa & beyond.",
    images: [
      {
        url: "https://tufixit.com/liston/images/header/lg-01.jpg",
        width: 1200,
        height: 630,
        alt: "TUFIXIT – Kenya's Jua Kali Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@tufixit_ke",
    creator: "@tufixit_ke",
    title: "TUFIXIT – Verified Artisans Near You in Kenya",
    description: "Book verified Jua Kali workers in seconds. Electricians, plumbers, mechanics, movers, transport providers & more across Kenya.",
    images: ["https://tufixit.com/liston/images/header/lg-01.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  category: "marketplace",
  classification: "Home Services / Jua Kali Marketplace",
  referrer: "origin-when-cross-origin",
  formatDetection: { telephone: true, address: true },
  verification: {
    // Replace these with real tokens once Search Console / Bing Webmaster are set up
    google: "REPLACE_WITH_GOOGLE_SEARCH_CONSOLE_TOKEN",
    other: { "msvalidate.01": "REPLACE_WITH_BING_WEBMASTER_TOKEN" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-KE" className={`${wixMadefor.variable} ${caveat.variable}`}>
      <head>
        <meta name="theme-color" content="#F84525" />
        {/* Geo meta for local SEO */}
        <meta name="geo.region" content="KE" />
        <meta name="geo.placename" content="Nairobi, Kenya" />
        <meta name="geo.position" content="-1.286389;36.817223" />
        <meta name="ICBM" content="-1.286389, 36.817223" />
        {/* Critical CSS — route-specific plugin CSS is loaded by the route that needs it */}
        <link rel="stylesheet" href="/liston/plugins/bootstrap/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/liston/plugins/fontawesome/css/all.min.css" />
        <link rel="stylesheet" href="/liston/css/style.css" />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": "https://tufixit.com/#website",
              name: "TUFIXIT",
              alternateName: "TuFixIt Kenya",
              url: "https://tufixit.com",
              description: "Kenya's #1 Jua Kali marketplace connecting customers with verified artisans",
              inLanguage: "en-KE",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: "https://tufixit.com/artisans?category={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": "https://tufixit.com/#organization",
              name: "TuFixIt Limited",
              alternateName: "TUFIXIT",
              url: "https://tufixit.com",
              logo: {
                "@type": "ImageObject",
                url: "https://tufixit.com/favicon.svg",
                width: 512,
                height: 512,
              },
              description: "Kenya's leading digital marketplace for verified Jua Kali artisans and home service providers.",
              foundingDate: "2024",
              foundingLocation: "Nairobi, Kenya",
              areaServed: { "@type": "Country", name: "Kenya" },
              address: {
                "@type": "PostalAddress",
                addressLocality: "Nairobi",
                addressCountry: "KE",
              },
              contactPoint: [
                {
                  "@type": "ContactPoint",
                  telephone: "+254703954539",
                  contactType: "customer support",
                  areaServed: "KE",
                  availableLanguage: ["English", "Swahili"],
                },
              ],
              email: "info@tufixit.com",
              sameAs: [
                "https://www.facebook.com/tufixit",
                "https://www.instagram.com/tufixit_ke",
                "https://twitter.com/tufixit_ke",
                "https://www.linkedin.com/company/tufixit",
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              "@id": "https://tufixit.com/#localbusiness",
              name: "TUFIXIT",
              url: "https://tufixit.com",
              telephone: "+254703954539",
              email: "info@tufixit.com",
              description: "Digital marketplace connecting Kenyan customers with verified Jua Kali artisans for home, vehicle and commercial services.",
              priceRange: "KES 0–3000/mo (artisan plans)",
              currenciesAccepted: "KES",
              paymentAccepted: "M-Pesa, Cash",
              address: {
                "@type": "PostalAddress",
                addressLocality: "Nairobi",
                addressRegion: "Nairobi County",
                addressCountry: "KE",
              },
              geo: {
                "@type": "GeoCoordinates",
                latitude: -1.286389,
                longitude: 36.817223,
              },
              areaServed: [
                { "@type": "City", name: "Nairobi" },
                { "@type": "City", name: "Mombasa" },
                { "@type": "City", name: "Kisumu" },
                { "@type": "City", name: "Nakuru" },
                { "@type": "City", name: "Eldoret" },
                { "@type": "Country", name: "Kenya" },
              ],
              hasOfferCatalog: {
                "@type": "OfferCatalog",
                name: "Home & Commercial Services",
                itemListElement: [
                  { "@type": "Offer", itemOffered: { "@type": "Service", name: "Electrician" } },
                  { "@type": "Offer", itemOffered: { "@type": "Service", name: "Plumber" } },
                  { "@type": "Offer", itemOffered: { "@type": "Service", name: "Mechanic" } },
                  { "@type": "Offer", itemOffered: { "@type": "Service", name: "Painter" } },
                  { "@type": "Offer", itemOffered: { "@type": "Service", name: "Carpenter" } },
                  { "@type": "Offer", itemOffered: { "@type": "Service", name: "Welder" } },
                  { "@type": "Offer", itemOffered: { "@type": "Service", name: "HVAC Technician" } },
                  { "@type": "Offer", itemOffered: { "@type": "Service", name: "Solar Technician" } },
                  { "@type": "Offer", itemOffered: { "@type": "Service", name: "Mover" } },
                  { "@type": "Offer", itemOffered: { "@type": "Service", name: "Transport Provider" } },
                  { "@type": "Offer", itemOffered: { "@type": "Service", name: "Event Lighting" } },
                ],
              },
            }),
          }}
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>

        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script
              id="google-analytics"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);} 
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
                `,
              }}
            />
          </>
        ) : null}

        {/* Only Bootstrap's bundle is global — it drives navbar collapse, offcanvas, modals and dropdowns.
            jQuery and its plugins were removed: nothing in src/ used them. */}
        <Script src="/liston/plugins/bootstrap/js/bootstrap.bundle.min.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
