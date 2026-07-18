import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { GOOGLE_FONTS_HREF } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "TypeSmith — Precision typography and UI design, in one tool",
  description:
    "Generate type scales, check WCAG contrast, pair fonts, and preview real-world mockups instantly. Free, no signup, shareable by link.",
  openGraph: {
    title: "TypeSmith — Precision typography and UI design, in one tool",
    description:
      "Generate type scales, check WCAG contrast, pair fonts, and preview real-world mockups instantly. Free, no signup, shareable by link.",
    siteName: "TypeSmith",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        {/* Preload connection + the curated preview faces */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={GOOGLE_FONTS_HREF} />
      </head>
      <body className="bg-white text-ink antialiased">{children}</body>
    </html>
  );
}
