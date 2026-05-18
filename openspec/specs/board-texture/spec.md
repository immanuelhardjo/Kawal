# Capability: Board Texture

## Purpose

Defines the visual texture effects applied to the board surface — a CSS grain overlay, a radial-gradient edge vignette, and chalk text diffusion — that together simulate the physical appearance of a chalkboard.

## Requirements

### Requirement: Board grain overlay

The system SHALL render a CSS grain texture over the entire board surface using a fixed-position pseudo-element. The grain SHALL be implemented as an SVG `feTurbulence` fractal-noise pattern, desaturated to monochrome, applied at an opacity no greater than 4% so that it is perceptible but does not reduce readability of any text or component beneath it.

#### Scenario: Grain is present on board surface

- **WHEN** any screen backed by the `board` background colour is rendered
- **THEN** a fine monochromatic noise grain is visible over the surface at opacity ≤ 4%

#### Scenario: Grain does not intercept pointer events

- **WHEN** the user clicks, taps, or hovers any interactive element on a board-backed screen
- **THEN** the grain overlay does not capture or block the pointer event

#### Scenario: Grain covers full viewport regardless of scroll

- **WHEN** the user scrolls a page that extends beyond the viewport height
- **THEN** the grain overlay remains fixed and covers the full viewport at all scroll positions

### Requirement: Board edge vignette

The system SHALL render a radial-gradient vignette overlay that darkens the edges of the board surface, simulating the physical appearance of a chalkboard mounted in a frame. The vignette SHALL be transparent at the viewport centre and reach a maximum opacity of 30% black at the viewport edges.

#### Scenario: Vignette darkens edges

- **WHEN** any board-backed screen is rendered
- **THEN** the centre of the viewport is unaffected and the edges show a progressively darker overlay, with maximum darkness at the viewport corners

#### Scenario: Vignette does not intercept pointer events

- **WHEN** the user interacts with any element near the edge of the viewport
- **THEN** the vignette overlay does not capture the pointer event

### Requirement: Chalk text diffusion

The system SHALL apply a subtle `text-shadow` to all text rendered on the board surface, simulating the slight powder-spread of real chalk. The shadow SHALL use the `chalk` colour at no more than 15% opacity and a blur radius of 8px.

#### Scenario: Chalk diffusion visible on headline text

- **WHEN** a Playfair Display headline is rendered on the board surface
- **THEN** a faint luminous halo is visible around the text, consistent with chalk powder spread

#### Scenario: Chalk diffusion does not impair legibility at body sizes

- **WHEN** IBM Plex Serif body text at 14px or larger is rendered on the board surface
- **THEN** the text remains fully legible and the shadow does not cause letter forms to blur into each other

#### Scenario: Chalk diffusion is not applied to parchment cards

- **WHEN** text inside a parchment-coloured node card or evidence card is rendered
- **THEN** no chalk text-shadow is applied to that text (the shadow is a board-surface effect only)
