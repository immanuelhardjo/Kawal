## ADDED Requirements

### Requirement: Normative colour token system

The system SHALL define and use a fixed set of semantic colour tokens implemented in `apps/frontend/tailwind.config.js`. No component SHALL use raw hex colour values in Tailwind class strings; hex values are permitted only in ReactFlow inline style objects (see ReactFlow node/edge colouring requirement).

The canonical token values are:

| Token | Hex | Role |
|---|---|---|
| `board` | `#1F3529` | Main surface — chalkboard green |
| `board-shadow` | `#172B22` | Sidebar / deeper surface |
| `parchment` | `#EDE8D0` | Evidence card / manila paper |
| `chalk` | `#F0EBD8` | Primary text on dark surfaces |
| `chalk-muted` | `#9DB89A` | Secondary/muted text on dark surfaces |
| `string` | `#C0392B` | Edge / connection lines (red string) |
| `amber-pin` | `#D4A017` | Highlight / active / pinned evidence |
| `rule` | `#2D5040` | Divider lines on dark surfaces |
| `stamp-verified` | `#27AE60` | Terverifikasi certainty stamp |
| `stamp-alleged` | `#E67E22` | Dugaan certainty stamp |
| `stamp-reported` | `#3498DB` | Dilaporkan certainty stamp |
| `stamp-disputed` | `#8E44AD` | Disengketakan certainty stamp |
| `stamp-unverified` | `#95A5A6` | Belum terverifikasi certainty stamp |

#### Scenario: Token usage in components

- **WHEN** any Tailwind class string in `apps/frontend/src` or `packages/ui/src` is inspected
- **THEN** colour utilities reference only the tokens above (e.g., `bg-board`, `text-chalk`, `border-rule`) and no raw hex or arbitrary-value colour classes (e.g., `bg-[#1F3529]`) are present

#### Scenario: Token definition location

- **WHEN** the `tailwind.config.js` file in `apps/frontend` is read
- **THEN** all tokens from the table above are present under `theme.extend.colors` with the exact hex values specified

### Requirement: Normative typography stack

The system SHALL use exactly three font families loaded as self-hosted Fontsource packages. No external font CDN links SHALL appear in `index.html` or any CSS file.

| Role | Family | Fontsource package | Usage |
|---|---|---|---|
| Headline | Playfair Display | `@fontsource/playfair-display` | Screen titles, entity names, section headings |
| Body | IBM Plex Serif | `@fontsource/ibm-plex-serif` | Body paragraphs, descriptions, fact text |
| Typewriter / ID | Special Elite | `@fontsource/special-elite` | Entity IDs, timestamps, source URLs, code snippets |

The `font-sans` Tailwind alias SHALL map to IBM Plex Serif so that existing `font-sans` usages default to the body font without requiring a class rename. `font-headline` SHALL map to Playfair Display. `font-mono` SHALL map to Special Elite.

#### Scenario: No CDN font requests

- **WHEN** the application is loaded in a network-restricted environment (no external DNS)
- **THEN** all fonts render correctly because they are bundled by Vite from Fontsource packages

#### Scenario: Font alias correctness

- **WHEN** `tailwind.config.js` is read
- **THEN** `theme.extend.fontFamily.sans` resolves to IBM Plex Serif, `theme.extend.fontFamily.headline` resolves to Playfair Display, and `theme.extend.fontFamily.mono` resolves to Special Elite

#### Scenario: Minimum typewriter font size

- **WHEN** any component renders text using `font-mono` (Special Elite)
- **THEN** the font size is 11px (0.6875rem) or larger to maintain legibility of the typewriter face

### Requirement: Certainty label rendered as rubber stamp

The `CertaintyChip` component in `packages/ui` SHALL render certainty labels as rubber-stamp–style bordered boxes rather than rounded pill badges. The stamp SHALL use uppercase text with wide letter-spacing, zero border-radius, a 2px solid border in the stamp colour, and the stamp colour for the text. No filled background on the stamp box.

#### Scenario: Stamp appearance

- **WHEN** a `CertaintyChip` with any `certainty` value is rendered
- **THEN** the chip has `border-radius: 0`, a `2px solid` border in the stamp colour, uppercase text in the stamp colour, and `letter-spacing: 0.1em` or wider; the background is transparent

#### Scenario: Stamp colour mapping

- **WHEN** a `CertaintyChip` is rendered for each certainty level
- **THEN** the border and text colour matches: `established` → `stamp-verified` (#27AE60), `alleged` → `stamp-alleged` (#E67E22), `reported` → `stamp-reported` (#3498DB), `disputed` → `stamp-disputed` (#8E44AD), `unverified` → `stamp-unverified` (#95A5A6)

#### Scenario: No urgency prop introduced

- **WHEN** the `CertaintyChip` component interface is inspected
- **THEN** no `urgency`, `pulse`, `animate`, or `breaking` prop is present (per presentation-principles)

### Requirement: ReactFlow canvas uses chalkboard visual language

The Peta Kasus canvas SHALL use visual elements that reinforce the chalkboard metaphor: chalk-coloured dot grid, parchment-coloured node cards, and coloured edge lines matching the certainty level of the relationship.

#### Scenario: Background dot grid colour

- **WHEN** the Peta Kasus canvas is rendered
- **THEN** the ReactFlow `<Background>` component uses `color="#2D5040"` (rule green chalk dots on board)

#### Scenario: Node card appearance

- **WHEN** a node is rendered on the canvas
- **THEN** the node card has `background: #EDE8D0` (parchment), `border: 1px solid #2D5040`, and dark-green text (`#1F3529`)

#### Scenario: Selected node highlight

- **WHEN** a node is selected (its ID matches `selectedEntityId`)
- **THEN** the node border changes to `2px solid #D4A017` (amber-pin)

#### Scenario: Edge colour by certainty

- **WHEN** an edge is rendered with a given certainty level
- **THEN** the edge stroke colour is: `established` → `#C0392B`, `alleged` → `#D4A017`, `reported` → `#3498DB`, `disputed` → `#8E44AD`, `unverified` → `#9DB89A`
