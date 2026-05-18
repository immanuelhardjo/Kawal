# Capability: Visual Identity

## Purpose

Defines the normative colour tokens, typography stack, and visual conventions that constitute the chalkboard-noir aesthetic of the system. All components and screens SHALL derive their visual appearance from these tokens and conventions.

## Requirements

### Requirement: Wood and cork colour tokens

The system SHALL define `wood`, `wood-mid`, `wood-light`, `cork`, and `cork-shadow` tokens in `apps/frontend/tailwind.config.js` under `theme.extend.colors`. No component SHALL use raw hex values for wood or cork colours in Tailwind class strings.

| Token | Hex | Role |
|---|---|---|
| `wood` | `#8B5E15` | Dark walnut frame |
| `wood-mid` | `#C4922A` | Mid grain |
| `wood-light` | `#E8B84B` | Light grain catch |
| `cork` | `#C19A6B` | Cork sidebar base |
| `cork-shadow` | `#A07850` | Cork grain shadow |

#### Scenario: Wood and cork token definition

- **WHEN** `tailwind.config.js` in `apps/frontend` is read
- **THEN** all five tokens above are present under `theme.extend.colors` with the exact hex values specified

### Requirement: Elevated node cards on the Peta Kasus canvas

Node cards on the Peta Kasus canvas SHALL appear visually elevated above the board surface via a drop shadow. Each card SHALL display an amber-pin attachment mark at the top-left corner and a colour-coded left accent bar encoding the entity type.

Entity-type accent bar colours:

| Entity type | Accent colour token | Hex |
|---|---|---|
| `person` | `chalk-muted` | `#9DB89A` |
| `institution` | `stamp-reported` | `#3498DB` |
| `company` | `stamp-reported` | `#3498DB` |
| `document` | `amber-pin` | `#D4A017` |

#### Scenario: Node card drop shadow

- **WHEN** any node is rendered on the Peta Kasus canvas
- **THEN** the node card has a visible drop shadow of approximately `3px 6px 16px rgba(0,0,0,0.45)` separating it visually from the board surface

#### Scenario: Node card amber-pin mark

- **WHEN** any node is rendered on the Peta Kasus canvas
- **THEN** a small amber circle (radius ~3px, colour `#D4A017`) is visible at the top-left corner of the parchment card, simulating a pin attachment

#### Scenario: Node card entity-type accent bar

- **WHEN** a node of a given entity type is rendered on the canvas
- **THEN** the left edge of the card shows a 4px solid border in the accent colour corresponding to that entity type per the table above

#### Scenario: Selected node amber glow

- **WHEN** a node is selected (its ID matches `selectedEntityId`)
- **THEN** the node card border is `2px solid #D4A017` AND the drop shadow includes an amber glow component: `0 0 12px rgba(212,160,23,0.35)`

### Requirement: ReactFlow canvas uses chalkboard visual language

The Peta Kasus canvas SHALL use visual elements that reinforce the chalkboard metaphor: chalk-coloured dot grid, elevated parchment-coloured node cards, and a five-dimension string system for edges matching the certainty level of the relationship.

#### Scenario: Background dot grid colour

- **WHEN** the Peta Kasus canvas is rendered
- **THEN** the ReactFlow `<Background>` component uses `color="#2D5040"` (rule green chalk dots on board)

#### Scenario: Node card appearance

- **WHEN** a node is rendered on the canvas
- **THEN** the node card has `background: #EDE8D0` (parchment) with an amber-pin mark at top-left, `border: 1px solid #2D5040`, dark-green text (`#1F3529`), a 4px left accent bar in the entity-type colour, and a drop shadow of `3px 6px 16px rgba(0,0,0,0.45)`

#### Scenario: Selected node highlight

- **WHEN** a node is selected (its ID matches `selectedEntityId`)
- **THEN** the node border changes to `2px solid #D4A017` (amber-pin) and the shadow gains an amber glow component

#### Scenario: Edge colour by certainty

- **WHEN** an edge is rendered with a given certainty level
- **THEN** the edge stroke colour is: `established` → `#C0392B`, `alleged` → `#D4A017`, `reported` → `#3498DB`, `disputed` → `#8E44AD`, `unverified` → `#9DB89A`

#### Scenario: Edge stroke weight by certainty

- **WHEN** an edge is rendered with a given certainty level
- **THEN** the stroke width is: `established` → 2.5px, `reported` → 1.5px, `alleged` → 1.5px, `disputed` → 1px, `unverified` → 0.75px

#### Scenario: Edge dash pattern by certainty

- **WHEN** an edge is rendered with a given certainty level
- **THEN** the stroke dash pattern is: `established` → solid (none), `reported` → solid (none), `alleged` → `8 4`, `disputed` → `3 4`, `unverified` → `2 4`

#### Scenario: Edge curvature by certainty

- **WHEN** an edge is rendered with a given certainty level
- **THEN** the bezier curvature is: `established` → 0.1 (taut), `reported` → 0.2, `alleged` → 0.35, `disputed` → 0.45, `unverified` → 0.5 (loose)

#### Scenario: Edge knot markers

- **WHEN** any edge is rendered on the canvas
- **THEN** a small filled circle (radius ~3px) in the edge's certainty colour is visible at both the source and target endpoints of the edge

#### Scenario: Edge tag label

- **WHEN** an edge with a type label is rendered on the canvas
- **THEN** the label appears in a parchment-coloured rectangular tag (`background: #EDE8D0`, `border: 1px solid #2D5040`, `border-radius: 0`, Special Elite 9px, dark green text) positioned at the midpoint of the edge

#### Scenario: Established edge texture

- **WHEN** an edge with `certainty === 'established'` is rendered
- **THEN** the edge stroke has a subtle SVG displacement filter applied that gives the line a slightly organic, thread-like appearance (displacement amplitude ≤ 1px)

#### Scenario: Edge z-order by certainty

- **WHEN** edges of different certainty levels overlap or cross on the canvas
- **THEN** higher-certainty edges render above lower-certainty edges: established (top) → reported → alleged → disputed → unverified (bottom)
