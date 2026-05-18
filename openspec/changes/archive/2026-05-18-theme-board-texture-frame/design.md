## Context

The `theme-clean-noir` change (archived `2026-05-18`) implemented the chalkboard-green token palette (`board`, `chalk`, `parchment`, `string`, `amber-pin`), Fontsource typography (Playfair Display, IBM Plex Serif, Special Elite), the rubber-stamp `CertaintyChip`, and ReactFlow node/edge colour assignments. That change explicitly scoped out texture and structural layout changes ("Clean Noir variant — flat surfaces only").

This design builds directly on that foundation. All existing tokens, fonts, and component interfaces remain. This change adds layers — visual (texture, depth) and structural (wood frame, cork sidebar) — without replacing what is there.

Key constraints inherited from `visual-identity` and `presentation-principles`:
- No light/dark mode toggle.
- No changes to Indonesian copy strings.
- No backend, API, or data model changes.
- One screen, one job — the sidebar is navigation-only, not a new content section.

## Goals / Non-Goals

**Goals:**
- Add board grain (SVG `feTurbulence`) and edge vignette (radial-gradient) to the chalkboard surface.
- Add chalk-text diffusion (`text-shadow`) to primary chalk-coloured text.
- Wrap the entire app viewport in a wood-frame CSS border, giving the board a mounted-on-wall aesthetic.
- Add a persistent cork-material left sidebar listing recently explored cases (localStorage-backed).
- Redesign ReactFlow node cards: elevation via `box-shadow`, amber-pin attachment mark, entity-type left accent bar.
- Redesign ReactFlow edges: five-dimension certainty encoding (colour, weight, dash, curvature, z-index); circle knot markers; parchment tag labels; custom SVG texture filter on established edges.

**Non-Goals:**
- No new screens or routes.
- No changes to the Dosier, GarisWaktu, or Profil components.
- No changes to backend, API contracts, or data models.
- No animation or motion beyond what already exists.
- No light mode or theme toggle.
- No changes to Tailwind token names from `theme-clean-noir` (only additions).

## Decisions

### D1 — Board texture via CSS pseudo-elements (no image assets)

**Decision**: Implement grain and vignette as `position: fixed` pseudo-elements on `body` using inline SVG data URIs and CSS gradients. No external image files.

**Rationale**: A fixed pseudo-element covers the full viewport regardless of scroll, ensuring the board surface feels uniformly physical. SVG data URIs inline the noise pattern with zero HTTP requests and work offline — important for an investigation tool that may be used in restricted environments. `pointer-events: none` ensures the overlay never intercepts clicks.

**Grain implementation**:
```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,...feTurbulence...");
  opacity: 0.035;
  pointer-events: none;
  z-index: 1000;
}
```
The `feTurbulence` filter uses `type="fractalNoise"`, `baseFrequency="0.65"`, `numOctaves="3"`, `stitchTiles="stitch"`, desaturated via `feColorMatrix` to produce monochromatic grain.

**Vignette implementation**:
```css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.28) 100%);
  pointer-events: none;
  z-index: 999;
}
```

**Chalk text diffusion**: Added to the existing `body` rule:
```css
body {
  text-shadow: 0 0 8px rgba(240, 235, 216, 0.12);
}
```
Restricted to `body` — not applied via a utility class — so it only affects text on the board surface, not on parchment cards.

**Alternatives considered**: CSS `filter: contrast() brightness()` grain trick — rejected because it affects child elements and cannot be reliably isolated. External texture PNG — rejected due to HTTP request and offline-incompatibility.

### D2 — Wood frame via `AppShell` wrapper in `app.tsx`

**Decision**: Introduce a thin `AppShell` wrapper component in `app.tsx` that provides the wood-frame border and hosts the cork sidebar. All existing routes render as children of `AppShell`.

**Rationale**: The wood frame needs to enclose every screen (Beranda, KasusDetail, Account, Sign-in). Adding it in `app.tsx` as a wrapper ensures consistent coverage without modifying each screen individually.

**Implementation**:
```tsx
function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="wood-frame flex h-screen overflow-hidden">
      <CaseHistorySidebar />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
```

**Wood frame CSS** (in `index.css`):
```css
.wood-frame {
  border: 18px solid transparent;
  border-image: linear-gradient(
    145deg,
    #8B5E15 0%, #C4922A 18%, #A07020 35%,
    #7A4E10 50%, #B8801C 65%, #9A6814 82%, #8B5E15 100%
  ) 1;
  box-shadow: inset 0 0 12px rgba(0,0,0,0.6), 0 0 32px rgba(0,0,0,0.5);
}
```

