import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://personal-store-alpha.vercel.app'),
  title: {
    default: "Personal Store - Your Centralized Clipboard Vault",
    template: "%s | Personal Store",
  },
  description: "Securely manage snippets, clipboard history, tasks, links, and secrets. Sync seamlessly between devices and share instantly with Personal Store.",
  keywords: [
    "clipboard manager", 
    "snippet store", 
    "code snippets", 
    "secret sharing", 
    "burn after reading", 
    "todo list", 
    "developer tools", 
    "productivity app",
    "secure notes",
    "link manager"
  ],
  authors: [
    {
      name: "Mangesh Dalvi",
      url: "https://github.com/dalvimangesh",
    },
  ],
  creator: "Mangesh Dalvi",
  publisher: "Mangesh Dalvi",
  icons: {
    icon: "/logo.svg",
    shortcut: "/favicon.ico",
    apple: "/logo.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://personal-store-alpha.vercel.app",
    title: "Personal Store - Your Centralized Clipboard Vault",
    description: "The all-in-one tool for developers to manage snippets, tasks, links, and secure secrets across devices.",
    siteName: "Personal Store",
    images: [
      {
        url: "/logo.svg", // Ideally this would be a larger OG image, but using logo as fallback
        width: 800,
        height: 600,
        alt: "Personal Store Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Personal Store - Your Centralized Clipboard Vault",
    description: "Manage snippets, tasks, and secure secrets seamlessly across devices.",
    images: ["/logo.svg"],
    creator: "@dalvimangesh", // Assuming handle based on github, customizable
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "0rvZm8Tvs1NiN4_8PFIjs66Ow4huuOqvsK3e_k2bSuM",
  },
  alternates: {
    canonical: "https://personal-store-alpha.vercel.app",
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
