# Capability: Relationship Graph

## Purpose

Models the Relationship record and defines the Peta Kasus (relationship graph) UI rendered with React Flow. The graph renders entities and edges active at the timeline-driven `asOfDate`, supports certainty and node-type filters, cluster detection, and bidirectional tap interactions linked to the Garis Waktu and Dosier sections.

## Requirements

### Requirement: Relationship record, owned

The system SHALL model a Relationship as a typed edge between two entities in the same user's dossier, owned by exactly one user (`owner_user_id`), carrying a relationship type (e.g., `employed_by`, `allegedly_paid`, `testified_for`, `prosecuted_by`, `ruled_on`, `owned_by`), a certainty label, at least one source id (referencing a Source owned by the same user), an active-from date, an optional active-to date, and a Bahasa Indonesia description.

#### Scenario: Edge without source rejected

- **WHEN** any code path attempts to persist a relationship with an empty source-id list
- **THEN** the system rejects the write

#### Scenario: Cross-user endpoint rejected

- **WHEN** a write attempts to persist a relationship where the `from_entity_id`, `to_entity_id`, or any source id references a row owned by a different user
- **THEN** the system rejects the write at validation

### Requirement: Node types on the graph

The system SHALL render the following node types on the Peta Kasus canvas: `person` (defendant, witness, judge, prosecutor, public official subroles), `institution` (ministry, court, agency), `company` (vendor, intermediary, beneficiary), `document` (indictment, putusan, audit report), and `money_flow` with the alleged amount and a `state_loss` vs `personal_enrichment` distinction.

#### Scenario: Money-flow node rendering

- **WHEN** a money-flow node is rendered
- **THEN** the node displays the alleged amount and one of the badges `state_loss` or `personal_enrichment`

### Requirement: Peta Kasus rendered with React Flow

The system SHALL render the Peta Kasus relationship graph as a React Flow canvas in a React component. The canvas SHALL support pinch-zoom, pan, and tap interactions on mobile-web. Layout SHALL use a force-directed (or otherwise readable) positioning function provided per render; the canonical store remains the source of truth and React Flow is the renderer, not a state owner.

#### Scenario: Mobile pinch and pan

- **WHEN** the user pinches on the graph on a touch device
- **THEN** the canvas zooms toward the pinch focus point
- **WHEN** the user drags two fingers
- **THEN** the canvas pans accordingly without selecting nodes

#### Scenario: No vendor lock-in for state

- **WHEN** the graph is re-projected (filters change, `asOfDate` changes, new revisions land)
- **THEN** the new visible-set is computed by the application layer and passed as props to React Flow; React Flow does not retain dossier state across re-projections

### Requirement: As-of-date driven by the linked timeline section

The system SHALL render the Peta Kasus filtered to entities and relationships active at the Kasus Detail screen's `asOfDate`. The `asOfDate` SHALL be derived solely from the user's selection within the Garis Waktu section (per the event-timeline capability); the graph SHALL NOT expose its own date-scrubber widget.

#### Scenario: Edge disappears outside its active window

- **GIVEN** a relationship in the user's dossier with `active_from = 2023-01-01` and `active_to = 2023-12-31`
- **WHEN** the timeline-driven `asOfDate` is 2024-06-01
- **THEN** that edge is not rendered on the canvas

#### Scenario: Live re-render on timeline selection

- **WHEN** the user selects an event card in Garis Waktu and the `asOfDate` updates
- **THEN** the Peta Kasus canvas re-renders to show the active node and edge set for the new `asOfDate`

### Requirement: Certainty filter

The system SHALL provide a toggle that allows the user to show or hide each of the five certainty bands independently. Hidden bands SHALL be removed from the canvas, not merely greyed out.

#### Scenario: Hiding `unverified` band

- **WHEN** the user toggles `unverified` off
- **THEN** every edge with certainty `unverified` is removed from the canvas
- **AND** any node that becomes orphaned (no remaining visible edges) renders as faded

### Requirement: Node-type filter

The system SHALL provide toggles to show or hide each of `person`, `institution`, `company`, `document`, and `money_flow` independently.

#### Scenario: Hiding money flows

- **WHEN** the user toggles `money_flow` off
- **THEN** all money-flow nodes and their edges are removed from the canvas

### Requirement: Cluster detection overlay

The system SHALL compute structural clusters on the user's case graph on demand and surface them as collapsible groups labeled by the AI cluster-label port (e.g., "Kelompok PT X — 4 entitas"). The user SHALL be able to expand or collapse any cluster.

#### Scenario: Cluster default state by node count

- **GIVEN** a user's case with more than the configured node-count threshold
- **WHEN** the graph is first rendered
- **THEN** clusters render in the collapsed state by default

### Requirement: Draggable node repositioning within the session

The system SHALL allow the user to drag individual entity nodes to any position within the Peta Kasus canvas. Repositioned nodes SHALL remain at their new position for the duration of the session. Node positions SHALL reset to the default force-directed layout on page refresh.

#### Scenario: Node dragged to new position

- **WHEN** the user drags an entity node to a new position on the canvas
- **THEN** the node renders at the new position
- **AND** connected edges re-route to the new node position

#### Scenario: Positions reset on refresh

- **WHEN** the user refreshes the page
- **THEN** all node positions revert to the default computed layout
- **AND** no error is shown

### Requirement: Tap interactions and linked selection

The system SHALL open the entity's profile in the right tray Dossier tab detail pane when a graph node is tapped, and SHALL open the source detail in the right tray Source tab detail pane when an edge is tapped. Tapping a node SHALL also filter the Garis Waktu section to events involving that entity, and SHALL highlight that entity in the right tray Dossier list. No full-height overlay SHALL appear outside the right tray as a result of these tap interactions.

#### Scenario: Tap a node

- **WHEN** the user taps an entity node in Peta Kasus
- **THEN** the right tray switches to the Dossier tab
- **AND** the detail pane at the bottom of the right tray opens showing the entity profile for that entity scoped to the current case
- **AND** the Garis Waktu filter is set to events involving that entity

#### Scenario: Tap an edge

- **WHEN** the user taps a relationship edge in Peta Kasus
- **THEN** the right tray switches to the Source tab
- **AND** the detail pane at the bottom of the right tray opens showing the relationship type, certainty, and source references for that edge
- **AND** no overlay appears outside the right tray column

### Requirement: Append-only revision history for Relationships

The system SHALL retain every create, update, and tombstone of a Relationship as a revision in a `relationships_revisions` table, with the standard revision-row shape (`revision_no`, `valid_from`, `valid_to`, actor `user_id`, `change_kind`, full payload).

#### Scenario: Owner browses relationship history

- **WHEN** the owner requests the revision history for one of their relationships
- **THEN** the response lists every revision in `revision_no` order with its payload, change_kind, valid_from, valid_to, and actor
