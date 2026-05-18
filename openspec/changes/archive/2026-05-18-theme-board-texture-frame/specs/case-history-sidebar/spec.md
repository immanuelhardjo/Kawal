## ADDED Requirements

### Requirement: Cork-material persistent case history sidebar

The system SHALL render a persistent left navigation sidebar in a cork-board material aesthetic, displaying the user's recently explored cases as amber-pinned entries. The sidebar SHALL be visible on all authenticated screens at the `lg` breakpoint and wider, and collapsed (zero width, hidden) below `lg`.

The normative cork colour tokens are:

| Token | Hex | Role |
|---|---|---|
| `cork` | `#C19A6B` | Cork base — sidebar background |
| `cork-shadow` | `#A07850` | Darker cork grain / panel shadow |

These tokens SHALL be added to `theme.extend.colors` in `tailwind.config.js`. The existing `amber-pin` token (`#D4A017`) is reused as the pin marker colour.

#### Scenario: Sidebar present on authenticated screens at desktop width

- **WHEN** any authenticated screen is rendered at viewport width ≥ 1024px
- **THEN** the cork sidebar is visible as a fixed-width left panel (~208px) with a cork-tan background

#### Scenario: Sidebar hidden on mobile

- **WHEN** any screen is rendered at viewport width < 1024px
- **THEN** the cork sidebar is not visible and occupies no horizontal space

#### Scenario: Cork token definition

- **WHEN** `tailwind.config.js` is read
- **THEN** `cork` and `cork-shadow` tokens are present under `theme.extend.colors` with the exact hex values specified above

### Requirement: Case history entries display recently explored cases

The sidebar SHALL display up to 20 recently visited case entries, sorted by most-recently-visited first. Each entry SHALL show the case name and an amber-pin marker. Entries SHALL be stored in the browser's `localStorage` under the key `kawal_case_history` and persisted across sessions.

#### Scenario: Case entry appears after visiting a case

- **WHEN** the user navigates to a KasusDetail screen for a case
- **THEN** that case's entry appears at the top of the sidebar history list on subsequent renders

#### Scenario: History is capped at 20 entries

- **WHEN** more than 20 distinct cases have been visited
- **THEN** only the 20 most recently visited cases appear in the sidebar; older entries are evicted

#### Scenario: Duplicate visits move entry to top

- **WHEN** the user revisits a case that is already in the history list
- **THEN** the existing entry moves to the top of the list rather than creating a duplicate

#### Scenario: Clicking a history entry navigates to the case

- **WHEN** the user clicks a case history entry in the sidebar
- **THEN** the application navigates to `/kasus/<id>` for that case

#### Scenario: Empty history shows a placeholder

- **WHEN** no cases have been visited yet (empty history)
- **THEN** the sidebar displays a short placeholder label in chalk-muted text indicating no history yet

### Requirement: Case history sidebar degrades gracefully when localStorage is unavailable

The system SHALL NOT throw an unhandled error or prevent rendering if `localStorage` is unavailable (private browsing, storage quota exceeded, or security policy). In these cases the sidebar SHALL render with an empty history list.

#### Scenario: localStorage read failure

- **WHEN** `localStorage.getItem('kawal_case_history')` throws or returns a malformed value
- **THEN** the sidebar renders with an empty history list and no error is surfaced to the user

#### Scenario: localStorage write failure

- **WHEN** `localStorage.setItem` throws (e.g., quota exceeded)
- **THEN** the error is silently caught; the in-memory history list is updated normally for the current session but not persisted
