import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Your Password",
  description: "Reset the password for your FUDARI account using a code sent to your phone or email.",
  robots: { index: false, follow: true },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
