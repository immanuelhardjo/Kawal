## ADDED Requirements

### Requirement: Sumber dulu, opini belakangan

Every UI surface that renders a Claim, Event, or Relationship SHALL display the certainty label and at least one source link before any interpretive or summary text in reading order.

#### Scenario: Fact row composition

- **WHEN** any screen renders a fact-bearing record
- **THEN** the certainty chip and source link appear before the summary text in the DOM order and visually precede it when read top-to-bottom or left-to-right depending on layout

#### Scenario: Code path enforcement

- **WHEN** a developer attempts to render a Claim, Event, or Relationship summary without going through the `<Fact.*>` primitives in `packages/ui`
- **THEN** the lint configuration flags the usage in CI

### Requirement: Cool institutional tone

The system SHALL render copy throughout the UI in a calm, document-like register. The system SHALL NOT use outrage typography (oversized headlines, all-caps shouting, exclamation styling), breaking-news banners, countdown timers, push-style toasts, or engagement-counter UI patterns.

#### Scenario: No urgency primitive

- **WHEN** any component in `packages/ui` is inspected
- **THEN** none of the primitives accept an `urgency`, `breaking`, `pulse`, or equivalent prop, and no animation primitive is exposed for fact-bearing rows

### Requirement: One screen, one job (with Kasus Detail composing linked sections)

Each top-level screen SHALL have a single primary verb. The screens and their primary verbs are: **Beranda** (briefs the user); **Kasus Detail** (surfaces the entire understanding of a case via four linked sections — Peta Kasus, Garis Waktu, Dosier, Profil — that share one selection and one as-of-date); **Sign-in** (authenticates); **Account** (manages identity). No screen SHALL combine two primary verbs. The Kasus Detail screen SHALL NOT add a fifth sub-section without a new openspec change.

#### Scenario: Beranda does not host the Kasus Detail sections

- **WHEN** the Beranda screen is rendered
- **THEN** it shows the briefing card for today, the "what changed" diff list, a quick claim-checker entry, and a library shortcut; it does NOT render the Peta Kasus canvas or the Garis Waktu timeline inline

#### Scenario: Kasus Detail composes its four sections

- **WHEN** the Kasus Detail screen is rendered
- **THEN** the screen contains the Peta Kasus section, the Garis Waktu section, the Dosier section, and the Profil panel
- **AND** the four sections share a single state (the selected entity / event / record and the `asOfDate` driven by Garis Waktu)
- **AND** a selection or scrub in any section is reflected in the others as described in event-timeline and relationship-graph

#### Scenario: No fifth section added casually

- **WHEN** any PR introduces a new sub-section to Kasus Detail
- **THEN** the change is rejected unless accompanied by an openspec change updating presentation-principles

### Requirement: Display strings in Bahasa Indonesia only

The system SHALL render every user-facing display string (button labels, headings, error messages, certainty-chip labels, AI-port user-facing output, glossary explainers, briefing summaries, system-generated copy) in Bahasa Indonesia. The system SHALL NOT include an English UI variant, an English toggle, or English fallback strings in user-facing surfaces. Code identifiers, types, function names, file names, comments, log messages, and telemetry tags SHALL remain in English.

#### Scenario: No language toggle UI

- **WHEN** any screen is rendered
- **THEN** no language-toggle control is present anywhere in the UI

#### Scenario: All visible strings are Bahasa Indonesia

- **WHEN** the UI is inspected on any screen
- **THEN** every visible string read by the user is in Bahasa Indonesia
- **AND** developer-facing surfaces (error logs, exception traces, telemetry tags, console output) are in English

#### Scenario: AI output is Bahasa Indonesia

- **WHEN** any AI port returns text destined for the user
- **THEN** that text is in Bahasa Indonesia, even though the prompt template in code is English

#### Scenario: Code is in English

- **WHEN** the codebase is scanned for identifier languages
- **THEN** variable names, function names, type names, and comments are in English; Bahasa Indonesia appears only inside string-literal contexts marked as user-facing copy (e.g., i18n bundle entries, fixture data)

### Requirement: Mobile-web optimization

The system SHALL be usable on mobile-web screens, with the Peta Kasus React Flow canvas supporting pinch-zoom and pan, and the Garis Waktu supporting touch-driven scrubbing without horizontal overflow.

#### Scenario: Mobile graph gestures

- **WHEN** Peta Kasus is opened on a touch device
- **THEN** pinch-zoom and pan gestures function as described in the relationship-graph capability and do not conflict with default page-scroll gestures outside the canvas

#### Scenario: Phone-width Kasus Detail layout

- **WHEN** the Kasus Detail screen is rendered at phone width
- **THEN** Garis Waktu is sticky at the top of the viewport, Peta Kasus follows, Dosier is collapsed by default, and Profil opens as a bottom sheet on selection

### Requirement: Right-of-reply asymmetry never silently rendered

The system SHALL render allegations and right-of-reply slots in visually symmetric containers. When no right-of-reply is on record in the user's dossier, the slot SHALL render a dated placeholder rather than being collapsed or hidden.

#### Scenario: Empty right-of-reply still visible

- **WHEN** a Person profile renders an allegation block alongside an empty right-of-reply
- **THEN** both blocks render with the same visual weight; the empty reply shows "Belum ada tanggapan publik tercatat per [tanggal saat ini]"

### Requirement: No editorializing copy in product strings

The system's product strings, system prompts, and AI port wrappers SHALL avoid editorial phrases including but not limited to "mengejutkan", "sudah diduga", "menghebohkan", "fantastis", and the English equivalents that might leak into code identifiers ("shocking", "as expected", "explosive", "stunning"). A lint or test rule SHALL scan product string files for these phrases.

#### Scenario: Forbidden phrase in copy

- **WHEN** a developer adds a string containing a deny-list phrase to the i18n bundle or another user-facing copy file
- **THEN** the CI lint flags the string and the build fails until it is replaced