**New Tailwind tokens**:
```js
wood:        '#8B5E15'   // dark walnut
'wood-mid':  '#C4922A'   // mid grain
'wood-light':'#E8B84B'   // highlight grain
```

**Alternatives considered**: CSS `outline` — cannot apply gradient. Dedicated `<div>` frame wrapper with `position: fixed` — adds DOM complexity and z-index conflicts with ReactFlow. `border-image` with `linear-gradient` is the cleanest single-property approach.

**Risk**: `border-image` does not support `border-radius`. The frame will have square corners. This is correct — physical chalkboards have squared wooden frames, not rounded ones.

### D3 — Cork sidebar as a new component with localStorage history

**Decision**: Create `apps/frontend/src/components/case-history-sidebar.tsx` — a fixed-width left panel (`w-52`, ~208px) in cork material, reading/writing a `kawal_case_history` key in `localStorage`. The component is self-contained; no new API call, no new context.

**Cork material tokens**:
```js
cork:        '#C19A6B'   // base cork tan
'cork-shadow':'#A07850'  // panel shadow / darker grain
'cork-pin':   '#D4A017'  // amber-pin (already exists, reused)
```

**History data shape** (localStorage):
```ts
type CaseHistoryEntry = { id: string; name: string; visitedAt: number };
// max 20 entries, sorted by visitedAt desc, persisted as JSON
```

**Writing history**: Each `KasusDetailScreen` mount calls `caseHistorySidebar.push({ id, name })`. A small singleton module handles deduplication and the 20-entry cap.

**Cork texture**: Applied as a CSS `background-image` repeating linear-gradient over the cork base colour, simulating wood-grain lines at very low opacity (3%). No external image.

**Alternatives considered**: History from the `listCases()` API — rejected because that returns all cases in the system, not the user's personal navigation history. `sessionStorage` — rejected because history should persist across sessions to be useful. A new backend endpoint for user history — rejected as out of scope; localStorage is sufficient for an internal tool.

**Mobile**: The cork sidebar collapses to `w-0 overflow-hidden` below `lg` breakpoint, preserving the existing phone layout.

### D4 — Node card redesign via inline style updates in `peta-kasus.tsx`

**Decision**: Update the `flowNodes` `style` object in `peta-kasus.tsx` to add `boxShadow`, a pin mark, and entity-type accent bar. No new custom node component.

**Rationale**: ReactFlow inline `style` objects already control all node appearance. Adding `boxShadow` and a left `borderLeft` accent bar requires only adding two CSS properties. A custom node component would be needed for a true pin-mark element (a separate DOM node inside the card), but the visual effect can be approximated with `background-image: radial-gradient(circle at 12px 12px, #D4A017 3px, transparent 3px)` — a small amber circle painted at the top-left of the parchment background. This avoids a new component while still achieving the visual intent.

**Entity-type accent bar**: Left border color per type:
```ts
const typeAccent: Record<EntityDto['type'], string> = {
  person:       '#9DB89A',  // chalk-muted green
  organization: '#3498DB',  // stamp-reported blue
  company:      '#3498DB',  // same as org
  document:     '#D4A017',  // amber-pin
  event:        '#E67E22',  // stamp-alleged amber
  location:     '#8E44AD',  // stamp-disputed purple
};
// Applied as: borderLeft: `4px solid ${typeAccent[entity.type]}`
```

**Updated node style**:
```ts
style: {
  background: `#EDE8D0 radial-gradient(circle at 10px 10px, #D4A017 3px, transparent 3px)`,
  color: '#1F3529',
  border: entity.id === selectedEntityId ? '2px solid #D4A017' : '1px solid #2D5040',
  borderLeft: `4px solid ${typeAccent(entity.type)}`,
  boxShadow: entity.id === selectedEntityId
    ? '3px 6px 16px rgba(0,0,0,0.45), 0 0 12px rgba(212,160,23,0.35)'
    : '3px 6px 16px rgba(0,0,0,0.45)',
  padding: 8,
  borderRadius: 4,
  width: 160,
  fontSize: 12,
}
```

**Alternatives considered**: Custom node component — would enable a true DOM pin element and CertaintyChip inside the card, but adds significant complexity and requires `nodeTypes` registration. Deferred to a future change if richer card content is needed.

### D5 — Five-dimension edge string system

**Decision**: Update `flowEdges` to encode certainty on five dimensions simultaneously. Add a `CustomEstablishedEdge` component for the established certainty level only.

**Five dimensions**:

| Certainty | Colour | Width | Dash (`strokeDasharray`) | Curvature | z-index |
|---|---|---|---|---|---|
| established | `#C0392B` | 2.5 | `none` | 0.1 | 5 |
| reported | `#3498DB` | 1.5 | `none` | 0.2 | 4 |
| alleged | `#D4A017` | 1.5 | `8 4` | 0.35 | 3 |
| disputed | `#8E44AD` | 1 | `3 4` | 0.45 | 2 |
| unverified | `#9DB89A` | 0.75 | `2 4` | 0.5 | 1 |

