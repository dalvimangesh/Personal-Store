import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Store",
  description: "Your centralized clipboard vault.",
  icons: {
    icon: "/logo.svg",
  },
  verification: {
    google: "0rvZm8Tvs1NiN4_8PFIjs66Ow4huuOqvsK3e_k2bSuM",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
