---
name: offbrand-premium
description: Design language distilled from OFF+BRAND (itsoffbrand.com) and their award-winning works (Microsoft Windows, Lando Norris, Steven.com, Vizcom, Aether 1, Slack, Webflow). Use when designing or reviewing any page that must feel premium/editorial rather than template-SaaS. Contains principles, concrete techniques, anti-clone rules, and a screenshot review checklist.
---

# OFF+BRAND Premium Design Language

Distilled 2026-07-12 from itsoffbrand.com (home, /work, and case studies:
Microsoft Windows, Lando Norris, Steven.com, Vizcom, Aether 1, Slack State of
Work, Webflow.com) plus their production CSS/HTML. OFF+BRAND has 50 Awwwards
(1 Site of the Year), 2 FWA, multiple CSSDA.

## Why their sites feel premium — the 8 pillars

### 1. One typeface, extreme scale contrast
They run a SINGLE custom face ("AtAero Retina OB Edition") across the whole
site — from viewport-filling display headlines down to ~10px uppercase
micro-labels. Premium = commitment to one distinctive voice + massive size
contrast between display and label tiers. Their headline tier is split across
multiple lines as separate H1s ("A different" / "Creative" / "approach"),
each line mask-revealed independently.

Rule: pick ONE distinctive display face (not Inter, not the default sans) and
use it everywhere. Hierarchy comes from size/weight/case, never from swapping
families. A mono face is allowed strictly for data/spec text.

### 2. Near-monochrome chrome; color belongs to the work
Actual palette from their CSS: off-whites `#f1f0ec` `#fafafa`, near-blacks
`#1d1d1d` `#222` `#333`, grays `#c8c8c8` `#dadada`, ONE accent `#0082f3` used
sparingly. The page chrome is almost colorless; vibrancy comes from work
imagery/video/product previews. Aether 1 case study: "a stripped-back, deep
palette with soft gradients and generous negative space."

Rule: max 1 accent color. Backgrounds are warm off-white or deep near-black,
never pure #fff/#000 gradients-on-cards SaaS style. No colored card
backgrounds, no pastel feature tiles, no glassmorphism.

### 3. The HUD/marginalia data layer
Their signature: a technical annotation layer floating over editorial layouts.
From their class vocabulary and markup:
- `text-mini caps` — tiny uppercase micro-labels everywhere ("BUILD", section
  names, categories like "Brand Identity", "Digital Experiences")
- Index numbers: sections and items numbered `01`, `07`, `11`, `50`
- `float-count`, `percentage-row` — live counters and stat rows
- Cross/plus glyphs (`hcs-cross`) at grid intersections; the brand itself is
  "OFF+BRAND." (plus sign + terminal period)
- Corner brackets that frame items on hover (`home-client__corner-img`)
- Plain text arrows `->` instead of icon libraries
- `mbm-diff` — mix-blend-mode: difference elements over imagery
- Footnote asterisks: headlines prefixed with `****`

Rule: every section carries marginalia — an index number + a tiny caps label.
Interactive items get corner-bracket or crosshair treatment. Use typographic
glyphs (`->`, `+`, `*`, `×`) instead of icon sets.

### 4. Work-forward: the product IS the hero
Their homepage hero is not a headline + screenshot. It's an asymmetric grid of
autoplaying work videos with text cells INTERLEAVED into the same grid
(`hg-grid-item is-text` between media cells). Vizcom principle: the hero is
"a short story, not a static banner" — show the transformation the product
performs, live, instead of describing it.

Rule: demonstrate, don't describe. If the product makes type scales, the page
should BE a type scale. Feature lists become live specimens.

### 5. Motion supports meaning, not decoration
Their stated principle (Vizcom). Techniques observed: masked line reveals
(`o-hidden` wrappers around every text line), scroll-driven scale on hero
media (`hero-scale`), link hover fills (`link-track` / `link-track-fill`),
cinematic scroll pacing, marquees for awards/clients, Lenis smooth scroll,
GSAP choreography. Aether 1 ships reduced-motion routes — accessibility is
part of premium.

Rule: entrance = staggered masked line reveals (translateY inside
overflow:hidden). Hovers = fills, underline tracks, corner brackets — never
scale-up cards or drop shadows. Everything respects prefers-reduced-motion.

### 6. Premium through restraint
Aether 1: negative space is generous; copy is minimal and confident. Slack:
"clear hierarchy, and space to let the message land." Sections breathe with
25-40vh of padding. Copy tone: declarative, short, occasionally ALL-CAPS mid
sentence ("With EMOTION + INNOVATION, We push THE BOUNDARIES OF DIGITAL
CREATIVITY.").

Rule: cut copy in half, then again. No exclamation marks, no "supercharge",
no emoji, no rocket ships. Fewer, larger, better.

### 7. Editorial structure over card grids
Full-bleed sections separated by hairline rules (1px, low-contrast), not
boxed cards with rounded corners and shadows. Where grids exist they are
asymmetric with deliberate empty cells. Tables/rows (like their awards list:
"Site of the Year — 1", "Developer award — 7") replace badge clusters.

Rule: hairline dividers + whitespace instead of cards. If a card is truly
needed: square or barely-rounded corners, 1px border, no shadow.

### 8. Craft signals in the details
- The granny test (Steven.com): ambition never costs clarity or navigation.
- Performance is part of the aesthetic — lazy loading, 60fps, mobile-first.
- Semantic HTML, ARIA, keyboard nav (Slack case study leads with this).
- Footer is a designed section (sitemap columns, tiny caps, index numbers),
  not an afterthought strip.

## Anti-clone rules (MANDATORY — uniqueness requirement)

Do NOT reproduce OFF+BRAND. Steal principles, not pixels:
- Do not use their palette verbatim; shift temperature or invert the scheme.
- Do not use a dark-agency WebGL look by default — that IS their look.
- Do not copy their headline copy patterns ("A different X") or brand
  punctuation ("X+Y.").
- Derive the concept from THIS product's domain. For a typography tool the
  authentic translation is a type-foundry specimen sheet / print-shop
  aesthetic: the marginalia are real type specs (sizes, ratios, contrast
  values), the "work grid" is live type specimens. That is a look OFF+BRAND
  has never shipped.

## Anti-template rules (avoid the generic AI-SaaS look)

Banned: centered hero with pill badge ("v2 is live ✨"), gradient text,
3-or-4-equal-card feature grids with icon squares, purple/indigo accents,
rounded-2xl + shadow-lg everything, "Trusted by 10,000+ developers",
emoji checkmarks, glassmorphic navs. If the page could be a Tailwind UI
template with different copy, it has failed.

## Screenshot review checklist (score each 0-2; ship at ≥16/20 with no 0s)

1. Could you identify this site from a 200px-wide thumbnail? (distinctive)
2. Is there a single dominant typeface with ≥10x size contrast on screen?
3. Is chrome near-monochrome with ≤1 accent?
4. Does a HUD/marginalia layer exist (index numbers, micro-caps, glyphs)?
5. Does the page demonstrate the product rather than describe it?
6. Are entrances masked line reveals with stagger (and reduced-motion safe)?
7. Do hovers use fills/brackets/tracks instead of shadow/scale?
8. Are sections separated by hairlines + whitespace, not card boxes?
9. Is the copy short, declarative, confident?
10. Zero template tells (pill badges, gradient text, icon-square cards)?
