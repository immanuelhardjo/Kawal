## ADDED Requirements

### Requirement: Tier-1 source coverage

The system SHALL include source adapters for at minimum the following Tier-1 publishers: Kejaksaan Agung (story.kejaksaan.go.id), Mahkamah Agung putusan database (putusan3.mahkamahagung.go.id), KPK (kpk.go.id), BPK audit reports (bpk.go.id), LKPP / LPSE procurement, LHKPN wealth disclosures (elhkpn.kpk.go.id), DPR records, BNPB for disaster-related cases, and official YouTube livestreams from Kejagung, Kompas TV, and MK.

#### Scenario: Adapter present and isolated

- **WHEN** an authenticated user submits a source URL whose publisher matches a Tier-1 adapter
- **THEN** the system routes the fetch through that adapter
- **AND** a failure in one adapter does not affect a separate user's later request through a different adapter

### Requirement: Tier-2 source coverage

The system SHALL include source adapters for the following Tier-2 publishers, all citation-eligible: Tempo, Kompas, Detik, Antara, CNN Indonesia, Reuters, AP, BBC, Mongabay (environment-focused cases), Jakarta Globe, and Jakarta Post.

#### Scenario: Tier-2 source contributes a claim

- **WHEN** the extraction step emits a claim from a Tier-2 source during a user's ingest request
- **THEN** the claim is persisted into the requesting user's dossier with the linked source and a certainty label not higher than `reported` by default

### Requirement: Tier-3 signals never anchor a fact

The system SHALL ingest Tier-3 social-media trend signals only when the user explicitly requests a glossary-backlog scan, and SHALL use them only to surface candidate terms requiring a glossary entry. The system SHALL refuse to attach a Tier-3 source as the only or primary anchoring source on any Claim, Event, or Relationship.

#### Scenario: Tier-3 attempted as claim anchor

- **WHEN** the extraction step within a user's ingest request attempts to write a claim whose only source is Tier-3
- **THEN** the write is rejected by the application layer

### Requirement: Ingestion is request-time and per-user

The system SHALL perform every source fetch within the lifetime of an authenticated user's HTTP request, writing results into the requesting user's dossier. The system SHALL NOT run any scheduled job, cron, or background worker that fetches sources or writes dossier records.

#### Scenario: User submits a URL

- **WHEN** an authenticated user POSTs an ingest request containing a source URL and a target case id in their dossier
- **THEN** the API resolves the publisher against the whitelist, fetches the source, runs extraction and reconciliation, and writes the resulting records into the user's dossier — all before responding
- **AND** every written row carries `owner_user_id` equal to the requesting user

#### Scenario: No scheduled ingest exists

- **WHEN** the running process is inspected for cron-style schedulers, BullMQ workers, or background pollers writing dossier rows
- **THEN** none exist

### Requirement: Progress streaming during request-time ingest

The system SHALL stream progress phases (e.g., `resolving_publisher`, `fetching`, `extracting`, `reconciling`, `writing`, `done`) to the client over the same HTTP request via Server-Sent Events. On failure, the system SHALL emit a terminal failure phase with a brief, sourceable reason and SHALL NOT silently retry.

#### Scenario: Progress phases observed

- **WHEN** a user submits an ingest request for a Tier-1 source
- **THEN** the client receives SSE events for each phase as the server progresses
- **AND** the final event is `done` with a summary of records created, or a `failed` event with a reason

#### Scenario: No silent retry

- **WHEN** a fetch fails (network error, 5xx, parser exception)
- **THEN** the response terminates with `failed`; the system does NOT automatically retry the same URL on the user's behalf
- **AND** the user can choose to resubmit

### Requirement: Hard request ceiling for ingest

The system SHALL enforce a configurable maximum duration (default 120 seconds) on a single ingest request. If the limit is reached, the system SHALL terminate the request with a clear `timeout` event, SHALL roll back any partially-written records in that request, and SHALL leave the user's dossier in a consistent state.

#### Scenario: Ingest exceeds the ceiling

