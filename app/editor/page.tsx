"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useProject } from "@/lib/store";
import { decodeState } from "@/lib/share";
import { ensureGoogleFont, gfFamilyFromId } from "@/lib/googleFonts";
import { Sidebar } from "@/components/editor/Sidebar";
import { Toolbar } from "@/components/editor/Toolbar";
import { ExportModal } from "@/components/editor/ExportModal";
import { ProModal } from "@/components/editor/ProModal";
import { TypeScalePanel } from "@/components/editor/panels/TypeScalePanel";
import { WebsiteMockup, MobileMockup, MockupControls } from "@/components/editor/panels/MockupPanel";
import { SlidesPanel, SocialPanel, NewsletterPanel } from "@/components/editor/panels/ProLayouts";
import { ContrastPanel } from "@/components/editor/panels/ContrastPanel";
import { StyleGuidePanel } from "@/components/editor/panels/StyleGuidePanel";
import type { ToolId } from "@/components/editor/types";

function EditorInner() {
  const params = useSearchParams();
  const hydrate = useProject((s) => s.hydrate);
  const mode = useProject((s) => s.mode);
  const [tool, setTool] = useState<ToolId>("type-scale");
  const [exportOpen, setExportOpen] = useState(false);
  const [proOpen, setProOpen] = useState(false);

  // Shareable links: if a ?s= param is present, decode the full project state
  // into the store once on mount. Opening someone's link recreates their
  // project exactly — no account, no database. Otherwise restore the autosaved
  // session from localStorage (persist rehydration is manual so the share link
  // always wins).
  useEffect(() => {
    const s = params.get("s");
    const decoded = s ? decodeState(s) : null;
    if (decoded) hydrate(decoded);
    else useProject.persist.rehydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Google Fonts picked from the catalog load on demand; this covers fonts
  // arriving via a share link or the restored localStorage session.
  const headingFont = useProject((s) => s.headingFont);
  const bodyFont = useProject((s) => s.bodyFont);
  useEffect(() => {
    [headingFont, bodyFont].forEach((id) => {
      if (id.startsWith("gf:")) ensureGoogleFont(gfFamilyFromId(id));
    });
  }, [headingFont, bodyFont]);

  // Undo/redo shortcuts. Skipped while typing in a field so the browser's own
  // text undo keeps working there.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const key = e.key.toLowerCase();
      if (key === "z") {
        e.preventDefault();
        if (e.shiftKey) useProject.getState().redo();
        else useProject.getState().undo();
      } else if (key === "y") {
        e.preventDefault();
        useProject.getState().redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Every layout that renders project copy gets the mockup rail (with the
  // content-editing controls) alongside it.
  const showMockupRail = ["website", "mobile", "slides", "social", "newsletter"].includes(tool);

  return (
    <div className="flex h-screen flex-col bg-surface">
      <Toolbar onExport={() => setExportOpen(true)} onUpgrade={() => setProOpen(true)} />
      <div className="flex min-h-0 flex-1">
        {mode === "edit" && <Sidebar active={tool} onSelect={setTool} />}

        <main className="min-w-0 flex-1 overflow-hidden p-4">
          {tool === "type-scale" && <TypeScalePanel />}
          {tool === "style-guide" && <StyleGuidePanel />}
          {tool === "colors" && <ContrastPanel onGetCode={() => setExportOpen(true)} />}
          {tool === "website" && <WebsiteMockup />}
          {tool === "mobile" && <MobileMockup />}
          {tool === "slides" && <SlidesPanel />}
          {tool === "social" && <SocialPanel />}
          {tool === "newsletter" && <NewsletterPanel />}
        </main>

        {mode === "edit" && showMockupRail && <MockupControls />}
      </div>
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
      <ProModal open={proOpen} onClose={() => setProOpen(false)} />
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
