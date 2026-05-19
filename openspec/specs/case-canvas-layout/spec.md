# Capability: Case Canvas Layout

## Purpose

Defines the three-panel layout of the Kasus Detail screen: a left AI chat panel, a centre canvas panel (vertically split between Garis Waktu and Peta Kasus), and a right tray panel with dual tabs and a collapsible detail pane. On mobile viewports the layout collapses to a single-panel view controlled by a bottom tab bar.

## Requirements

### Requirement: Three-panel case canvas layout

The system SHALL render the Kasus Detail screen as three fixed columns: a left AI chat panel, a centre canvas panel, and a right tray panel. The header SHALL display only the case name. On desktop (`lg` breakpoint and above) all three panels SHALL be visible simultaneously. The back-to-beranda link, jurisdiction label, and status badge SHALL NOT appear in the header.

#### Scenario: Header shows only case name

- **WHEN** the Kasus Detail screen is rendered
- **THEN** the header contains only the case name text
- **AND** no back button, jurisdiction text, or status badge is present

#### Scenario: Three columns visible on desktop

- **WHEN** the screen is rendered at viewport width ≥ 1024px
- **THEN** the left AI chat panel, centre canvas panel, and right tray panel are all visible without scrolling or toggling

### Requirement: Centre canvas vertical split

The system SHALL divide the centre canvas panel into a top Garis Waktu section (approximately 30% of the available height) and a bottom Peta Kasus section (approximately 70% of the available height), with a visible dividing rule between them.

#### Scenario: Vertical proportions

- **WHEN** the centre canvas panel has a measured height of 800px
- **THEN** the Garis Waktu section occupies approximately 240px (±10%) and the Peta Kasus section occupies approximately 560px (±10%)

#### Scenario: Sections share state

- **WHEN** the user selects an event in Garis Waktu
- **THEN** the `asOfDate` in shared context updates and Peta Kasus re-renders without any layout reflow between the two sections

### Requirement: Right tray dual-tab with split-bottom detail

The system SHALL render the right tray as a container with two tabs (Dossier and Source) and a collapsible detail pane at the bottom of the tray. Selecting an item from the active tab list SHALL open the detail pane within the tray; no modal or full-height overlay SHALL appear outside the right tray.

#### Scenario: Dossier tab shows entity list

- **WHEN** the Dossier tab is active
- **THEN** the list pane shows the filterable entity list
- **AND** selecting an entity opens the entity profile in the tray's detail pane at the bottom

#### Scenario: Source tab shows source list

- **WHEN** the Source tab is active
- **THEN** the list pane shows all sources associated with the current case
- **AND** selecting a source opens the source detail in the tray's detail pane at the bottom

#### Scenario: Detail pane does not cover canvas

- **WHEN** an item is selected and the detail pane is open
- **THEN** the detail pane is contained within the right tray column and does not overlap or obscure the centre canvas or left chat panel

#### Scenario: Selecting a node in Peta Kasus auto-opens Dossier detail

- **WHEN** the user taps an entity node in Peta Kasus
- **THEN** the right tray switches to the Dossier tab
- **AND** the detail pane opens showing that entity's profile

### Requirement: Mobile tab navigation

The system SHALL render the Kasus Detail screen on viewports below `lg` breakpoint as a single-panel view controlled by a bottom tab bar with three tabs: Chat (AI chat panel), Kanvas (centre canvas with stacked Garis Waktu + Peta Kasus), and Dossier/Sumber (right tray). Only one panel SHALL be visible at a time.

#### Scenario: Tab switching on mobile

- **WHEN** the user taps the "Kanvas" tab on a mobile viewport
- **THEN** the centre canvas panel occupies the full available height and the other panels are hidden

#### Scenario: Three-panel layout not visible on mobile

- **WHEN** the screen is rendered at viewport width < 1024px
- **THEN** no more than one panel is visible at a time
