import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mobile View | Personal Store",
  description: "Mobile optimized view of Personal Store",
};

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden">
       {/* Mobile specific layout wrapper */}
       <div className="flex-1 overflow-hidden relative">
         {children}
       </div>
    </div>
  );
}
