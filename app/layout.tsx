import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { GOOGLE_FONTS_HREF } from "@/backend/fonts/catalog";
import { absoluteUrl, SITE_ORIGIN } from "@/backend/site";
import "@/frontend/styles/globals.css";

export const viewport: Viewport = {
  themeColor: "#171717",
};

export const metadata: Metadata = {
  // Origin only — Next adds the basePath itself when it resolves og:image.
  metadataBase: new URL(SITE_ORIGIN),
  title: "TypeSmith — Precision typography and UI design, in one tool",
  description:
    "Generate type scales, check WCAG contrast, pair fonts, and preview real-world mockups instantly. Free, no signup, shareable by link.",
  // The landing page is a client component and can't export metadata, so "/"
  // is canonicalised here. Routes with their own metadata override this;
  // /editor does it from app/editor/layout.tsx.
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    title: "TypeSmith — Precision typography and UI design, in one tool",
    description:
      "Generate type scales, check WCAG contrast, pair fonts, and preview real-world mockups instantly. Free, no signup, shareable by link.",
    siteName: "TypeSmith",
    type: "website",
    url: absoluteUrl("/"),
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} bg-canvas`}>
      <head>
        {/* Preload connection + the curated preview faces */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={GOOGLE_FONTS_HREF} />
      </head>
      <body className="bg-canvas text-ink antialiased">{children}</body>
    </html>
  );
}
