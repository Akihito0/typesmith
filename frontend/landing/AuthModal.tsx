"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Segmented } from "@/frontend/ui";
import { useFocusTrap } from "@/frontend/ui/useFocusTrap";

// Auth is intentionally optional — the proposal's core promise is "no signup
// required." The modal exists for people who want to save work later, but
// "Skip for now" always drops straight into the editor.
export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const enterEditor = () => {
    onClose();
    router.push("/editor");
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to TypeSmith"
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-muted hover:text-ink"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="flex justify-center">
          <Segmented
            options={[
              { label: "Log In", value: "login" },
              { label: "Sign Up", value: "signup" },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            enterEditor();
          }}
        >
          <label className="block">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Email
            </span>
            <input
              type="email"
              required
              placeholder="name@company.com"
              className="mt-1.5 w-full rounded-md border border-line px-3 h-10 text-sm focus:border-brand-600"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Password
            </span>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="mt-1.5 w-full rounded-md border border-line px-3 h-10 text-sm focus:border-brand-600"
            />
          </label>
          <Button type="submit" className="h-10 w-full">
            {tab === "login" ? "Log In" : "Create Account"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
        </div>

        <Button variant="dark" className="h-10 w-full" onClick={enterEditor}>
          <GoogleG /> Continue with Google
        </Button>

        <p className="mt-5 text-center text-xs text-muted">
          {tab === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setTab(tab === "login" ? "signup" : "login")}
            className="font-medium text-brand-600 hover:underline"
          >
            {tab === "login" ? "Sign Up" : "Log In"}
          </button>
        </p>
        <p className="mt-1 text-center text-xs text-muted">
          You can also continue without an account.{" "}
          <button onClick={enterEditor} className="font-medium text-brand-600 hover:underline">
            Skip for now
          </button>
        </p>
      </div>
    </div>
  );
}

function GoogleG() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path
        fill="#fff"
        d="M12 11v3.6h5.05A4.34 4.34 0 0 1 7.6 12 4.4 4.4 0 0 1 12 7.6a4 4 0 0 1 2.83 1.1l2.6-2.6A8 8 0 1 0 20 12c0-.5-.05-1-.15-1H12z"
      />
    </svg>
  );
}
