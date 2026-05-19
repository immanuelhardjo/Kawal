## ADDED Requirements

### Requirement: Seed script targets an existing dev user
The seed script SHALL accept a `--email <address>` CLI argument, look up the user by email in the database, and error with a clear message if no matching user is found. It SHALL NOT create a new user.

#### Scenario: User found
- **WHEN** `--email dev@example.com` is passed and a user with that email exists
- **THEN** all fixture data is created under that user's `ownerUserId`

#### Scenario: User not found
- **WHEN** `--email unknown@example.com` is passed and no user with that email exists
- **THEN** the script exits with a non-zero code and prints `User not found: unknown@example.com`

### Requirement: Seed script is idempotent
The seed script SHALL use fixed deterministic IDs with the `seed_` prefix for all aggregates. Re-running the script SHALL upsert (update-or-insert) existing rows rather than creating duplicates.

#### Scenario: First run
- **WHEN** the script runs against an empty database
- **THEN** all fixture rows are inserted successfully

#### Scenario: Subsequent run
- **WHEN** the script runs a second time against the same database
- **THEN** the script completes without error and row counts remain the same

### Requirement: Fixture covers all UI-visible aggregate types
The seed script SHALL create the following fixture data for the case "Kasus Korupsi Pengadaan Alat PCR — RSUD Kabupaten Tambora":

- **1 Case** with `jurisdiction = "Pengadilan Tindak Pidana Korupsi Jakarta"`, `caseType = "tipikor"`, status advanced to `appeal` via three lifecycle transitions (open → trial → verdict → appeal)
- **5 Sources** across tiers: 2 × `tier_1`, 3 × `tier_2`
- **5 Entities**: 2 × `person` (one `publicFigure = true`), 1 × `company`, 2 × `institution`
- **7 Events** covering all 6 event types: `public_statement`, `other`, `indictment`, `hearing` ×2, `asset_seizure`, `verdict`
- **5 Claims** with certainty labels spanning `established`, `alleged`, `reported`; at least one claim SHALL reference `contradictedByClaimIds`
- **6 Relationships** using types: `employed_by` ×2, `allegedly_paid`, `owned_by`, `prosecuted_by` ×2

#### Scenario: Full fixture seeded
- **WHEN** the seed script runs successfully
- **THEN** the case `seed_case_tambora` exists with status `appeal`
- **THEN** 5 source rows with IDs prefixed `seed_src_` exist
- **THEN** 5 entity rows with IDs prefixed `seed_ent_` exist
- **THEN** 7 event rows with IDs prefixed `seed_evt_` exist
- **THEN** 5 claim rows with IDs prefixed `seed_clm_` exist
- **THEN** 6 relationship rows with IDs prefixed `seed_rel_` exist

### Requirement: Case lifecycle produces multiple revision rows
The seed script SHALL advance the case lifecycle by calling `.advance()` and persisting after each step so that the revision history contains at least 4 entries (created + 3 advances).

#### Scenario: Revision history populated
- **WHEN** the seed script runs
- **THEN** the `cases_revisions` table contains 4 rows for `seed_case_tambora` with `changeKind` values `created`, `updated`, `updated`, `updated`

### Requirement: Script wired as a workspace script
The seed script SHALL be runnable via `pnpm seed:dev` from the workspace root without requiring manual `tsx` invocation.

#### Scenario: pnpm script runs the seed
- **WHEN** `pnpm seed:dev` is executed from the workspace root
- **THEN** the seed script executes and exits with code 0 on success
