"use client";

import { useRouter } from "next/navigation";
import { useProject } from "@/lib/store";
import { Button } from "@/components/ui";
import type { ToolId } from "./types";

const DOCS_URL = "https://github.com/Akihito0/typesmith#readme";

// Left rail from the screenshots: Project Workspace header, DESIGN SYSTEM
// group (Style Guide / Type Scale / Colors), LAYOUTS group (Website / Mobile
// App, plus PRO-locked layouts from the roadmap), New Asset button.
const DESIGN_SYSTEM: { id: ToolId; label: string }[] = [
  { id: "style-guide", label: "Style Guide" },
  { id: "type-scale", label: "Type Scale" },
  { id: "colors", label: "Colors" },
];

const LAYOUTS: { id: ToolId; label: string; pro?: boolean }[] = [
  { id: "website", label: "Website" },
  { id: "mobile", label: "Mobile App" },
  { id: "slides", label: "Slides", pro: true },
  { id: "social", label: "Social", pro: true },
  { id: "newsletter", label: "Newsletter", pro: true },
];

export function Sidebar({
  active,
  onSelect,
}: {
  active: ToolId;
  onSelect: (t: ToolId) => void;
}) {
  const router = useRouter();
  const reset = useProject((s) => s.reset);

  const newAsset = () => {
    if (!window.confirm("Start a new project? Current settings will be replaced (undo is available).")) return;
    reset();
    onSelect("type-scale");
    // Drop any ?s= share param so the fresh state isn't re-hydrated over.
    router.replace("/editor");
  };

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-line bg-sidebar">
      {/* workspace header */}
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3.5">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-600 text-xs font-bold text-white">
          TS
        </span>
        <div className="leading-tight">
          <p className="text-[13px] font-semibold text-ink">Project Workspace</p>
          <p className="text-[11px] text-muted">TypeSmith Enterprise</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 ts-scroll">
        <Group label="Design System">
          {DESIGN_SYSTEM.map((item) => (
            <Item
              key={item.id}
              label={item.label}
              active={active === item.id}
              onClick={() => onSelect(item.id)}
            />
          ))}
        </Group>

        <Group label="Layouts">
          {LAYOUTS.map((item) => (
            <Item
              key={item.id}
              label={item.label}
              pro={item.pro}
              active={active === item.id}
              onClick={item.pro ? undefined : () => onSelect(item.id)}
            />
          ))}
        </Group>
      </nav>

      <div className="border-t border-line p-3">
        <Button variant="dark" className="w-full h-8 text-xs" onClick={newAsset}>+ New Asset</Button>
        <div className="mt-2.5 flex items-center justify-between px-1 text-[11px] text-muted">
          <a href={DOCS_URL} target="_blank" rel="noreferrer" className="hover:text-ink hover:underline">
            Docs
          </a>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-pass" /> Status: Operational
          </span>
        </div>
      </div>
    </aside>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Item({
  label,
  active,
  pro,
  onClick,
}: {
  label: string;
  active?: boolean;
  pro?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[13px] transition-colors ${
        active
          ? "bg-brand-50 font-medium text-brand-700"
          : onClick
            ? "text-ink hover:bg-surface"
            : "cursor-default text-muted/60"
      }`}
    >
      <span>{label}</span>
      {pro && (
        <span className="rounded border border-line bg-white px-1.5 py-px text-[9px] font-semibold uppercase text-muted">
          Pro
        </span>
      )}
    </button>
  );
}
