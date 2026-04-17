import type { Metadata } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const res = await fetch(`${API_URL}/workers/${id}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error("Worker not found");

    const worker = await res.json();
    const name = `${worker.firstName} ${worker.lastName}`;
    const skill =
      worker.skills?.[0]?.skillType?.replace(/_/g, " ") || "Artisan";
    const location = worker.locationName || "Kenya";
    const title = `${name} — ${skill} in ${location}`;
    const description = `Hire ${name}, a verified ${skill.toLowerCase()} in ${location}. ${worker.totalReviews} reviews, ${worker.totalJobsCompleted} jobs completed. Book on TUFIXIT.`;

    return {
      title,
      description,
      openGraph: {
        title: `${title} | TUFIXIT`,
        description,
        url: `https://tufixit.com/artisans/${id}`,
        images: worker.profileImage
          ? [{ url: worker.profileImage, width: 400, height: 400, alt: name }]
          : undefined,
      },
      alternates: {
        canonical: `https://tufixit.com/artisans/${id}`,
      },
    };
  } catch {
    return {
      title: "Artisan Profile",
      description: "View artisan profile on TUFIXIT — Kenya's Jua Kali marketplace.",
    };
  }
}

export default function ArtisanDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
