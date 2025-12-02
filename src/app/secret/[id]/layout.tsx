import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Secure Message",
  description: "You have received a secure, one-time message via Personal Store.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SecretLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

