// The Next app lives in frontend/, so this is the Next project root: distDir,
// public/ and the export `out/` all resolve from here, not from the repo root.
//
// Verification builds set NEXT_DIST_DIR (e.g. ".next-ci") so a production build
// can run alongside a live `next dev` without both corrupting .next.
// GITHUB_PAGES=true switches to a fully static export under the /typesmith base
// path for GitHub Pages (the app is client-side only, so nothing is lost);
// NEXT_PUBLIC_BASE_PATH must be set to the same base path so share links
// resolve (see backend/site.ts).
const isPages = process.env.GITHUB_PAGES === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // backend/ is a sibling of this directory, outside the Next root, so Next has
  // to be told it may compile TypeScript from there.
  experimental: { externalDir: true },
  ...(isPages && {
    output: "export",
    basePath: "/typesmith",
    images: { unoptimized: true },
  }),
};
export default nextConfig;
