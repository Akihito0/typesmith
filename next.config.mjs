// Verification builds set NEXT_DIST_DIR (e.g. ".next-ci") so a production
// build can run alongside a live `next dev` without both corrupting .next.
// GITHUB_PAGES=true switches to a fully static export under the /typesmith
// base path for GitHub Pages (the app is client-side only, so nothing is
// lost); NEXT_PUBLIC_BASE_PATH must be set to the same base path so share
// links resolve (see lib/share.ts).
const isPages = process.env.GITHUB_PAGES === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  ...(isPages && {
    output: "export",
    basePath: "/typesmith",
    images: { unoptimized: true },
  }),
};
export default nextConfig;
