# frontend/

Every React component in TypeSmith, plus the global stylesheet.

| Folder           | What lives there                                                            |
| ---------------- | --------------------------------------------------------------------------- |
| `ui/`            | Shared primitives — `Button`, `Select`, `Toggle`, `Segmented`, inline icons |
| `editor/`        | The tool's chrome: toolbar, sidebar, modals, font picker                    |
| `editor/panels/` | One file per workspace panel (type scale, contrast, playground, mockups)    |
| `landing/`       | The marketing page and its hero simulation                                  |
| `styles/`        | `globals.css` — Tailwind layers and the few global rules                    |

Components read and write the shared `ProjectState` in
`@/backend/project/store`; they should not keep their own copies of project
data. Reuse `ui/` before adding a new primitive, and keep panels thin — the
maths belongs in `backend/`.

## Why `app/` is not in here

Next.js App Router only discovers routes in `app/` at the repo root (or
`src/app`), so it cannot move under `frontend/`. `app/` is therefore kept as a
routing shell: each `page.tsx` wires up metadata and renders components from
this folder.
