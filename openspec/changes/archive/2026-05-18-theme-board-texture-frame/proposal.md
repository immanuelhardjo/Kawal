## Why

The implemented Clean Noir theme (`theme-clean-noir`) established the chalkboard palette and typography but deliberately deferred texture and physical materiality ("flat surfaces only"). The result is a dark-green UI that references the detective-board metaphor conceptually but does not feel physically present. Adding grain, depth, a wood frame, a cork navigation sidebar, and a richer node/string system closes the gap between the visual metaphor and the lived experience of using the tool.

## What Changes

- **Board texture** — CSS grain overlay (SVG `feTurbulence` noise) and edge vignette (radial-gradient) applied to the chalkboard surface; soft `text-shadow` diffusion on chalk-coloured text.
- **Wood frame** — A thick decorative border wrapping the entire app viewport, rendering the chalkboard surface as a board mounted on a wall.
- **Cork sidebar** — A persistent left navigation rail in cork material, listing recently explored cases as amber-pinned entries. Replaces the flat `board-shadow` sidebar background.
- **Node redesign** — Parchment cards gain elevation (`box-shadow`), an amber-pin attachment mark, a colour-coded left accent bar encoding entity type, and a visible `CertaintyChip` stamp in the card body.
- **Edge / string system** — Relationship edges move from single-dimension (colour only) to five-dimension encoding: colour, stroke weight, dash pattern, curve tension (curvature), and z-order. A paper tag label replaces the floating text label. Circle knot markers appear at both endpoints. Established edges receive a subtle SVG `feTurbulence` texture filter.

## Capabilities

### New Capabilities

- `board-texture`: CSS overlay system providing grain, vignette, and chalk-text diffusion on the main board surface.
- `board-frame`: Wood-frame decorative border wrapping the app viewport, giving the board a mounted-on-wall aesthetic.
- `case-history-sidebar`: Cork-material persistent left sidebar displaying recently explored cases as pinned navigation entries, with localStorage-backed history.

### Modified Capabilities

- `visual-identity`: New colour tokens for wood and cork materials; updated node card anatomy (elevation, pin mark, type accent bar); updated edge encoding specification (five-dimension string system).
- `presentation-principles`: New global sidebar layout pattern added to the normative layout constraints.

## Impact

- `apps/frontend/src/styles/index.css` — grain and vignette overlays, chalk text-shadow, wood frame border, cork sidebar base styles.
- `apps/frontend/tailwind.config.js` — new `wood-*` and `cork-*` colour tokens.
- `apps/frontend/src/app.tsx` — new `AppShell` wrapper component enclosing all routes with the wood frame and cork sidebar.
- `apps/frontend/src/components/case-history-sidebar.tsx` — new component (cork sidebar, localStorage history).
- `apps/frontend/src/screens/kasus-detail/peta-kasus.tsx` — node style updates (shadow, pin mark, type bar), edge updates (dash, curvature, markers, tag labels, custom established-edge component).
- `packages/ui/src/certainty-chip.tsx` — no interface change; used inside node cards.
- No backend changes. No API contract changes. No data model changes.
