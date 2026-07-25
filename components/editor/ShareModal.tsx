"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { encodeQr, qrToSvg } from "@/lib/qr";
import { Button } from "@/components/ui";
import { useFocusTrap } from "@/components/ui/useFocusTrap";

// Opened by the toolbar's Share button (which has already copied the link).
// Shows the link itself plus a scannable QR — the point of the QR is getting a
// project onto a phone to check the type on a real screen, which is exactly
// what the mobile mockup is for.
export function ShareModal({
  open,
  url,
  onClose,
}: {
  open: boolean;
  url: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Share links run long (a few hundred bytes), and the payload drives the
  // module count: a version-15 code is 77 modules, which at this display size
  // is under 4px per module — right at the edge of what a phone camera
  // resolves. So prefer level M for its error correction, but drop to L when
  // that buys a coarser grid, which matters more here than redundancy does on
  // a clean screen.
  const qrSvg = useMemo(() => {
    if (!url) return null;
    let best: { svg: string; version: number } | null = null;
    for (const ecc of ["M", "L"] as const) {
      try {
        const qr = encodeQr(url, ecc);
        if (!best || qr.version < best.version) {
          best = { svg: qrToSvg(qr, { margin: 4, dark: "#111827" }), version: qr.version };
        }
      } catch {
        // Too long at this level — try the next one.
      }
    }
    return best?.svg ?? null;
  }, [url]);

  if (!open) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy your share link:", url);
    }
  };

  const downloadQr = () => {
    if (!qrSvg) return;
    const blob = new Blob([qrSvg], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "typesmith-share-qr.svg";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Share this project"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-ink">Share this project</h3>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <p className="mt-1 text-[13px] text-muted">
          The whole project travels in the link — no account, nothing stored on a server.
        </p>

        <div className="mt-4 grid place-items-center rounded-lg border border-line bg-surface p-4">
          {qrSvg ? (
            // Inline SVG data URI generated on the client — there's nothing for
            // next/image to optimise, and it isn't an LCP candidate inside a
            // modal.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`}
              alt="QR code for this project's share link"
              width={288}
              height={288}
              className="h-[288px] w-[288px] max-w-full"
            />
          ) : (
            <p className="px-2 py-8 text-center text-[12px] leading-relaxed text-muted">
              This project&apos;s link is too long to fit in a QR code. Trim the mockup copy or
              share the URL directly.
            </p>
          )}
        </div>

        <label className="mt-4 block text-[10px] font-semibold uppercase tracking-wider text-muted">
          Link
        </label>
        <input
          readOnly
          value={url}
          aria-label="Share link"
          onFocus={(e) => e.currentTarget.select()}
          className="mt-1 w-full rounded-md border border-line bg-white px-2.5 py-2 font-mono text-[11px] text-ink"
        />

        <div className="mt-4 flex gap-2">
          <Button className="h-10 flex-1" onClick={copy}>
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button variant="outline" className="h-10 flex-1" onClick={downloadQr} disabled={!qrSvg}>
            Download QR
          </Button>
        </div>
      </div>
    </div>
  );
}
