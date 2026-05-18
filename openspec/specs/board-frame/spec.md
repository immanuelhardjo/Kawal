# Capability: Board Frame

## Purpose

Defines the decorative wood-grain border that encloses the entire application viewport, providing the visual metaphor of a physical wooden chalkboard frame, including depth shadows on both inner and outer edges.

## Requirements

### Requirement: Wood frame border around the app viewport

The system SHALL render a decorative wood-grain border enclosing the entire application viewport. The border SHALL be implemented using CSS `border-image` with a linear-gradient simulating walnut wood grain, at a thickness of 18px on all four sides. The corners SHALL be square (no border-radius) to match the appearance of a physical wooden chalkboard frame.

The normative wood colour tokens are:

| Token | Hex | Role |
|---|---|---|
| `wood` | `#8B5E15` | Dark walnut — frame base and corner colour |
| `wood-mid` | `#C4922A` | Mid grain highlight |
| `wood-light` | `#E8B84B` | Brightest grain catch-light |

These tokens SHALL be added to `theme.extend.colors` in `tailwind.config.js`.

#### Scenario: Wood frame present on all screens

- **WHEN** any screen (Beranda, KasusDetail, Account, Sign-in, Sign-up) is rendered
- **THEN** an 18px wood-grain border is visible on all four edges of the viewport

#### Scenario: Wood frame token definition

- **WHEN** `tailwind.config.js` is read
- **THEN** `wood`, `wood-mid`, and `wood-light` tokens are present under `theme.extend.colors` with the exact hex values specified above

#### Scenario: Frame does not introduce scroll

- **WHEN** the wood frame border is applied
- **THEN** no horizontal or vertical scrollbar is introduced by the frame itself; the board content area fits within the remaining viewport space

### Requirement: Wood frame provides visual depth

The wood frame SHALL include an inset `box-shadow` on the inner edge to create the impression that the board surface is recessed within the frame, and an outer shadow to suggest the frame is mounted proud of the wall behind it.

#### Scenario: Inner shadow creates depth

- **WHEN** the board surface is viewed adjacent to the wood frame
- **THEN** a darkening inset shadow is visible along the inner edge of the frame, suggesting the board surface is below the frame level
