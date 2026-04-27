import type { Metadata } from "next";
import Script from "next/script";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TUFIXIT - Find Trusted Service Providers in Kenya",
    template: "%s | TUFIXIT",
  },
  description:
    "Kenya's #1 Jua Kali marketplace. Find verified electricians, plumbers, mechanics, painters, carpenters and more near you. Direct contact via phone or WhatsApp.",
  keywords: [
    "tufixit", "service provider kenya", "artisan kenya", "electrician nairobi", "plumber kenya",
    "mechanic nairobi", "jua kali", "artisan kenya", "home services kenya",
    "handyman nairobi", "carpenter kenya", "painter nairobi", "welder kenya",
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
  },
  openGraph: {
    type: "website",
    locale: "en_KE",
    url: "https://tufixit.com",
    siteName: "TUFIXIT",
    title: "TUFIXIT - Find Trusted Service Providers in Kenya",
    description:
      "Kenya's #1 Jua Kali marketplace. Find verified artisans for electrical, plumbing, mechanics, and more.",
    images: [
      {
        url: "/liston/images/header/lg-01.jpg",
        width: 1200,
        height: 630,
        alt: "TUFIXIT - Kenya's Jua Kali Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TUFIXIT - Find Trusted Service Providers in Kenya",
    description: "Kenya's #1 Jua Kali marketplace. Verified artisans near you.",
    images: ["/liston/images/header/lg-01.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#F84525" />
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Wix+Madefor+Display:wght@400;500;600;700;800&family=Caveat:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Template CSS */}
        <link rel="stylesheet" href="/liston/plugins/aos/aos.min.css" />
        <link rel="stylesheet" href="/liston/plugins/bootstrap/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/liston/plugins/fontawesome/css/all.min.css" />
        <link rel="stylesheet" href="/liston/plugins/OwlCarousel2/css/owl.carousel.min.css" />
        <link rel="stylesheet" href="/liston/plugins/OwlCarousel2/css/owl.theme.default.min.css" />
        <link rel="stylesheet" href="/liston/plugins/ion.rangeSlider/ion.rangeSlider.min.css" />
        <link rel="stylesheet" href="/liston/plugins/magnific-popup/magnific-popup.css" />
        <link rel="stylesheet" href="/liston/plugins/select2/select2.min.css" />
        <link rel="stylesheet" href="/liston/plugins/select2-bootstrap-5/select2-bootstrap-5-theme.min.css" />
        <link rel="stylesheet" href="/liston/css/style.css" />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "TUFIXIT",
              url: "https://tufixit.com",
              description: "Kenya's #1 Jua Kali marketplace for verified artisans",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://tufixit.com/artisans?category={search_term_string}",
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
              "@type": "LocalBusiness",
              name: "TUFIXIT",
              url: "https://tufixit.com",
              description: "Platform connecting customers with verified Jua Kali artisans in Kenya",
              areaServed: { "@type": "Country", name: "Kenya" },
              serviceType: ["Electrician", "Plumber", "Mechanic", "Painter", "Carpenter", "Welder"],
            }),
          }}
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
        {/* Scripts - load in order */}
        <Script
          src="/liston/plugins/jQuery/jquery.min.js"
          strategy="beforeInteractive"
        />
        <Script src="/liston/plugins/bootstrap/js/bootstrap.bundle.min.js" strategy="afterInteractive" />
        <Script src="/liston/plugins/aos/aos.min.js" strategy="afterInteractive" />
        <Script src="/liston/plugins/OwlCarousel2/owl.carousel.min.js" strategy="afterInteractive" />
        <Script src="/liston/plugins/ion.rangeSlider/ion.rangeSlider.min.js" strategy="afterInteractive" />
        <Script src="/liston/plugins/magnific-popup/jquery.magnific-popup.min.js" strategy="afterInteractive" />
        <Script src="/liston/plugins/select2/select2.min.js" strategy="afterInteractive" />
        <Script src="/liston/plugins/theia-sticky-sidebar/ResizeSensor.min.js" strategy="afterInteractive" />
        <Script src="/liston/plugins/theia-sticky-sidebar/theia-sticky-sidebar.min.js" strategy="afterInteractive" />
        <Script src="/liston/plugins/waypoints/jquery.waypoints.min.js" strategy="afterInteractive" />
        <Script src="/liston/plugins/counter-up/jquery.counterup.min.js" strategy="afterInteractive" />
        <Script src="/liston/plugins/macy/macy.js" strategy="afterInteractive" />
        <Script src="/liston/js/script.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
