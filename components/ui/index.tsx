"use client";

import React from "react";

// ---- Button ---------------------------------------------------------------
type ButtonVariant = "primary" | "outline" | "ghost" | "dark";
export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none px-4 h-9";
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-brand-600 text-white hover:bg-brand-700",
    outline: "border border-line bg-white text-ink hover:bg-surface",
    ghost: "text-ink hover:bg-surface",
    dark: "bg-[#111827] text-white hover:bg-black",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

// ---- Select ---------------------------------------------------------------
export function Select({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={`relative ${className}`}>
      <select
        className="w-full appearance-none rounded-md border border-line bg-white px-3 pr-8 h-8 text-sm text-ink focus:border-brand-600"
        {...props}
      >
        {children}
      </select>
      <Chevron className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted" />
    </div>
  );
}

// ---- Toggle ---------------------------------------------------------------
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition-colors ${
        checked ? "bg-brand-600" : "bg-gray-300"
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ---- Segmented control (Edit / View, Log In / Sign Up, tabs) --------------
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "px-2.5 h-6 text-xs" : "px-3 h-7 text-sm";
  return (
    <div className="inline-flex rounded-md border border-line bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`${pad} rounded font-medium transition-colors ${
            value === o.value
              ? "bg-white text-ink shadow-sm"
              : "text-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---- Minimal inline icons (no dependency) ---------------------------------
export function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold ${className}`}>
      <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-600 text-white text-[13px] font-bold">
        T
      </span>
      <span>TypeSmith</span>
    </span>
  );
}

export function Check({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.14" />
      <path d="M8 12.5l2.5 2.5 5-5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Undo({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Redo({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Shuffle({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
