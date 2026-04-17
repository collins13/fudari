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
  turbopack: {},
};

export default withPWA(nextConfig);
