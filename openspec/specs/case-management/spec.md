# Capability: Case Management

## Purpose

Models the Case as the top-level unit of investigation in a user's dossier. Each case is owned by exactly one user and progresses through a defined lifecycle. Provides case creation, lifecycle management, aliasing, subscription, change-diffing, and append-only revision history — all strictly scoped to the owning user.

## Requirements

### Requirement: Case as the unit of attention, owned by exactly one user

The system SHALL model a Case as a top-level entity owned by exactly one user (`owner_user_id`) and carrying an identifier, canonical name, list of aliases, lifecycle status, start date, optional close date, jurisdiction, case type, and a Bahasa Indonesia Markdown summary. All Case reads and writes SHALL be scoped to the authenticated user's `owner_user_id`.

#### Scenario: Creating a case sets owner

- **WHEN** an authenticated user creates a case with name, jurisdiction, and case type
- **THEN** the system stores the case with `owner_user_id` set to the authenticated user's id, status `open`, an empty alias list, an empty close date, an empty summary, and a generated identifier
- **AND** the case is retrievable by identifier and by canonical name only by its owner

#### Scenario: Rejecting an underspecified case

- **WHEN** an authenticated user attempts to create a case without a name or without a jurisdiction
- **THEN** the system refuses the write and returns a validation error naming the missing fields

#### Scenario: Two users may hold cases with the same canonical name

- **GIVEN** user A owns a case named "Kasus Korupsi PT X"
- **WHEN** user B creates a case in their own dossier with the same canonical name "Kasus Korupsi PT X"
- **THEN** the system accepts the write; the two cases are independent and invisible to each other's owners

### Requirement: Case lifecycle states

The system SHALL recognize the following case lifecycle states: `open`, `trial`, `verdict`, `appeal`, `inkracht`, `closed`. The system SHALL allow transitions only along the documented order. Out-of-order transitions SHALL require an explicit override action including a reason; the override SHALL NOT require a role beyond ownership of the case.

#### Scenario: Advancing the lifecycle

- **WHEN** the case's owner advances a case in `trial` to `verdict`
- **THEN** the system records the new state, the timestamp, and the owner as actor

#### Scenario: Rejecting an out-of-order transition

- **WHEN** the owner advances a case in `open` directly to `inkracht` without an override reason
- **THEN** the system rejects the transition

#### Scenario: Allowed override with reason

- **WHEN** the owner reopens their case in `closed` with an override action that includes a reason
- **THEN** the system records the transition, the actor, and the supplied reason

### Requirement: Case subscription per user

The system SHALL allow a user to subscribe to a case they own, with an `adopted_at` timestamp, a cadence preference, a `last_viewed_at` timestamp, and an optional private `alasan_saya` (user's own reason for following). Subscription rows SHALL carry `owner_user_id` equal to the subscribing user.

#### Scenario: Adopting an owned case

- **WHEN** an authenticated user subscribes to a case they own
- **THEN** the system stores the subscription with the current timestamp, the user's chosen cadence, an empty `last_viewed_at`, and a nullable `alasan_saya`

#### Scenario: Subscribing to a non-owned case

- **WHEN** a user attempts to subscribe to a case owned by a different user
- **THEN** the system rejects the request with 403 (or 404, indistinguishable from a missing case)

### Requirement: "What changed" diff per case

The system SHALL maintain, per case, a diff of records (claims, events, relationships, dossier additions) that have been created or materially updated since the owner's `last_viewed_at`. The diff SHALL be addressable as a single read scoped to the owning user.

#### Scenario: User opens a case after new events

- **GIVEN** three new events have been ingested into the user's case since they last viewed it
- **WHEN** the user opens the case's Beranda briefing
- **THEN** the system returns a diff containing those three events, with their certainty labels and source links

#### Scenario: User opens a case with no changes

- **GIVEN** no new records have been written for the user's case since the user last viewed it
- **WHEN** the user opens the case
- **THEN** the diff is returned as an empty list (not an error)

### Requirement: Case aliases

The system SHALL allow a case to carry multiple aliases (e.g., docket numbers, public nicknames) and SHALL allow case lookup by any alias to return the same canonical case, scoped to the owning user's dossier.

#### Scenario: Looking up by alias

- **GIVEN** a case in the user's dossier with canonical name "Kasus Korupsi PT X" and alias "PERK-2024-01"
- **WHEN** the owner queries any read endpoint by "PERK-2024-01"
- **THEN** the canonical case is returned

### Requirement: Append-only revision history for Cases

The system SHALL retain every create, update, and tombstone of a Case as a revision in a `cases_revisions` table. Each revision SHALL include a monotonically increasing `revision_no`, a `valid_from` and `valid_to` timestamp, the actor `user_id`, the `change_kind` (`created` | `updated` | `tombstoned`), and the full Case payload at that revision.

#### Scenario: Edit creates a new revision

- **GIVEN** a case at `revision_no = 3`
- **WHEN** the owner updates the case's summary
- **THEN** the system writes a new row to `cases_revisions` with `revision_no = 4`, `change_kind = updated`, `valid_from = now`, and the actor set to the owner
- **AND** sets `valid_to = now` on the prior revision row

#### Scenario: Owner browses the case's history

- **WHEN** the owner requests the revision history for one of their cases
- **THEN** the response lists every revision in `revision_no` order, each with its payload, change_kind, valid_from, valid_to, and actor

#### Scenario: Soft-delete keeps history

- **WHEN** the owner deletes a case (not via account deletion)
- **THEN** a `tombstoned` revision is appended to `cases_revisions` and the row in the current `cases` table is removed
- **AND** the revision history remains readable until account deletion

### Requirement: Case lifecycle and subscription actions are unrestricted beyond ownership

The system SHALL NOT introduce any role-based gating on case creation, lifecycle advancement, lifecycle override, or subscription beyond verifying that the authenticated user owns the case (or, for creation, is authenticated).

#### Scenario: Authenticated user can create any number of cases

- **WHEN** an authenticated user requests to create a case
- **THEN** the system accepts the request; no operator, admin, or quota check beyond authentication is applied

#### Scenario: No operator endpoint for cases

- **WHEN** any client probes for an endpoint that would advance another user's case, transfer ownership, or list cases across users
- **THEN** no such endpoint exists
