import Link from "next/link";

export function NotFoundScreen() {
  return (
    <main className="ts-light grid min-h-screen place-items-center bg-canvas px-6 text-white">
      <div className="max-w-md text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-500">
          404 &mdash; Missing glyph
        </p>
        <h1 className="mt-3 font-display text-4xl font-medium">
          This page isn&apos;t in the specimen.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-400">
          The URL doesn&apos;t match anything in the system. The editor and the landing page are
          still exactly where they should be.
        </p>
        <div className="mt-8 flex items-center justify-center gap-6">
          <Link
            href="/editor"
            className="chamfer bg-brand-600 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.15em] text-white transition-colors hover:bg-brand-700"
          >
            Open the editor
          </Link>
          <Link
            href="/"
            className="link-underline font-mono text-[11px] uppercase tracking-[0.15em] text-gray-400 hover:text-white"
          >
            Back home -&gt;
          </Link>
        </div>
      </div>
    </main>
  );
}
