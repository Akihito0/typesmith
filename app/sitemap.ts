import type { MetadataRoute } from "next";
import { absoluteUrl, PUBLIC_ROUTES } from "@/lib/site";

// Static export emits this as /sitemap.xml. URLs are absolute and include the
// base path, so it stays correct whether the site is served from a sub-path
// (GitHub Pages) or a domain root.

// /editor is the app itself: one route whose entire state lives in a ?s= query
// param. Listing it is right; listing share links would not be.
const PRIORITY: Record<string, number> = {
  "/": 1,
  "/editor": 0.9,
  "/changelog": 0.5,
  "/privacy": 0.3,
  "/terms": 0.3,
};

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_ROUTES.map((route) => ({
    url: absoluteUrl(route),
    lastModified,
    changeFrequency: route === "/changelog" ? ("weekly" as const) : ("monthly" as const),
    priority: PRIORITY[route] ?? 0.5,
  }));
}