**Knot markers**: `markerStart` and `markerEnd` both set to `{ type: MarkerType.Circle, color: edgeStroke(edge), width: 6, height: 6 }` on all edges.

**Tag label**: Per-edge label styling:
```ts
labelStyle: { fontFamily: "'Special Elite', monospace", fontSize: 9, fill: '#1F3529' },
labelBgStyle: { fill: '#EDE8D0', stroke: '#2D5040', strokeWidth: 1 },
labelBgBorderRadius: 0,
labelBgPadding: [2, 6],
```

**Custom established edge**: A `CustomEstablishedEdge` React component renders the SVG path with a `filter` referencing a `<feTurbulence>` definition embedded in a `<defs>` block inside the ReactFlow `<svg>`. Displacement amplitude: 0.8px — barely perceptible, enough to suggest thread texture without introducing visual noise. Registered in `nodeTypes`→ no, `edgeTypes` as `{ established: CustomEstablishedEdge }`. The `flowEdges` `type` field is set to `'established'` only when `edge.certainty === 'established'`.

**Alternatives considered**: Apply texture filter to all edges — rejected, thin low-certainty edges become illegible with displacement. Custom edge for all certainty levels — over-engineering; only the thickest prominent edge benefits from texture.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| `body::before` / `body::after` grain+vignette overlays at `z-index: 999–1000` may sit above ReactFlow controls or modals | Verify z-index ordering against ReactFlow's `z-index: 4` for controls and overlay panels (Profil, SourcePanel, GlosariumOverlay). Adjust overlay z-index downward if conflict found |
| `border-image` wood frame not clipped by `border-radius` | Chalkboards have square frames — accepted. No border-radius on the outer frame |
| Cork sidebar at `w-52` reduces horizontal space for KasusDetail three-column layout | On `lg` screens the layout already fits three columns in remaining space. Verify at `1024px` breakpoint; if tight, reduce Dosier to `lg:w-60` |
| `localStorage` case history not available in private/incognito or if storage is full | Wrap reads/writes in `try/catch`; degrade silently to empty history. Never block render on history failure |
| `feTurbulence` SVG filter in custom edge may cause performance regression with many edges | Throttle filter to established edges only (already decided). Disable filter when `nodeCount > 40` as a safety valve |
| `background-image: radial-gradient` pin mark on node may not render in all browsers as expected | Test on Chrome, Firefox, Safari. Fallback: omit the pin gradient; the amber border highlight still communicates selection |

## Migration Plan

1. Add `wood-*` and `cork-*` tokens to `tailwind.config.js`.
2. Add grain, vignette, and chalk-text diffusion to `index.css`.
3. Add `.wood-frame` utility class to `index.css`.
4. Create `case-history-sidebar.tsx` component + localStorage history module.
5. Wrap routes in `AppShell` in `app.tsx`.
6. Update node `style` objects in `peta-kasus.tsx` (shadow, pin mark, type accent bar).
7. Update edge definitions in `peta-kasus.tsx` (five dimensions, knot markers, tag labels).
8. Build and register `CustomEstablishedEdge` in `peta-kasus.tsx`.
9. Smoke-test all screens; verify z-index ordering; test at `1024px` and phone width.

**Rollback**: All changes are frontend styling and one new component. Git revert of the PR restores previous state with no data migration needed. `localStorage` history key is additive; clearing it has no effect on app function.

## Open Questions

- What is the maximum number of recent cases to show in the sidebar? (Current assumption: 20 entries, cap at 20.)
- Should the cork sidebar show a case's `jurisdiction` as a subtitle under the name, or name only?
- Should the `CustomEstablishedEdge` texture filter be disabled on low-power devices (`prefers-reduced-motion: reduce`)? Recommend yes — add a `@media (prefers-reduced-motion: reduce)` rule that swaps `CustomEstablishedEdge` for a plain edge.
