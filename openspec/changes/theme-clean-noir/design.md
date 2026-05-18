## Context

The current KAWAL web app uses Tailwind CSS with a custom token set (`paper`, `ink`, `muted`, `rule`, `accent`) defined in `apps/frontend/tailwind.config.js`. The font stack is Inter (sans) and Source Serif Pro (serif), loaded via Google Fonts CDN in `index.html`. All component classes in `apps/frontend/src/screens/**` and `packages/ui/src` reference these tokens directly.

The `CertaintyChip` component in `packages/ui` renders translucent pill badges using `bg-certainty-*/10` opacity utilities. The ReactFlow canvas in `peta-kasus.tsx` uses hardcoded hex values for node backgrounds and edge strokes.

The `presentation-principles` spec governs tone and layout constraints but does not yet codify a normative visual token system — colour values and font choices have only been stated in comments.

## Goals / Non-Goals

**Goals:**

- Replace the light-cream palette with a dark chalkboard-green theme (`board`, `chalk`, `parchment`, `string`, `amber-pin` tokens).
- Replace Inter/Source Serif Pro with Special Elite (typewriter IDs), Playfair Display (headlines), and IBM Plex Serif (body) loaded via Fontsource (no external CDN).
- Redesign `CertaintyChip` as a rubber-stamp–style bordered box (uppercase, condensed, colour-coded by certainty level).
- Update ReactFlow canvas to use chalk-on-green dot grid, parchment node cards, and red-string edges.
- Record the approved palette and typography in the `visual-identity` spec and the `presentation-principles` delta spec.

**Non-Goals:**

- No light/dark mode toggle — the noir theme is the single mode.
- No changes to layout, routing, or information architecture.
- No changes to API contracts, data models, or backend code.
- No animation or texture overlays (Clean Noir variant — flat surfaces only).
- No changes to Indonesian copy strings or i18n bundle.

## Decisions

### D1 — Token rename (semantic names over value-only swap)

**Decision**: Rename tokens (`paper` → `board`, `ink` → `chalk`, etc.) rather than reassigning hex values to existing names.

**Rationale**: Keeping `bg-paper` pointing to `#1F3529` (near-black green) is semantically broken for every future developer reading the class. Semantic token names make intent explicit and reduce the chance of accidental misuse. The cost is a mechanical find-and-replace across ~15 files, which is low-risk and easily scripted.

**Alternatives considered**: Reassigning hex values in `tailwind.config.js` only — rejected because `bg-paper` on a dark surface is permanently confusing.

**New token map**:

```
board         #1F3529   ← main surface (chalkboard green)
board-shadow  #172B22   ← sidebar / deeper surface
parchment     #EDE8D0   ← evidence card / manila paper
chalk         #F0EBD8   ← primary text on dark surfaces
chalk-muted   #9DB89A   ← secondary/muted text on dark surfaces
string        #C0392B   ← edge / connection lines (red string)
amber-pin     #D4A017   ← highlight / active / pinned evidence
rule          #2D5040   ← divider lines on dark surfaces (lighter green)
```

Certainty stamp colours (standalone, not under `certainty.*` namespace):

```
stamp-verified    #27AE60   ← green (terverifikasi)
stamp-alleged     #E67E22   ← amber (dugaan)
stamp-reported    #3498DB   ← blue (dilaporkan)
stamp-disputed    #8E44AD   ← purple (disengketakan)
stamp-unverified  #95A5A6   ← grey (belum terverifikasi)
```

### D2 — Font loading via Fontsource (no CDN)

**Decision**: Install `@fontsource/special-elite`, `@fontsource/playfair-display`, and `@fontsource/ibm-plex-serif` as npm packages; import them in `apps/frontend/src/styles/index.css`.

**Rationale**: Fontsource bundles fonts as self-hosted static assets bundled by Vite. No external DNS lookup, no privacy risk, works offline, and eliminates the CDN link in `index.html`. Build output increases by ~200 KB (woff2 subsets), which is acceptable.

