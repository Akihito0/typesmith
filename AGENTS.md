# AGENTS.md

TypeSmith — typography tooling (type scales, font pairing, WCAG contrast,
live mockups) as a fully static Next.js 14 App Router app. No backend, no
database, no env vars; everything is client-side and deploys as-is.

## Commands

```bash
npm run dev            # http://localhost:3000
npm run build          # production build (also the main correctness check)
npm run typecheck      # tsc --noEmit
npm run lint           # eslint (next/core-web-vitals)
npm run format:check   # prettier (npm run format to write)
npm test               # vitest unit tests over lib/ (lib/__tests__/)
npm run test:coverage  # unit tests + coverage thresholds (what CI runs)
npm run test:e2e       # Playwright suite in e2e/ — run `npm run build` first;
                       # serves on port 3100 so a dev server on 3000 is untouched
```

Verify changes with lint + format:check + typecheck + test:coverage + build
(CI runs exactly this in .github/workflows/ci.yml, then the e2e job;
deploy.yml publishes main to GitHub Pages). Pure-logic changes in `lib/`
should come with unit tests; new editor surfaces should get an e2e check.

Gotcha: `npm run build` while a dev server runs corrupts `.next/`
(rm -rf .next to recover). To build/e2e alongside a live dev server, use the
isolated dist dir: `NEXT_DIST_DIR=.next-ci npm run build` and
`NEXT_DIST_DIR=.next-ci npm run test:e2e` (see next.config.mjs).

## Architecture

- **One shared state object** — `lib/store.ts` (zustand). Every panel, mockup,
  and export reads/writes the same `ProjectState`. New features should read
  from this store, not hold their own copies of project data.
- **State is URL-shareable** — `lib/share.ts` packs the whole `ProjectState`
  into a base64url `?s=` param. If you add a `ProjectState` field, add its
  short key to `KEY_MAP` there or it will silently drop from share links.
- **Autosave** — the store persists to localStorage (`typesmith-project`).
  A `?s=` share param takes priority over the saved session (see
  `app/editor/page.tsx`).
- **Pure logic lives in `lib/`** — `scale.ts` (modular scale math + fluid
  clamp()), `contrast.ts` (WCAG 2.1 + CVD simulation), `export.ts`
  (CSS/Fluid/Tailwind/SCSS/JSON generation), `presets.ts`, `fonts.ts`
  (curated faces + runtime custom-font registry), `customFonts.ts`
  (session-only FontFace uploads), `googleFonts.ts` (curated catalog +
  on-demand stylesheet loading; `gf:` font ids resolve from the id itself).
  Keep new logic here, framework-free, and keep components thin.
- **Routes** — `/` landing (`components/landing/*`), `/editor` the tool
  (`components/editor/*`, panels in `components/editor/panels/`). Panel
  switching is local state in `app/editor/page.tsx` via `ToolId`
  (`components/editor/types.ts`).

## Conventions

- Reuse the primitives in `components/ui/index.tsx` (Button, Select, Toggle,
  Segmented, inline icons) before adding new ones. Modals are hand-rolled
  overlays — copy the pattern in `ExportModal.tsx` (Escape to close, backdrop
  click, `role="dialog"`).
- Styling is Tailwind only, using the semantic tokens defined in
  `tailwind.config.ts` (`ink`, `muted`, `line`, `surface`, `brand-*`,
  `canvas-*`). Don't introduce new palettes or fonts.
- Path alias `@/*` maps to the repo root.
- No new runtime dependencies without a strong reason — the current footprint
  is next + react + zustand + geist.

## Product constraints

- **No signup, no server.** Auth (`AuthModal.tsx`) is intentionally a UI
  shell; don't wire real auth or add API routes without an explicit decision.
- Current work items and roadmap live in `TASK.md` — keep it updated when
  finishing or discovering work.
