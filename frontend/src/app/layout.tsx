import type { Metadata } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import { AuthProvider } from "@/context/AuthContext";
import MobileBottomNav from "@/components/MobileBottomNav";
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
    default: "FUDARI Kenya: Get It Fixed Today",
    template: "%s | FUDARI Kenya",
  },
  description:
    "Book verified local pros across Kenya — plumbers, electricians, cleaners, mama fua, movers, barbers and IT techs. No login needed, pay on completion.",
  keywords: [
    // Brand
    "fudari", "fudari kenya", "fudari nairobi",
    // Core intent
    "local services kenya", "book services online kenya", "service provider kenya",
    "jua kali", "jua kali nairobi", "find artisan kenya", "hire handyman nairobi",
    "home services kenya", "book artisan online kenya",
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
    // Expanded verticals
    "mama fua nairobi", "laundry services kenya", "house help nairobi",
    "boda boda nairobi", "tuk tuk kenya", "courier services nairobi", "same day delivery kenya",
    "barber nairobi", "mobile barber kenya", "hair salon nairobi", "braiding nairobi",
    "makeup artist nairobi", "nail technician kenya",
    "car wash nairobi", "car detailing kenya", "tyre services nairobi", "puncture repair kenya",
    "photographer nairobi", "event photographer kenya", "graphic designer nairobi",
    "logo design kenya", "it technician nairobi", "laptop repair kenya",
    // Location + service combos
    "verified service providers kenya", "trusted handyman kenya", "services marketplace kenya",
  ],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FUDARI",
  },
  metadataBase: new URL("https://fudari.co"),
  alternates: {
    canonical: "https://fudari.co",
    languages: {
      "en-KE": "https://fudari.co",
    },
  },
  openGraph: {
    type: "website",
    locale: "en_KE",
    url: "https://fudari.co",
    siteName: "FUDARI",
    title: "FUDARI – Book Verified Local Service Providers in Kenya",
    description:
      "Kenya's local services marketplace. Book verified artisans, cleaners, mama fua, boda boda, movers, barbers, salons, car wash, photographers, designers and IT pros in Nairobi, Mombasa & beyond.",
    images: [
      {
        url: "https://fudari.co/liston/images/header/lg-01.jpg",
        width: 1200,
        height: 630,
        alt: "FUDARI – Kenya's Local Services Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@fudari_ke",
    creator: "@fudari_ke",
    title: "FUDARI – Verified Service Providers Near You in Kenya",
    description: "Book verified local pros in seconds. Artisans, cleaners, mama fua, boda boda, movers, barbers, salons, car wash, photographers & IT across Kenya.",
    images: ["https://fudari.co/liston/images/header/lg-01.jpg"],
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
  classification: "Local Services Marketplace",
  referrer: "origin-when-cross-origin",
  formatDetection: { telephone: true, address: true },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
      : undefined,
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
        <meta name="theme-color" content="#0D5C63" />
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
              "@id": "https://fudari.co/#website",
              name: "FUDARI",
              alternateName: "Fudari Kenya",
              url: "https://fudari.co",
              description: "Kenya's local services marketplace connecting customers with verified service providers",
              inLanguage: "en-KE",
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": "https://fudari.co/#organization",
              name: "Fudari Limited",
              alternateName: "FUDARI",
              url: "https://fudari.co",
              logo: {
                "@type": "ImageObject",
                url: "https://fudari.co/favicon.svg",
                width: 512,
                height: 512,
              },
              description: "Kenya's leading digital marketplace for verified local service providers — artisans, cleaning, transport, beauty, automotive and digital services.",
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
              email: "info@fudari.co",
              sameAs: [
                "https://www.facebook.com/fudari",
                "https://www.instagram.com/fudari_ke",
                "https://twitter.com/fudari_ke",
                "https://www.linkedin.com/company/fudari",
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
              "@id": "https://fudari.co/#localbusiness",
              name: "FUDARI",
              url: "https://fudari.co",
              telephone: "+254703954539",
              email: "info@fudari.co",
              description: "Digital marketplace connecting Kenyan customers with verified local service providers for home, vehicle, personal care, delivery and digital services.",
              priceRange: "KES 0–3000/mo (provider plans)",
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
        <AuthProvider>
          {children}
          <MobileBottomNav />
        </AuthProvider>

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
