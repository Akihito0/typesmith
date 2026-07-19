"use client";

// Root error boundary: keeps a crash inside the app's design language and
// always offers a way back. Client-side only — there's no server to log to,
// so the console carries the details.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-6 text-white">
      <div className="max-w-md text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-500">
          Runtime error
        </p>
        <h1 className="mt-3 font-display text-4xl font-medium">Something broke.</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-400">
          The editor state is safe — projects autosave locally. Try again, or reload the page.
        </p>
        {error?.message && (
          <p className="mt-4 truncate rounded border border-canvas-line bg-canvas-panel px-3 py-2 font-mono text-[11px] text-gray-500">
            {error.message}
          </p>
        )}
        <div className="mt-8 flex items-center justify-center gap-6">
          <button
            onClick={reset}
            className="chamfer bg-brand-600 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.15em] text-white transition-colors hover:bg-brand-700"
          >
            Try again
          </button>
          <a
            href="/"
            className="link-underline font-mono text-[11px] uppercase tracking-[0.15em] text-gray-400 hover:text-white"
          >
            Back home -&gt;
          </a>
        </div>
      </div>
    </main>
  );
}
