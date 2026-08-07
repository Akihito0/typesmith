import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

// Static export emits this as /robots.txt.

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Share links carry an entire project in the query string. They're
      // meant to be passed person to person, not crawled and indexed as
      // thousands of near-duplicate pages.
      disallow: "/editor?s=",
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
