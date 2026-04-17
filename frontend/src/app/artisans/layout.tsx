import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find Artisans Near You",
  description:
    "Browse verified Jua Kali artisans in Kenya — electricians, plumbers, mechanics, painters, carpenters, welders and more. Compare ratings, read reviews, and book directly.",
  openGraph: {
    title: "Find Artisans Near You | TUFIXIT",
    description:
      "Browse verified Jua Kali artisans in Kenya. Compare ratings, read reviews, and book directly.",
    url: "https://tufixit.com/artisans",
  },
  alternates: {
    canonical: "https://tufixit.com/artisans",
  },
};

export default function ArtisansLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
