## ADDED Requirements

### Requirement: Global app shell with cork sidebar

The system SHALL render all authenticated screens inside an `AppShell` wrapper component that provides the wood frame border and the cork case-history sidebar. The `AppShell` SHALL be the outermost layout boundary for all routes requiring authentication. Unauthenticated screens (Sign-in, Sign-up) SHALL also render within the `AppShell` to maintain the wood frame, but MAY omit the cork sidebar.

#### Scenario: AppShell wraps all authenticated routes

- **WHEN** any authenticated screen (Beranda, KasusDetail, Account) is rendered
- **THEN** the screen content is a child of the `AppShell` component, which provides the wood frame border and the cork sidebar at desktop widths

#### Scenario: Cork sidebar is navigation-only

- **WHEN** the cork sidebar is rendered
- **THEN** it contains only navigation entries (case history links) and no content sections, query controls, filter chips, or data-bearing primitives — it is a navigation rail, not a content panel

#### Scenario: Sidebar does not count as a KasusDetail section

- **WHEN** the KasusDetail screen is rendered within the AppShell
- **THEN** the cork sidebar is provided by the AppShell shell layer and is NOT counted as one of the four KasusDetail sections (Peta Kasus, Garis Waktu, Dosier, Profil); the four-section constraint from the one-screen-one-job requirement is unaffected