**Alternatives considered**: Google Fonts CDN — rejected due to external request latency and data-sovereignty concerns for an investigation tool. System fonts only — rejected because Special Elite's typewriter character is central to the noir aesthetic.

**Font role assignments**:

```
font-headline  → Playfair Display (headings: screen titles, entity names)
font-body      → IBM Plex Serif (body paragraphs, descriptions, fact text)
font-mono      → Special Elite (IDs, timestamps, source snippets, code)
```

`font-sans` alias kept pointing to IBM Plex Serif as the default body font to avoid touching every `font-sans` reference.

### D3 — CertaintyChip as rubber stamp

**Decision**: Replace `rounded-md border` pill with `rounded-none border-2` box using `uppercase tracking-widest text-[10px]` for a stamp aesthetic.

**Rationale**: The pill badge is standard SaaS UI. The bordered, uppercase, zero-border-radius stamp reads as "official classification" — it matches the institutional weight that certainty labels carry in investigative work.

**Alternatives considered**: Filled solid badges — rejected (too visually heavy on the parchment card). Colour-only (no border) — rejected (border gives the stamp-cutout look essential to the metaphor).

### D4 — ReactFlow edge and node colours

**Decision**:
- Node cards: `background: #EDE8D0` (parchment), `border: 1px solid #2D5040` (rule green), dark green text.
- Selected node: `border: 2px solid #D4A017` (amber-pin highlight).
- Edges: `stroke: #C0392B` for `established`, `#D4A017` for `alleged`, `#3498DB` for `reported`, `#8E44AD` for `disputed`, `#9DB89A` for `unverified`.
- Background: `<Background color="#2D5040" gap={24} size={1} />` (chalk-green dots on board).

**Rationale**: Parchment nodes on green board creates the core "evidence card pinned to corkboard" metaphor. Red-string edges are the canonical detective-board visual cue and need no explanation to investigators.

### D5 — Hardcoded hex in peta-kasus.tsx

**Decision**: Leave `nodeBg()` and `edgeStroke()` functions as explicit hex values (matching the new palette). Do not attempt to reference Tailwind CSS variables inside ReactFlow inline style objects.

**Rationale**: ReactFlow node/edge styling uses JS inline style objects, not class strings — Tailwind utility classes cannot apply there. Hardcoded hex is the correct approach; values are defined once in this file and cross-referenced from the visual-identity spec.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Token rename across ~15 files introduces a missed reference | Run `grep -r "bg-paper\|text-ink\|text-muted\|border-rule\|bg-accent"` after rename to verify zero occurrences |
| Fontsource adds ~200 KB to initial bundle | Vite code-splits fonts lazily; acceptable for an internal investigation tool (not a public consumer app) |
| Special Elite may be hard to read at small sizes (< 11px) | Restrict `font-mono` use to 11px minimum; verify IDs and timestamps at that floor in review |
| Stamp-style chips with `tracking-widest` may overflow narrow containers | Set `max-w` and `overflow-hidden text-ellipsis` on chip wrapper; test on phone-width layout |
| Dark green background may reduce contrast for chalk-muted text | Verify `chalk-muted` (#9DB89A) on `board` (#1F3529) passes WCAG AA (4.5:1) — calculated ratio is ~4.8:1, marginal; use `chalk` for anything functionally important |

## Migration Plan

1. Install Fontsource packages.
2. Update `tailwind.config.js` with new tokens and font stacks.
3. Update `apps/frontend/src/styles/index.css` with Fontsource imports and dark-green body.
4. Rename token classes across `apps/frontend/src/screens/**` and `packages/ui/src` (mechanical find-and-replace).
5. Redesign `CertaintyChip` in `packages/ui/src/certainty-chip.tsx`.
6. Update `peta-kasus.tsx` node/edge/background colours.
7. Smoke-test all screens; verify WCAG contrast on chalk-muted.
8. Update presentation-principles delta spec.

**Rollback**: All changes are in frontend styling only. Git revert of the PR restores the previous theme instantly with no data migration needed.

## Open Questions

- None blocking implementation. Contrast for `chalk-muted` on `board` should be confirmed during build step 7 before merge.
