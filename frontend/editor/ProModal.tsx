"use client";

import { useEffect, useRef } from "react";
import { Button, Check } from "@/frontend/ui";
import { useFocusTrap } from "@/frontend/ui/useFocusTrap";
import { isProUnlocked, PRO_STATUS_NOTICE } from "@/backend/project/pro";

// Opened by "Upgrade to Pro". While the beta runs there is no billing — the
// Pro layouts are already unlocked for everyone — so this is an honest status
// card, not a checkout. It becomes the upsell when PRO_BETA_FREE flips
// (lib/pro.ts); no copy here needs editing at that point.
const PRO_FEATURES = [
  "Slides layout — present your type system as a deck",
  "Social layout — post and link-card mockups",
  "Newsletter layout — email preview",
];

export function ProModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="TypeSmith Pro"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-ink">TypeSmith Pro</h3>
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
          Layouts for teams that present type systems to clients
          {isProUnlocked() ? " — all unlocked in the sidebar." : "."}
        </p>

        <ul className="mt-4 space-y-2.5">
          {PRO_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-[13px] text-ink">
              <Check className="mt-0.5 shrink-0 text-brand-600" />
              {f}
            </li>
          ))}
        </ul>

        <div className="mt-5 rounded-md bg-surface px-3.5 py-3 text-[12px] leading-relaxed text-muted">
          {PRO_STATUS_NOTICE}
        </div>

        <Button className="mt-5 h-10 w-full" onClick={onClose}>
          {isProUnlocked() ? "Got it" : "Close"}
        </Button>
      </div>
    </div>
  );
}
