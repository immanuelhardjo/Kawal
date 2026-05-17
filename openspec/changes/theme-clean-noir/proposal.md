## Why

KAWAL is an OSINT investigation workbench — investigators assemble dossiers, trace entity connections, and weigh evidence sources. The current light-cream theme (Inter/Source Serif Pro on `#fafaf9`) does not reflect the nature of the work. A chalkboard-noir aesthetic grounds the product in its investigation-room metaphor: dark green surfaces, parchment evidence cards, typewriter-style identifiers, and a calm-but-serious visual register that aligns with the gravity of the data being handled. This also strengthens brand differentiation — no other Indonesian civic-tech tool looks like a detective's case board.

## What Changes

- **New colour palette**: replace `paper`/`ink`/`muted`/`rule`/`accent` tokens with `board`/`chalk`/`chalk-muted`/`parchment`/`string`/`amber-pin` tokens reflecting the dark-green chalkboard surface, warm chalk text, and red-string connections.
- **New font stack**: replace Inter (sans) and Source Serif Pro (serif) with **Special Elite** (typewriter monospace for IDs and code labels), **Playfair Display** (headline serif), and **IBM Plex Serif** (body text). Fonts loaded via Fontsource npm packages — no external CDN.
- **Certainty chip redesign**: pivot from translucent pills to rubber-stamp–style bordered boxes with uppercase condensed text in stamp colours (green / amber / red / purple by certainty level).
- **Dark-green global background**: `body` background changes from cream to `#1F3529`. Sidebar deepens to `#172B22`.
- **Peta Kasus canvas**: ReactFlow background dot grid colour changes from `#e5e7eb` (light) to a chalk-on-green tone; node cards render on parchment (`#EDE8D0`) against the dark board; edge lines adopt the red-string colour (`#C0392B`) for established connections, amber for alleged.
- **Parchment evidence cards**: Dosier and source-panel cards switch to `bg-parchment` with `text-board` (dark green text on aged paper), maintaining source-first information hierarchy.
- Updated `presentation-principles` spec to record the approved colour palette, font stack, and certainty-stamp convention as normative constraints.

## Capabilities

### New Capabilities

- `visual-identity`: Defines the normative design token set (colour palette, typography stack, certainty-stamp convention) for the KAWAL UI. Becomes the single reference for colour values, font choices, and component-level visual rules.

### Modified Capabilities

- `presentation-principles`: Adds a **Visual Token System** requirement section recording the approved palette names, font families, and stamp-style certainty labels as enforceable UI constraints (not just aspirational guidance).

## Impact

- `apps/web/tailwind.config.js` — full token rename and value replacement
- `apps/web/src/styles/index.css` — Fontsource imports, dark-green body, new utility classes
- `apps/web/index.html` — remove any CDN font links if present
- `packages/ui/src/certainty-chip.tsx` — stamp-style redesign of chip component
- `apps/web/src/screens/**/*.tsx` (~15 files) — class token rename (`bg-paper` → `bg-board` etc.)
- `apps/web/src/screens/kasus-detail/peta-kasus.tsx` — node/edge/background colour update
- `package.json` / `pnpm-lock.yaml` — add `@fontsource/special-elite`, `@fontsource/playfair-display`, `@fontsource/ibm-plex-serif`
- No API changes; no database changes; no breaking contract changes.
