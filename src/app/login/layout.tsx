import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Access your Personal Store account to manage snippets, tasks, and more.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

