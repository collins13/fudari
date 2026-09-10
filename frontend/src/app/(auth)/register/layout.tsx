import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join as a Pro — List Your Services",
  description:
    "Create a free FUDARI provider account, list your services and get found by customers across all 47 counties in Kenya.",
  alternates: { canonical: "https://fudari.co/register" },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
