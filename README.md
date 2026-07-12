# TypeSmith

Precision typography and UI design, in one tool. Type scales, font pairing,
WCAG contrast, and live Website/Mobile mockups — all reading from one shared
project state, shareable as a single URL. No signup, no database.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

`npm run build && npm start` for production. Deploys as-is to Vercel /
Netlify / Cloudflare Pages (all static + client-side, no env vars needed).

## Screens (mapped to the Figma file)

| Figma frame                        | Route / location                                    |
| ---------------------------------- | --------------------------------------------------- |
| TypeSmith Landing Page              | `/` — `app/page.tsx` + `components/landing/*`        |
| Login/Signup Modal Overlay          | `components/landing/AuthModal.tsx` (Login button)    |
| Editor — Type Scale Generator       | `/editor` → sidebar **Type Scale** (default view)    |
| Editor Dashboard (Website mockup)   | `/editor` → sidebar **Website** / **Mobile App**     |
| Editor — Color Contrast Tool        | `/editor` → sidebar **Colors**                       |
| (bonus) Style Guide                 | `/editor` → sidebar **Style Guide**                  |

## How it maps to the proposal

- **One shared workspace** — `lib/store.ts` (zustand). Every panel reads/writes
  the same `ProjectState`; changing the ratio updates the scale rail, both
  mockups, the style guide, and every export at once.
- **Type scale generator** — `lib/scale.ts`. `size = base × ratio^step`,
  8 ratio presets + custom, px/rem/em output.
- **Custom preview text** — one input in the Type Scale panel live-updates the
  ramp, both mockups, and the style guide.
- **Font pairing** — 9 curated faces (Geist bundled; rest via Google Fonts),
  6 pairing presets, shuffle button in the toolbar.
- **Contrast checker** — `lib/contrast.ts`, real WCAG 2.1 relative-luminance
  math with AA/AAA normal/large verdicts, plus two roadmap items already in:
  color-blindness simulation and an AA auto-fixer.
- **Get Code / export** — `lib/export.ts`: CSS variables, Tailwind config,
  SCSS, JSON tokens. Copy or download from the Export modal; live preview in
  the mockup rail.
- **Shareable links** — `lib/share.ts`: full state → base64url → `?s=` param.
  The Share button copies a URL that recreates the project exactly.
- **Edit / View toggle** — toolbar segmented control; View hides all chrome
  for client presentations.

## Not built yet (intentional)

- Auth is a UI shell only ("Skip for now" always works) — the product promise
  is no-signup, so wiring real auth is a later decision.
- Pro layouts (Slides / Social / Newsletter) are locked sidebar items.
- Custom font upload, autosave, undo/redo — proposal roadmap items.