- **WHEN** an ingest request runs longer than the configured ceiling
- **THEN** the request terminates with a `timeout` phase
- **AND** no partially-written records remain in the user's dossier
- **AND** the activity log records the timeout with the URL and the phase reached

### Requirement: Per-publisher rate limit and back-off in-process

The system SHALL enforce a per-process, per-publisher rate limit and exponential back-off on transient errors. The rate limit SHALL apply across all users sharing the process so that polite-traffic obligations to publishers are honored regardless of how many users are ingesting concurrently.

#### Scenario: Two users request the same publisher concurrently

- **GIVEN** the per-publisher rate limit is 1 request per second
- **WHEN** users A and B both submit ingest requests for distinct URLs at the same publisher within the same second
- **THEN** the first request proceeds; the second waits until the limiter permits a fetch, with a `queued` progress phase emitted to the second user
- **AND** neither request causes the publisher to receive more than 1 request per second

### Requirement: Archive-URL fallback

For every successfully fetched source the system SHALL capture a Wayback Machine (or equivalent web archive) URL representing the page state at fetch time, and store it on the Source record. If the live URL later becomes unreachable, the UI SHALL display the archive URL alongside the live link.

#### Scenario: Archive captured on ingest

- **WHEN** a source is fetched and successfully extracted during a user's request
- **THEN** the Source record carries both the live URL and an archive URL (or a recorded archive-fetch failure)

### Requirement: Excerpt cap and content hash

The system SHALL store at most the configured maximum number of characters of any source as an excerpt (default 500). The system SHALL store a hash of the full fetched body for change detection but SHALL NOT serve the full body to clients.

#### Scenario: Refetch detects change

- **GIVEN** a previously fetched source in the user's dossier whose body hash was recorded
- **WHEN** the user re-ingests the same URL and the new body hash differs
- **THEN** the system creates a new Source revision (per evidence-ledger's revision history) and re-runs extraction against the new revision

### Requirement: Dossier write-back is sourced and owner-stamped

When the extraction or reconciliation steps emit a write that would create or update a Claim, Event, Relationship, or dossier profile field, the write SHALL include at least one Source id and a certainty label, AND every written row SHALL carry `owner_user_id` equal to the user whose request triggered the ingest. Writes lacking either invariant SHALL be rejected by the application layer.

#### Scenario: Pipeline emits an unsourced claim

- **WHEN** the extraction step during a user's ingest produces a claim with no source id
- **THEN** the application layer rejects the write and emits an `extraction_invalid` progress event with the failure reason

#### Scenario: Owner stamp on every write

- **WHEN** any extraction-driven write occurs during a user's request
- **THEN** the persisted row carries `owner_user_id` equal to the requesting user; the request never writes into another user's tables

### Requirement: Per-adapter isolation

Each source adapter SHALL be implemented as an isolated module under `packages/infrastructure/sources/<publisher>/`. An adapter's exceptions or HTTP failures SHALL be caught at the adapter boundary and SHALL NOT corrupt the user's dossier or affect other adapters loaded in the same process.

#### Scenario: Adapter throws

- **GIVEN** a user submits an ingest URL whose adapter throws unexpectedly
- **WHEN** the request is processed
- **THEN** the adapter's exception is caught at the adapter boundary, the request terminates with a `failed` phase carrying a redacted error reason, and no partial writes remain in the user's dossier
- **AND** any subsequent ingest request, including one routed to a different adapter, is unaffected

### Requirement: Per-user ingest activity log

The system SHALL maintain a per-user ingest activity log capturing each ingest request: the URL submitted, the publisher resolved, the case id targeted, the phases reached, the terminal status, the timestamp, and the number of records created. The log SHALL be visible only to its owner and SHALL be deleted when the user deletes their account.

#### Scenario: Owner reads their activity

- **WHEN** the authenticated user reads their ingest activity log
- **THEN** every returned entry has `owner_user_id` equal to the requesting user

#### Scenario: Activity log purged on account deletion

- **WHEN** the user deletes their account (per user-management)
- **THEN** every activity-log entry for that user is removed in the same transaction
