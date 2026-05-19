## MODIFIED Requirements

### Requirement: Garis Waktu rendered as a react-chrono horizontal timeline

The system SHALL render the Garis Waktu (timeline) using react-chrono in HORIZONTAL mode, with Event items laid out left-to-right in chronological order. Each event card SHALL display the date, the headline, the certainty chip, and the event type — with certainty visible before the summary text in reading order. Selecting an event card SHALL set the Kasus Detail screen's `asOfDate` to that event's date.

#### Scenario: Rendering order

- **GIVEN** a user's case with events on 2024-03-01, 2024-05-12, and 2025-01-20
- **WHEN** the timeline is rendered for that case
- **THEN** react-chrono renders three cards in left-to-right chronological order (2024-03-01 leftmost, 2025-01-20 rightmost)
- **AND** the certainty chip on each card visually precedes the summary text

#### Scenario: Card selection sets asOfDate

- **WHEN** the user clicks the event card dated 2024-05-12
- **THEN** the Kasus Detail `asOfDate` becomes 2024-05-12
- **AND** the Peta Kasus section re-renders to reflect the new date

#### Scenario: Theme matches design system

- **WHEN** the timeline is rendered
- **THEN** card backgrounds use the board colour token, card text uses the chalk token, and active/selected indicators use the amber-pin token

### Requirement: Timeline drives the relationship-graph as-of-date

The system SHALL treat the user's current card selection within the Garis Waktu as the single `asOfDate` for the Kasus Detail screen. The Peta Kasus relationship graph SHALL render only entities and relationships active at the timeline-driven `asOfDate`. There SHALL NOT be a separate scrubber widget for the graph.

#### Scenario: Tapping a timeline event sets the graph's date

- **WHEN** the user selects an event card dated 2024-06-15 in Garis Waktu
- **THEN** the Kasus Detail `asOfDate` becomes 2024-06-15
- **AND** the Peta Kasus re-renders to show only nodes and edges active on that date

#### Scenario: No standalone graph scrubber

- **WHEN** the Kasus Detail screen is inspected
- **THEN** no UI control exists that scrubs the graph's date independently of the timeline

## REMOVED Requirements

### Requirement: Garis Waktu rendered as a React Flow timeline

**Reason**: Replaced by react-chrono HORIZONTAL mode (see "Garis Waktu rendered as a react-chrono horizontal timeline" above). The custom ReactFlow-based timeline layout required manual node positioning and did not expose standard timeline UX patterns.

**Migration**: `garis-waktu.tsx` is rewritten; the ReactFlow import and `buildTimelineLayout` function are removed. Event data mapping changes from ReactFlow `Node[]` to react-chrono `TimelineItem[]`.

### Requirement: Draggable timeline cursor updates the graph continuously

**Reason**: react-chrono HORIZONTAL mode does not expose a draggable cursor primitive. The interaction model changes to click-to-select-date, which is covered by "Card selection sets asOfDate" in the updated requirement above.

**Migration**: No migration needed for end users. The `asOfDate` is still driven by timeline interaction; only the gesture type changes from drag to click.
