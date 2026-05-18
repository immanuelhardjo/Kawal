## ADDED Requirements

### Requirement: Visual token system is normative

The system's visual identity (colour palette, typography stack, and certainty-stamp convention) is codified in the `visual-identity` capability spec and SHALL be treated as an enforceable constraint equivalent to any other requirement in this document. Deviations require an openspec change to `visual-identity` or `presentation-principles`.

#### Scenario: Colour deviation rejected

- **WHEN** a pull request introduces a Tailwind class using a raw hex arbitrary value for colour (e.g., `bg-[#aabbcc]`) in any component under `apps/frontend/src` or `packages/ui/src`
- **THEN** the CI lint rule flags the usage and the build fails

#### Scenario: Font deviation rejected

- **WHEN** a pull request adds a font family not present in the normative typography stack (`@fontsource/playfair-display`, `@fontsource/ibm-plex-serif`, `@fontsource/special-elite`)
- **THEN** the CI lint or build step flags the addition for explicit review

## MODIFIED Requirements

### Requirement: Cool institutional tone

The system SHALL render copy throughout the UI in a calm, document-like register consistent with the chalkboard-noir visual identity. The system SHALL NOT use outrage typography (oversized headlines, all-caps shouting in body copy, exclamation styling), breaking-news banners, countdown timers, push-style toasts, or engagement-counter UI patterns.

Certainty labels rendered as rubber stamps (via `CertaintyChip`) use uppercase text as a deliberate classification-document convention — this is not considered "all-caps shouting" and is explicitly permitted.

#### Scenario: No urgency primitive

- **WHEN** any component in `packages/ui` is inspected
- **THEN** none of the primitives accept an `urgency`, `breaking`, `pulse`, or equivalent prop, and no animation primitive is exposed for fact-bearing rows

#### Scenario: Uppercase stamps not classified as outrage typography

- **WHEN** a `CertaintyChip` renders uppercase certainty text
- **THEN** this is accepted as a rubber-stamp classification convention and does not trigger the outrage-typography prohibition
