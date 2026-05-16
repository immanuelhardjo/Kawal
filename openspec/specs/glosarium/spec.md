# Capability: Glosarium

## Purpose

Provides tap-any-term legal glossary explanations in Bahasa Indonesia, grounded in the UU/KUHP corpus and optionally enriched with examples from the user's own case dossier. Explainers are ephemeral and never persisted as claims. Users may trigger a request-time Tier-3 trend scan to populate a personal candidate-term backlog.

## Requirements

### Requirement: Tap-any-term explainer

The system SHALL allow the authenticated user to tap any legal term rendered anywhere in the app — timeline entries, dossier profiles, document summaries — and receive a Bahasa-Indonesia 30-second explainer for that term in an overlay or side panel.

#### Scenario: Term tapped from timeline

- **WHEN** the user taps the term "inkracht" appearing in a timeline event node within their Kasus Detail screen
- **THEN** an overlay opens showing the Bahasa-Indonesia explainer, the UU/KUHP reference, and (when in a case context) an example drawn from that user's case dossier

### Requirement: Grounding in UU/KUHP corpus

The system SHALL ground every glossary answer in a maintained corpus of Indonesian statutes (Undang-Undang and KUHP). Every explainer SHALL cite the specific UU article or KUHP pasal it draws on.

#### Scenario: Explainer cites article

- **WHEN** the Glossary port returns an explainer
- **THEN** the response includes at least one citation in the form "UU No. X Tahun YYYY, Pasal N" or "KUHP Pasal N"

### Requirement: Case-contextual examples

When the user invokes the glossary from within a case context, the explainer SHALL include at least one example drawn from that user's case dossier when a relevant record exists. The example SHALL only cite records owned by the requesting user.

#### Scenario: Relevant case example present

- **GIVEN** a case dossier owned by the user in which the term "korupsi pengadaan" appears in two events
- **WHEN** the user requests the glossary explainer for "korupsi pengadaan" in that case context
- **THEN** the response includes a brief Bahasa-Indonesia example referencing one of those events, with a source link to a Source row owned by the same user

#### Scenario: No relevant case example

- **GIVEN** a user's case dossier with no records touching the requested term
- **WHEN** the user requests the explainer
- **THEN** the response returns the general explainer without an example and does not fabricate one

### Requirement: Explainer is not a Claim

The system SHALL NOT persist glossary explainers into the `claims`, `events`, or `relationships` tables (or their revision tables). Glossary outputs are rendered on demand and are not citation sources for facts.

#### Scenario: Explainer not persisted

- **WHEN** the Glossary port returns an explainer
- **THEN** no row is inserted into the dossier fact stores as a result

### Requirement: Tier-3 backlog scan is request-time and user-scoped

The system SHALL allow the authenticated user to trigger a Tier-3 trend scan from the Glosarium UI. The scan SHALL populate that user's personal backlog of candidate terms requiring a glossary entry. Tier-3 signals SHALL NOT be cited in the resulting explainers — only the UU/KUHP corpus and the user's own case dossier may be cited.

#### Scenario: Trending-term scan triggered by the user

- **WHEN** an authenticated user invokes the trending-term scan
- **THEN** the system performs a Tier-3 collection at request time, owner-stamped to the requesting user, and adds candidate terms to that user's glossary backlog
- **AND** no automated/scheduled scan exists

#### Scenario: Tier-3 source not cited in explainer

- **WHEN** a glossary explainer is generated for any term, whether originating from the backlog or from a tap
- **THEN** the cited sources are exclusively UU/KUHP corpus references and (optionally) records from the requesting user's case dossier; no Tier-3 source appears in the citation
