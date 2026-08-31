# frontend/

The Next.js application: every component, the routes, static assets, the
browser tests, and the build tooling that belongs to them. This folder is the
**Next.js project root** — `npm run dev` is `next dev frontend`.

| Path             | What lives there                                                         |
| ---------------- | ------------------------------------------------------------------------ |
| `app/`           | Routes only — metadata in, one component out (~190 lines total)          |
| `ui/`            | Shared primitives — `Button`, `Select`, `Toggle`, `Segmented`, icons     |
| `editor/`        | The tool's chrome: toolbar, sidebar, modals, font picker, `EditorScreen` |
| `editor/panels/` | One file per workspace panel (type scale, contrast, playground, mockups) |
| `landing/`       | The marketing page and its hero simulation                               |
| `docs/`          | Privacy, terms, and changelog page bodies                                |
| `system/`        | Error and 404 screens, and the social share image                        |
| `styles/`        | `globals.css` — Tailwind layers and the few global rules                 |
| `public/`        | Static assets, served at `/`                                             |
| `e2e/`           | Playwright specs and their screenshot baselines                          |

Components read and write the shared `ProjectState` in
`@/backend/project/store`; they should not keep their own copies of project
data. Reuse `ui/` before adding a new primitive, and keep panels thin — the
maths belongs in `backend/`.

## `app/` is routes, not UI

Next only discovers routes at its own root, so `app/` has to be here. It stays
a shell: every `page.tsx` is metadata plus one component from this folder.

```tsx
export const metadata: Metadata = { ... };

export default function Page() {
  return <TermsPage />;
}
```

Add a route the same way: markup in `docs/`, `landing/` or `system/`, that
shape in `app/`. The exceptions are `app/layout.tsx` (the `<html>` shell),
`app/robots.ts` and `app/sitemap.ts` — routing concerns, not UI.

## The config here is load-bearing

All four files resolve paths in ways that are easy to break:

- **`next.config.mjs`** sets `experimental.externalDir` so Next may compile
  `../backend`. Without it the build fails on the first `@/backend/...` import.
- **`postcss.config.mjs`** points Tailwind at `tailwind.config.ts` by absolute
  path. Tailwind otherwise auto-discovers from the _working directory_ — the
  repo root — finds nothing, and silently emits preflight only. If the styling
  ever disappears, look here first.
- **`tailwind.config.ts`** builds its `content` globs with `__dirname`, for the
  same reason.
- **`playwright.config.ts`** resolves `testDir` from itself but pushes
  `outputDir` and the HTML report up to the repo root, because CI uploads
  `playwright-report/` from there. `webServer.cwd` is this folder, where the
  build output lives.

Screenshot baselines in `e2e/__screenshots__/` are generated on Linux by the
`visual-baselines` workflow; both CI workflows name that path. Unit tests are
not here — they sit beside the logic in `backend/`.
