## 1. Tokens

- [x] 1.1 Add `wood`, `wood-mid`, `wood-light`, `cork`, `cork-shadow` colour tokens to `apps/frontend/tailwind.config.js` under `theme.extend.colors`
- [x] 1.2 Verify token presence with a grep for `wood` and `cork` in `tailwind.config.js`

## 2. Board Texture

- [x] 2.1 Add `body::before` grain overlay to `apps/frontend/src/styles/index.css` — inline SVG `feTurbulence` data URI, `position: fixed`, `inset: 0`, `opacity: 0.035`, `pointer-events: none`, `z-index: 20`
- [x] 2.2 Add `body::after` vignette overlay — `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.28) 100%)`, `position: fixed`, `inset: 0`, `pointer-events: none`, `z-index: 19`
- [x] 2.3 Add `text-shadow: 0 0 8px rgba(240, 235, 216, 0.12)` to the existing `body` rule in `index.css`
- [x] 2.4 Smoke-test grain and vignette on Beranda and KasusDetail — confirm no click/tap events are blocked by overlays

## 3. Wood Frame

- [x] 3.1 Add `.wood-frame` CSS class to `index.css` — `border: 18px solid transparent`, `border-image` with walnut linear-gradient, `box-shadow` inner + outer depth
- [x] 3.2 Verify frame does not introduce horizontal or vertical scroll at 1280px viewport
- [x] 3.3 Verify frame corners are square (no border-radius)

## 4. App Shell

- [x] 4.1 Create `AppShell` wrapper component in `apps/frontend/src/app.tsx` (inline, thin wrapper — `<div className="wood-frame flex h-screen overflow-hidden">`)
- [x] 4.2 Wrap all `<Routes>` content in `AppShell` within `app.tsx`
- [x] 4.3 Confirm Sign-in and Sign-up screens render correctly inside the shell (no layout breakage)

## 5. Cork Sidebar — LocalStorage Module

- [x] 5.1 Create `apps/frontend/src/lib/case-history.ts` — exports `pushCaseHistory(entry)`, `getCaseHistory()`, `MAX_HISTORY = 20`; wraps all `localStorage` calls in `try/catch`
- [x] 5.2 Implement deduplication: visiting an existing case ID moves it to the top rather than duplicating
- [x] 5.3 Write unit tests for `pushCaseHistory` covering: add new entry, deduplication, cap at 20, localStorage failure silently degrades

## 6. Cork Sidebar — Component

- [x] 6.1 Create `apps/frontend/src/components/case-history-sidebar.tsx` — renders a `<nav>` with `bg-cork` background, cork grain CSS, `w-52 shrink-0 hidden lg:flex flex-col`
- [x] 6.2 Add amber-pin marker (`bg-amber-pin`, small circle) before each case history entry link
- [x] 6.3 Add empty-state placeholder label when history is empty
- [x] 6.4 Integrate `CaseHistorySidebar` into `AppShell` as the leftmost element
- [x] 6.5 Call `pushCaseHistory` in `KasusDetailScreen` on mount with `{ id: caseId, name: caseQ.data?.name }`
- [x] 6.6 Verify sidebar is hidden at phone width and visible at `lg` breakpoint

## 7. Node Card Redesign

- [x] 7.1 Add `typeAccentColor(entity: EntityDto): string` helper in `peta-kasus.tsx` returning the accent hex per entity type table in the visual-identity spec
- [x] 7.2 Update `flowNodes` `style` object: add `boxShadow`, update `background` to include `radial-gradient` pin mark at top-left (`circle at 10px 10px, #D4A017 3px, transparent 3px`), add `borderLeft: '4px solid <typeAccentColor>'`
- [x] 7.3 Update selected node `boxShadow` to include amber glow component (`0 0 12px rgba(212,160,23,0.35)`)
- [x] 7.4 Visually verify node cards at 10, 20, and 40 nodes — confirm shadows render correctly and type accent bars are distinct

## 8. Edge / String System

- [x] 8.1 Add `edgeWidth(edge: RelationshipDto): number` helper returning stroke width by certainty
- [x] 8.2 Add `edgeDash(edge: RelationshipDto): string` helper returning `strokeDasharray` value by certainty
- [x] 8.3 Add `edgeCurvature(edge: RelationshipDto): number` helper returning bezier curvature by certainty
- [x] 8.4 Update `flowEdges` to apply `strokeWidth`, `strokeDasharray`, `pathOptions: { curvature }`, `zIndex`, `markerStart`, `markerEnd` (circle markers in edge colour)
- [x] 8.5 Update `flowEdges` label styling: `labelStyle` (Special Elite 9px, `#1F3529`), `labelBgStyle` (parchment bg, rule border, `strokeWidth: 1`), `labelBgBorderRadius: 0`, `labelBgPadding: [2, 6]`
- [x] 8.6 Create `CustomEstablishedEdge` component in `peta-kasus.tsx`: renders the bezier SVG path with an `feTurbulence` displacement filter (amplitude ≤ 1px) defined in `<defs>`
- [x] 8.7 Register `CustomEstablishedEdge` in `edgeTypes` prop on `<ReactFlow>` and set `type: 'established'` on edges with `certainty === 'established'`
- [x] 8.8 Add `@media (prefers-reduced-motion: reduce)` guard: when active, render established edges as plain edges without the texture filter

## 9. Z-index Audit

- [x] 9.1 Verify grain overlay and vignette do not sit above ReactFlow controls, Profil bottom sheet, SourcePanel, or GlosariumOverlay — z-index set to 19/20, below modals at z-30/z-40
- [x] 9.2 Adjust overlay z-indices downward if any conflict is found; document the final z-index ladder in a code comment in `index.css`

## 10. Responsive Verification

- [x] 10.1 Smoke-test KasusDetail three-column layout at exactly `1024px` viewport width with the cork sidebar visible — verify no column overflow
- [x] 10.2 Smoke-test KasusDetail at phone width (`375px`) — verify cork sidebar is hidden, layout is unchanged from pre-change behaviour
- [x] 10.3 Smoke-test Beranda, Account, and Sign-in screens inside the AppShell at both breakpoints
