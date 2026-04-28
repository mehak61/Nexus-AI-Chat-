import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nexus AI",
  description: "Smart AI Assistant",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}