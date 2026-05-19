## ADDED Requirements

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

## MODIFIED Requirements

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
