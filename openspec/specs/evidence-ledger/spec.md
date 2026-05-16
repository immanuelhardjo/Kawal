# Capability: Evidence Ledger

## Purpose

Defines the atomic Claim and Source records that underpin all factual assertions in the dossier. Claims are scoped to one user and one case, must carry a certainty label and at least one source, and can reference contradicting claims. Sources carry a tier, an excerpt, an archive URL, and a content hash. The publisher whitelist is config-only. All records maintain append-only revision history.

## Requirements

### Requirement: Claim is atomic, sourced, and owned

The system SHALL model a Claim as an atomic factual assertion owned by exactly one user (`owner_user_id`), bound to a case in the same user's dossier, carrying text, a certainty label, at least one source id (where the referenced Source is also owned by the same user), and an optional list of contradicting claim ids (also owned by the same user).

#### Scenario: Rejecting a claim with no source

- **WHEN** any code path attempts to persist a claim with an empty source-id list
- **THEN** the system refuses the write and returns a validation error

#### Scenario: Rejecting a claim with no certainty label

- **WHEN** any code path attempts to persist a claim without a certainty label
- **THEN** the system refuses the write

#### Scenario: Cross-user source reference rejected

- **WHEN** a write attempts to persist a claim whose source id refers to a Source owned by a different user
- **THEN** the system rejects the write at validation

### Requirement: Certainty label vocabulary

The system SHALL recognize exactly five certainty labels: `established`, `alleged`, `reported`, `disputed`, `unverified`. Any record (claim, event, relationship) carrying a fact assertion SHALL carry exactly one of these.

#### Scenario: Unknown certainty value

- **WHEN** any write attempts to use a certainty value outside the five labels
- **THEN** the system rejects the write at the domain layer

### Requirement: Source carries tier and archive fallback

The system SHALL model a Source owned by exactly one user (`owner_user_id`), with a URL, publisher, tier (`tier_1`, `tier_2`, or `tier_3`), a fetched-at timestamp, an excerpt, and an archive URL (Wayback fallback). Tier-3 sources SHALL NEVER be referenced by a claim, event, or relationship as anchoring evidence.

#### Scenario: Tier-3 source rejected as claim anchor

- **WHEN** a claim is written referencing only a tier-3 source
- **THEN** the system rejects the write with an error indicating tier-3 sources cannot anchor a fact

#### Scenario: Archive URL populated on ingest

- **WHEN** a tier-1 source is ingested into a user's dossier
- **THEN** the system stores the original URL, the publisher, and a fetched Wayback archive URL captured at ingest time, all owned by the requesting user

### Requirement: Excerpt anchoring

Every Source SHALL carry a verbatim excerpt — the specific passage that supports the linked claims. The excerpt SHALL be capped at the configured maximum length (default 500 characters) and SHALL be displayed verbatim when a claim or edge is tapped.

#### Scenario: Tap reveals verbatim excerpt

- **WHEN** a user taps a fact row backed by a source
- **THEN** the side panel displays the source's excerpt unmodified, the publisher, the URL, and the archive URL

### Requirement: Contradiction tracking

The system SHALL allow a claim to reference one or more contradicting claim ids within the same owner's dossier. The dossier SHALL display the contradiction inline whenever either claim is rendered.

#### Scenario: Claim A contradicts Claim B

- **GIVEN** Claim A and Claim B in the same user's dossier are linked as contradicting each other
- **WHEN** Claim A is rendered in the timeline or in a profile
- **THEN** the rendering includes a marker linking to Claim B, with both certainty labels visible

### Requirement: Source tier whitelist is loaded from configuration only

The system SHALL determine the set of tier-1 and tier-2 publishers from a configuration module loaded at process boot — not from any per-user data, not from any HTTP-writable endpoint. The system SHALL NOT expose any endpoint, regardless of authentication, that allows adding, removing, or re-tiering a publisher.

#### Scenario: User attempts to add a publisher via the API

- **WHEN** an authenticated user's request attempts to assign a new publisher to tier-1 or tier-2
- **THEN** no such endpoint exists; the request returns 404

#### Scenario: Whitelist reload requires a process restart

- **WHEN** the whitelist configuration file is updated
- **THEN** the change takes effect on the next process boot; no in-flight HTTP request can alter the in-memory whitelist

### Requirement: Tier-1 and Tier-2 default trust

The system SHALL treat tier-1 sources as citation-eligible by default with the highest default trust, tier-2 sources as citation-eligible verified journalism, and tier-3 sources as signal-only (never citation-eligible).

#### Scenario: Default certainty heuristic

- **WHEN** the extraction step creates a claim solely from a tier-1 source's verbatim assertion during a user's ingest request
- **THEN** the claim's certainty label defaults to `established` if the source language is declarative, or to `alleged` if the source language is an allegation; the pipeline never auto-promotes a tier-2-only claim above `reported`

### Requirement: Append-only revision history for Claims and Sources

The system SHALL retain every create, update, and tombstone of a Claim or a Source as a revision in a corresponding `claims_revisions` or `sources_revisions` table, with the standard revision-row shape (`revision_no`, `valid_from`, `valid_to`, actor `user_id`, `change_kind`, full payload).

#### Scenario: Source re-ingest creates a revision

- **GIVEN** a Source previously ingested by the user at body-hash H1
- **WHEN** the same Source URL is re-ingested and yields body-hash H2
- **THEN** a new `Source` revision is written with `change_kind = updated` and the new body hash, excerpt, and fetched_at; prior revision retains its payload
