import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join as a Pro — List Your Services",
  description:
    "Create a free FUDARI provider account, list your services and get found by customers across all 47 counties in Kenya.",
  alternates: { canonical: "https://fudari.co/register" },
  robots: { index: false, follow: true },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
