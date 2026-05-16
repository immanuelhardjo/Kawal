## ADDED Requirements

### Requirement: Entity types and canonical identity, scoped to one owner

The system SHALL model an Entity owned by exactly one user (`owner_user_id`), with a type of exactly one of `person`, `institution`, `company`, or `document`, a canonical name, an alias list, a Bahasa Indonesia description, a `public_figure` boolean, and a (possibly empty) list of rights-of-reply statements. All Entity reads and writes SHALL be scoped to the authenticated user's `owner_user_id`.

#### Scenario: Creating each entity type

- **WHEN** an entity is created with type `person`, `institution`, `company`, or `document` by an authenticated user
- **THEN** the system stores it with `owner_user_id` set to the authenticated user's id, with the type-specific schema enforced, and rejects creation with any other type value

#### Scenario: Same person, two dossiers

- **GIVEN** user A has an entity "KPK" in their dossier
- **WHEN** user B creates an entity "KPK" in their own dossier
- **THEN** the system stores B's entity as a separate row owned by B; the two are independent and invisible to each other's owners

#### Scenario: Looking up by alias within the user's dossier

- **GIVEN** an entity in the user's dossier with canonical name "Komisi Pemberantasan Korupsi" and alias "KPK"
- **WHEN** the owner issues a read query for "KPK"
- **THEN** their canonical entity is returned; the same query by another user does not return this entity

### Requirement: Person profile contents

The system SHALL render a Person profile that includes: header (name, primary role in the current case, optional photo URL sourced from a public source), current and prior public positions, statements made in this case (categorized as `under_oath` / `press_conference` / `social_media`), an optional LHKPN wealth summary that links out (never re-hosted), established facts list (⚖️-labeled), allegations list (📰-labeled), prior cases involving this person within the same user's dossier, and a non-removable right-of-reply slot.

#### Scenario: Public official with LHKPN

- **GIVEN** a person entity marked as a public official with an LHKPN URL
- **WHEN** the profile is rendered
- **THEN** the wealth summary section displays the linked LHKPN URL and shows no re-hosted PDF

#### Scenario: Right-of-reply slot when no reply exists

- **GIVEN** a person profile with no ingested press statement
- **WHEN** the profile is rendered
- **THEN** the right-of-reply slot is still present, with text equivalent to "Belum ada tanggapan publik tercatat per [tanggal saat ini]" and is not collapsible to zero height

### Requirement: Institution profile contents

The system SHALL render an Institution profile that includes: mandate and current leadership, recent procurement history when LKPP data is in the user's dossier, prior audit findings from BPK present in the user's dossier, and a list of cases in the user's dossier historically involving the institution.

#### Scenario: Institution with no LKPP data ingested

- **WHEN** an institution profile is rendered for which no LKPP procurement records have been ingested into the user's dossier
- **THEN** the procurement-history section displays a "Belum ada catatan LKPP yang diunggah" placeholder and the profile renders without error

### Requirement: Company profile contents

The system SHALL render a Company profile that includes: disclosed ownership and beneficial owners, government contracts on public record, and related-party transactions flagged by the AI reconciliation step within the user's dossier.

#### Scenario: Company with flagged related-party transactions

- **GIVEN** a company entity for which reconciliation has flagged two related-party transactions in this user's dossier
- **WHEN** the profile is rendered
- **THEN** both flagged transactions appear in the related-party section, each with a certainty label and a source link to a Source row in the same dossier

### Requirement: Document profile contents

The system SHALL render a Document profile that includes: a link to the original PDF (never re-hosted by Kawal), a plain-Bahasa-Indonesia section-by-section summary, and key claims extracted from the document with internal page-anchored citations.

#### Scenario: Page-anchored citation

- **WHEN** a key claim extracted from a document is displayed
- **THEN** the claim renders with a source link that resolves to the original document URL plus a page anchor (e.g., `#page=12`)

#### Scenario: PDF not re-hosted

- **WHEN** any document profile is rendered
- **THEN** no response from Kawal contains the document's binary contents; only links to the original (or to a Wayback fallback) are present

### Requirement: Entity linkage to cases within the same dossier

The system SHALL allow an entity to be linked to one or more cases owned by the same user. The entity's profile SHALL scope statements, established facts, allegations, and the right-of-reply slot to the case being viewed when the profile is opened from a case context.

#### Scenario: Same person across two cases

- **GIVEN** a person entity owned by user A linked to Case A and Case B (both owned by user A) with different sets of allegations
- **WHEN** user A opens the profile from Case A
- **THEN** only the allegations and statements linked to Case A are shown
- **WHEN** user A opens the same profile from Case B
- **THEN** only the allegations and statements linked to Case B are shown

#### Scenario: Cross-user link attempt rejected

- **WHEN** any write attempts to link an entity owned by user A to a case owned by user B
- **THEN** the system rejects the write at validation

### Requirement: Right-of-reply auto-population

The system SHALL auto-populate the right-of-reply slot from press statements ingested into the same user's dossier and attributed to the entity. When no such statement is available, the slot SHALL display a dated "belum ada tanggapan publik tercatat" message and SHALL NOT be hidden.

#### Scenario: New press statement ingested

- **GIVEN** a person profile whose right-of-reply slot showed "Belum ada tanggapan publik tercatat per [tanggal]"
- **WHEN** the owner ingests a Tier-2 press statement attributed to that person on the relevant allegation
- **THEN** the slot updates to display the statement, its source link, and its publication date on the next profile read

### Requirement: Append-only revision history for Entities

The system SHALL retain every create, update, and tombstone of an Entity as a revision in an `entities_revisions` table, with the same revision-row shape and semantics as Cases (`revision_no`, `valid_from`, `valid_to`, actor `user_id`, `change_kind`, and full payload).

#### Scenario: Edit creates a new revision

- **WHEN** the owner updates an entity's canonical name or alias list
- **THEN** a new revision row is appended to `entities_revisions` with `change_kind = updated`, the actor is the owner, and the prior revision's `valid_to` is set to `now`

#### Scenario: Owner browses entity history

- **WHEN** the owner requests the revision history for one of their entities
- **THEN** the response lists every revision in `revision_no` order with its payload, change_kind, valid_from, valid_to, and actor
