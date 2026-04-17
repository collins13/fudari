import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing Plans for Artisans",
  description:
    "Choose a TUFIXIT subscription plan — Free, Basic (KES 300/mo), or Pro (KES 1,500/mo). Get more listings, analytics, featured badges, and priority search visibility.",
  openGraph: {
    title: "Pricing Plans for Artisans | TUFIXIT",
    description:
      "Affordable subscription plans for Kenyan artisans. Start free, upgrade to get more visibility and bookings.",
    url: "https://tufixit.com/pricing",
  },
  alternates: {
    canonical: "https://tufixit.com/pricing",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
