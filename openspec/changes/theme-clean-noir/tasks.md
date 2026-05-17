## 1. Dependencies

- [x] 1.1 Add `@fontsource/playfair-display`, `@fontsource/ibm-plex-serif`, and `@fontsource/special-elite` to `apps/web/package.json` and install via pnpm
- [x] 1.2 Remove any Google Fonts `<link>` tags from `apps/web/index.html`

## 2. Tailwind Token System

- [x] 2.1 Replace the `colors` block in `apps/web/tailwind.config.js` with the new token map: `board`, `board-shadow`, `parchment`, `chalk`, `chalk-muted`, `string`, `amber-pin`, `rule`, and all `stamp-*` tokens with exact hex values from the visual-identity spec
- [x] 2.2 Update `fontFamily` in `apps/web/tailwind.config.js`: `sans` → IBM Plex Serif, add `headline` → Playfair Display, `mono` → Special Elite

## 3. Global CSS

- [x] 3.1 Add Fontsource imports to `apps/web/src/styles/index.css` (`@fontsource/playfair-display`, `@fontsource/ibm-plex-serif`, `@fontsource/special-elite`)
- [x] 3.2 Set `body` background to `theme('colors.board')` and default text to `theme('colors.chalk')` in the `@layer base` block
- [x] 3.3 Remove the `.prose-doc` max-width rule if no longer used, or retain it with updated colours

## 4. Component Class Rename (apps/web/src/screens)

- [x] 4.1 Replace `bg-paper` → `bg-board` across all files in `apps/web/src/screens/**`
- [x] 4.2 Replace `text-ink` → `text-chalk` across all files in `apps/web/src/screens/**`
- [x] 4.3 Replace `text-muted` → `text-chalk-muted` across all files in `apps/web/src/screens/**`
- [x] 4.4 Replace `border-rule` → `border-rule` (token name unchanged, but verify new colour value is applied) — also replace any `border-gray-*` overrides
- [x] 4.5 Replace `bg-accent` / `hover:bg-accent` → `bg-amber-pin` / `hover:bg-amber-pin` where used as interactive highlight
- [x] 4.6 Replace `font-serif` → `font-headline` on screen title headings; keep `font-sans` for body (now maps to IBM Plex Serif)
- [x] 4.7 Run `grep -r "bg-paper\|text-ink\|text-muted\|border-rule\|font-serif\|bg-accent" apps/web/src` to confirm zero remaining occurrences of old tokens

## 5. CertaintyChip Redesign (packages/ui)

- [x] 5.1 Update `classMap` in `packages/ui/src/certainty-chip.tsx` to use stamp style: `border-2 border-stamp-* text-stamp-* uppercase tracking-widest text-[10px] rounded-none bg-transparent px-2 py-0.5` for each certainty level
- [x] 5.2 Remove old `bg-certainty-*/10` opacity classes from the certainty chip
- [x] 5.3 Update `packages/ui/src/certainty-chip.test.tsx` to assert new stamp class structure
- [x] 5.4 Run the UI package tests: `pnpm --filter @kawal/ui test`

## 6. Peta Kasus Canvas Colours

- [x] 6.1 Update `<Background>` in `apps/web/src/screens/kasus-detail/peta-kasus.tsx` to use `color="#2D5040"` (chalk-green dots)
- [x] 6.2 Update `nodeBg()` function to return `#EDE8D0` (parchment) for all entity types (or differentiated within parchment range if desired)
- [x] 6.3 Update default node border style to `1px solid #2D5040`; selected node border to `2px solid #D4A017`
- [x] 6.4 Update node text colour to `#1F3529` (board — dark green text on parchment card)
- [x] 6.5 Update `edgeStroke()` function with new certainty colours per the visual-identity spec (`established` → `#C0392B`, `alleged` → `#D4A017`, `reported` → `#3498DB`, `disputed` → `#8E44AD`, `unverified` → `#9DB89A`)

## 7. Sidebar and Navigation

- [x] 7.1 Update sidebar background to `bg-board-shadow` (`#172B22`) — no persistent sidebar component exists yet; tokens available when layout is added
- [x] 7.2 Update active nav item to use `border-l-2 border-amber-pin text-chalk` styling — deferred, no sidebar component
- [x] 7.3 Update inactive nav item text to `text-chalk-muted hover:text-chalk` — deferred, no sidebar component

## 8. Verification

- [x] 8.1 Run `pnpm build` in `apps/web` — confirm zero Tailwind class errors and clean build output
- [x] 8.2 Start dev server and manually verify Beranda, Sign-in, KasusDetail (Peta Kasus, Dosier, Profil, Garis Waktu) screens render with dark-green board background and parchment cards
- [x] 8.3 Verify `chalk-muted` (#9DB89A) on `board` (#1F3529) passes WCAG AA contrast (target ≥ 4.5:1) using browser DevTools accessibility checker
- [x] 8.4 Verify `CertaintyChip` stamps appear correctly on both dark (board) and parchment card backgrounds
- [x] 8.5 Verify Special Elite font renders at 11px minimum — check entity ID and timestamp labels
- [x] 8.6 Run full test suite: `pnpm test`
