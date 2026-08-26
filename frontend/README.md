# frontend/

Every React component in TypeSmith, plus the global stylesheet and the
browser tests.

| Folder           | What lives there                                                         |
| ---------------- | ------------------------------------------------------------------------ |
| `ui/`            | Shared primitives — `Button`, `Select`, `Toggle`, `Segmented`, icons     |
| `editor/`        | The tool's chrome: toolbar, sidebar, modals, font picker, `EditorScreen` |
| `editor/panels/` | One file per workspace panel (type scale, contrast, playground, mockups) |
| `landing/`       | The marketing page and its hero simulation                               |
| `docs/`          | Privacy, terms, and changelog page bodies                                |
| `system/`        | Error and 404 screens, and the social share image                        |
| `styles/`        | `globals.css` — Tailwind layers and the few global rules                 |
| `e2e/`           | Playwright specs and their screenshot baselines                          |

Components read and write the shared `ProjectState` in
`@/backend/project/store`; they should not keep their own copies of project
data. Reuse `ui/` before adding a new primitive, and keep panels thin — the
maths belongs in `backend/`.

## Why `app/` is not in here

Next.js App Router only discovers routes in `app/` at the repo root (or
`src/app`), so it cannot move under `frontend/`. `app/` is therefore kept as a
routing shell — about 190 lines across twelve files, none of which holds UI.
Every `page.tsx` is metadata plus one component from this folder:

```tsx
export const metadata: Metadata = { ... };

export default function Page() {
  return <TermsPage />;
}
```

Add a route the same way: markup here, that shape there. The exceptions are
`app/layout.tsx` (the `<html>` shell), `app/robots.ts` and `app/sitemap.ts` —
those are routing concerns, not UI.

## E2E

`e2e/` is run by Playwright via `npm run test:e2e` (build first). Screenshot
baselines live in `e2e/__screenshots__/` and are generated on Linux by the
`visual-baselines` workflow — both CI workflows reference that path by name.
Unit tests are not here; they sit beside the logic in `backend/`.
