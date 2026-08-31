# backend/

The framework-free half of TypeSmith: typography maths, colour science,
document models, code generation, and persistence. Nothing here imports React
or Next.js, and nothing renders — it takes data in and gives data back.

TypeSmith has no server, so "backend" means the logic layer rather than a
separate process. A few modules are marked `"use client"` because they reach
for browser APIs (`localStorage`, `FontFace`, `<canvas>`); they are still pure
logic, just logic that needs a browser to run.

| Folder        | What lives there                                                                  |
| ------------- | --------------------------------------------------------------------------------- |
| `typography/` | `scale.ts` (modular scale + fluid `clamp()`), `presets.ts` (pairings)             |
| `fonts/`      | `catalog.ts` (curated faces), `google.ts` (Google catalog), `custom.ts` (uploads) |
| `color/`      | `contrast.ts` — WCAG 2.1, APCA, CVD simulation                                    |
| `playground/` | `document.ts` (infinite-canvas model + geometry), `export.ts` (PNG render)        |
| `export/`     | `code.ts` (CSS/Tailwind/SCSS/JSON), `email.ts`, `image.ts`, `qr.ts`               |
| `project/`    | `store.ts` (the one `ProjectState`), `share.ts` (`?s=`), `workspace.ts`, `pro.ts` |
| `site.ts`     | Site-wide metadata used by the routes for SEO                                     |

Tests sit in a `__tests__/` folder beside the code they cover and run under
vitest via `npm test`. `vitest.config.ts` lives here too, and anchors itself to
the repo root so specs can import through the app's own `@/…` alias.

## Being consumed from frontend/

`frontend/` is the Next.js project root, so this folder sits _outside_ it.
`frontend/next.config.mjs` sets `experimental.externalDir` to let Next compile
TypeScript from here, and `frontend/tsconfig.json` maps `@/*` to the repo root
so `@/backend/color/contrast` resolves. Keep this folder free of JSX and of
anything importing from `frontend/` — the dependency runs one way.
