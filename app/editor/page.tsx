"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useProject } from "@/lib/store";
import { decodeState } from "@/lib/share";
import { Sidebar } from "@/components/editor/Sidebar";
import { Toolbar } from "@/components/editor/Toolbar";
import { ExportModal } from "@/components/editor/ExportModal";
import { TypeScalePanel } from "@/components/editor/panels/TypeScalePanel";
import { WebsiteMockup, MobileMockup, MockupControls } from "@/components/editor/panels/MockupPanel";
import { ContrastPanel } from "@/components/editor/panels/ContrastPanel";
import { StyleGuidePanel } from "@/components/editor/panels/StyleGuidePanel";
import type { ToolId } from "@/components/editor/types";

function EditorInner() {
  const params = useSearchParams();
  const hydrate = useProject((s) => s.hydrate);
  const mode = useProject((s) => s.mode);
  const [tool, setTool] = useState<ToolId>("type-scale");
  const [exportOpen, setExportOpen] = useState(false);

  // Shareable links: if a ?s= param is present, decode the full project state
  // into the store once on mount. Opening someone's link recreates their
  // project exactly — no account, no database.
  useEffect(() => {
    const s = params.get("s");
    if (!s) return;
    const decoded = decodeState(s);
    if (decoded) hydrate(decoded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showMockupRail = tool === "website" || tool === "mobile";

  return (
    <div className="flex h-screen flex-col bg-surface">
      <Toolbar onExport={() => setExportOpen(true)} />
      <div className="flex min-h-0 flex-1">
        {mode === "edit" && <Sidebar active={tool} onSelect={setTool} />}

        <main className="min-w-0 flex-1 overflow-hidden p-4">
          {tool === "type-scale" && <TypeScalePanel />}
          {tool === "style-guide" && <StyleGuidePanel />}
          {tool === "colors" && <ContrastPanel />}
          {tool === "website" && <WebsiteMockup />}
          {tool === "mobile" && <MobileMockup />}
        </main>

        {mode === "edit" && showMockupRail && <MockupControls />}
      </div>
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}

export default function EditorPage() {
  // useSearchParams requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<div className="grid h-screen place-items-center text-sm text-muted">Loading editor…</div>}>
      <EditorInner />
    </Suspense>
  );
}
