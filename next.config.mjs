/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Verification builds set NEXT_DIST_DIR (e.g. ".next-ci") so a production
  // build can run alongside a live `next dev` without both corrupting .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};
export default nextConfig;
