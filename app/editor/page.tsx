"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useProject } from "@/backend/project/store";
import { decodeStateCompat } from "@/backend/project/share";
import { ensureGoogleFont, gfFamilyFromId } from "@/backend/fonts/google";
import { pickProjectState } from "@/backend/project/store";
import { useWorkspace } from "@/backend/project/workspace";
import { isProLayout, isProUnlocked, PRO_STATUS_NOTICE } from "@/backend/project/pro";
import { Sidebar } from "@/frontend/editor/Sidebar";
import { Toolbar } from "@/frontend/editor/Toolbar";
import { ExportModal } from "@/frontend/editor/ExportModal";
import { ProModal } from "@/frontend/editor/ProModal";
import { TypeScalePanel } from "@/frontend/editor/panels/TypeScalePanel";
import { WebsiteMockup, MobileMockup, MockupControls } from "@/frontend/editor/panels/MockupPanel";
import { SlidesPanel, SocialPanel, NewsletterPanel } from "@/frontend/editor/panels/ProLayouts";
import { ContrastPanel } from "@/frontend/editor/panels/ContrastPanel";
import { StyleGuidePanel } from "@/frontend/editor/panels/StyleGuidePanel";
import { PlaygroundPanel } from "@/frontend/editor/panels/PlaygroundPanel";
import type { ToolId } from "@/frontend/editor/types";

function EditorInner() {
  const params = useSearchParams();
  const hydrate = useProject((s) => s.hydrate);
  const mode = useProject((s) => s.mode);
  const [tool, setTool] = useState<ToolId>("type-scale");
  const [exportOpen, setExportOpen] = useState(false);
  const [proOpen, setProOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeProjectId = useWorkspace((s) => s.activeId);

  // The sheet-in reveal plays only on a real project change: the canvas key
  // bumps when activeId moves from one project to another, never on the
  // initial mount/rehydrate (which used to half-play the animation twice).
  const prevProjectRef = useRef<string | null>(null);
  const [canvasKey, setCanvasKey] = useState(0);
  useEffect(() => {
    const prev = prevProjectRef.current;
    prevProjectRef.current = activeProjectId;
    if (prev && activeProjectId && prev !== activeProjectId) setCanvasKey((k) => k + 1);
  }, [activeProjectId]);

  // Shareable links: if a ?s= param is present, decode the full project state
  // into the store once on mount. Opening someone's link recreates their
  // project exactly — no account, no database. Otherwise restore the autosaved
  // session from localStorage (persist rehydration is manual so the share link
  // always wins).
  useEffect(() => {
    const s = params.get("s");
    if (s) {
      // Async: the compressed format inflates via DecompressionStream.
      decodeStateCompat(s).then((decoded) => {
        if (decoded) hydrate(decoded);
        else useProject.persist.rehydrate();
      });
    } else {
      useProject.persist.rehydrate();
    }

    // Workspace registry: restore it, make sure the current project is
    // registered, then keep the active entry's snapshot in sync (debounced).
    useWorkspace.persist.rehydrate();
    useWorkspace.getState().init(pickProjectState(useProject.getState()));
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = useProject.subscribe(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const ws = useWorkspace.getState();
        if (ws.activeId) ws.upsert(ws.activeId, pickProjectState(useProject.getState()));
      }, 400);
    });
    return () => {
      unsub();
      clearTimeout(timer);
    };
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

  // Post-beta safety net: a Pro layout can still be the active tool from a
  // restored session or a share link even though the sidebar now gates it.
  // While PRO_BETA_FREE this is always false. (lib/pro.ts)
  const proLocked = isProLayout(tool) && !isProUnlocked();

  return (
    <div className="flex h-screen flex-col bg-surface print-expand print:block print:bg-white">
      <Toolbar
        onExport={() => setExportOpen(true)}
        onUpgrade={() => setProOpen(true)}
        onMenu={mode === "edit" ? () => setDrawerOpen(true) : undefined}
        activeTool={tool}
        onSelectTool={setTool}
      />
      <div className="flex min-h-0 flex-1 print-expand print:block">
        {/* Sidebar: inline on md+, a drawer below (hamburger in the toolbar) */}
        {mode === "edit" && (
          <div className="hidden md:flex">
            <Sidebar active={tool} onSelect={setTool} onUpgrade={() => setProOpen(true)} />
          </div>
        )}
        {mode === "edit" && drawerOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-ink/50" onClick={() => setDrawerOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex shadow-modal">
              <Sidebar
                active={tool}
                onSelect={(t) => {
                  setTool(t);
                  setDrawerOpen(false);
                }}
                onUpgrade={() => {
                  setDrawerOpen(false);
                  setProOpen(true);
                }}
              />
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 overflow-hidden p-4 print-expand print:p-0">
          {/* Keyed by project change: creating or switching a project
              re-mounts the canvas with the sheet-in reveal. Tool switches and
              the initial load stay instant. */}
          <div key={canvasKey} className={canvasKey > 0 ? "h-full sheet-in" : "h-full"}>
            {proLocked ? (
              <ProLocked onUpgrade={() => setProOpen(true)} />
            ) : (
              <>
                {tool === "type-scale" && <TypeScalePanel />}
                {tool === "playground" && <PlaygroundPanel />}
                {tool === "style-guide" && <StyleGuidePanel />}
                {tool === "colors" && <ContrastPanel onGetCode={() => setExportOpen(true)} />}
                {tool === "website" && <WebsiteMockup />}
                {tool === "mobile" && <MobileMockup />}
                {tool === "slides" && <SlidesPanel />}
                {tool === "social" && <SocialPanel />}
                {tool === "newsletter" && <NewsletterPanel />}
              </>
            )}
          </div>
        </main>

        {mode === "edit" && showMockupRail && <MockupControls />}
      </div>
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
      <ProModal open={proOpen} onClose={() => setProOpen(false)} />
    </div>
  );
}

/** Shown in place of a Pro layout once the beta ends. Unreachable while
 *  PRO_BETA_FREE is true. */
function ProLocked({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="grid h-full place-items-center p-6">
      <div className="max-w-sm rounded-card border border-line bg-white p-6 text-center shadow-panel">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          TypeSmith Pro
        </p>
        <h2 className="mt-1 text-[15px] font-semibold text-ink">This layout needs Pro</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">{PRO_STATUS_NOTICE}</p>
        <button
          onClick={onUpgrade}
          className="mt-5 h-10 w-full rounded-md bg-brand-600 text-[13px] font-medium text-white hover:bg-brand-700"
        >
          See what&apos;s in Pro
        </button>
      </div>
    </div>
  );
}

export default function EditorPage() {
  // useSearchParams requires a Suspense boundary in the App Router.
  return (
    <Suspense
      fallback={
        <div className="grid h-screen place-items-center text-sm text-muted">Loading editor…</div>
      }
    >
      <EditorInner />
    </Suspense>
  );
}
