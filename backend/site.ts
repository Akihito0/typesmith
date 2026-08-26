// Where the site actually lives. One source of truth for metadata, canonical
// URLs, the sitemap, and robots.txt.
//
// Two separate env vars, because they answer different questions:
//   NEXT_PUBLIC_SITE_URL   the origin (scheme + host), e.g. https://x.github.io
//   NEXT_PUBLIC_BASE_PATH  the sub-path the app is served under, e.g. /typesmith
//
// Keep the origin free of a path. Next already prepends basePath to the asset
// URLs it resolves against metadataBase (og:image and friends), so folding the
// base path into the origin double-prefixes them — which is exactly how the
// og:image ended up pointing at localhost with a /typesmith/ path glued on.
//
// Both are set by .github/workflows/deploy.yml. Locally they're unset and
// everything falls back to localhost, which is what you want in dev.

export const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Public root of the site, base path included, no trailing slash. */
export const SITE_URL = `${SITE_ORIGIN.replace(/\/$/, "")}${BASE_PATH}`;

/** Absolute URL for a route — what canonical, og:url, and the sitemap need. */
export function absoluteUrl(path: string): string {
  const clean = path === "/" ? "" : `/${path.replace(/^\/+|\/+$/g, "")}`;
  return `${SITE_URL}${clean}` || "/";
}

/** Every indexable route. /editor is excluded on purpose — see app/sitemap.ts. */
export const PUBLIC_ROUTES = ["/", "/editor", "/changelog", "/privacy", "/terms"] as const;
export type PublicRoute = (typeof PUBLIC_ROUTES)[number];

/**
 * Per-page canonical + og:url. Without this every page inherits the layout's
 * metadata and they all claim to be the same URL, which is worse for search
 * than having no canonical at all.
 */
export function pageUrlMetadata(path: PublicRoute) {
  const url = absoluteUrl(path);
  return {
    alternates: { canonical: url },
    openGraph: { url },
  };
}
