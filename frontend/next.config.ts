import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      // Cache API calls for 5 minutes (artisan listings, categories)
      urlPattern: /\/api\/(listings|categories|workers|reviews\/public)/,
      handler: "StaleWhileRevalidate" as const,
      options: {
        cacheName: "api-cache",
        expiration: { maxEntries: 100, maxAgeSeconds: 300 },
      },
    },
    {
      // Cache images for 30 days
      urlPattern: /\.(png|jpg|jpeg|svg|webp|gif|ico)$/,
      handler: "CacheFirst" as const,
      options: {
        cacheName: "image-cache",
        expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    {
      // Cache Google Fonts
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
      handler: "StaleWhileRevalidate" as const,
      options: { cacheName: "google-fonts-stylesheets" },
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
      handler: "CacheFirst" as const,
      options: {
        cacheName: "google-fonts-webfonts",
        expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  turbopack: {},
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.fudari.co' }],
        destination: 'https://fudari.co/:path*',
        permanent: true,
      },
      // Legacy provider URLs. The numeric case is handled in the route so the
      // canonical keyword slug can be built from live data; this only catches
      // the /book sub-path, which has no SEO value of its own.
      { source: '/artisans/:id(\\d+)/book', destination: '/artisan/:id/book', permanent: true },
      // The service tree briefly lived three levels deep under a category slug.
      { source: '/services/:category/:service/:location', destination: '/services/:service/:location', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Allow any HTTPS image (CDNs, user-uploaded, avatars)
      { protocol: 'https', hostname: '**' },
      // Allow HTTP images from localhost (backend dev server)
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
    ],
  },
};

export default withPWA(nextConfig);
