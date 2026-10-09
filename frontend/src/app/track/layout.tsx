import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Track Your Booking',
  description:
    'Enter your FUDARI booking code to see your job status, your assigned pro and your start and completion PINs.',
  alternates: { canonical: 'https://fudari.co/track' },
  robots: { index: false, follow: false },
};

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
