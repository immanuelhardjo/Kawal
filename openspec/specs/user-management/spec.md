# Capability: User Management

## Purpose

Defines authentication (Google SSO only), session lifecycle, per-user dossier isolation, account deletion with full cascade, dossier export, and the authentication/write audit log. No roles exist beyond being an authenticated owner of one's own dossier.

## Requirements

### Requirement: Google SSO is the sole credential

The system SHALL authenticate users exclusively via Google OAuth 2.0 / OpenID Connect (Authorization Code flow). The system SHALL NOT accept passwords, email magic links, other OAuth providers, or any non-Google primary credential.

#### Scenario: Sign-in via Google

- **WHEN** an unauthenticated user invokes the sign-in entry point
- **THEN** the system redirects to Google's authorization endpoint with the configured client id, redirect URI, and the scopes `openid email profile`
- **AND** on a successful callback the system validates the returned ID token signature and issuer against Google's published keys before establishing a session

#### Scenario: Non-Google credential rejected

- **WHEN** any code path attempts to create a session via a credential other than a validated Google ID token
- **THEN** the system rejects the attempt and no session is issued

### Requirement: User record keyed by Google subject

The system SHALL maintain a User aggregate with a stable internal id, the Google subject identifier (`sub` claim) stored as the user's canonical external identity, the email from the ID token, the display name, an optional picture URL, a `created_at` timestamp, and a `last_signed_in_at` timestamp. The `sub` claim SHALL be unique and the primary lookup key during sign-in.

#### Scenario: First-time sign-in upserts a new User

- **WHEN** a Google account with a `sub` not previously seen completes sign-in
- **THEN** the system creates a new User row keyed on the `sub` with the email, display name, picture URL, and current timestamps

#### Scenario: Returning user updates `last_signed_in_at`

- **WHEN** a Google account whose `sub` already exists completes sign-in
- **THEN** the system updates `last_signed_in_at` to the current timestamp and refreshes the email, display name, and picture URL from the latest ID token
- **AND** does not insert a new User row

### Requirement: Session cookie issuance and protection

The system SHALL issue a server-side session backed by a session store on successful authentication and SHALL emit the session identifier as an HTTP-only, Secure, SameSite=Lax cookie. The cookie SHALL NOT be readable from JavaScript.

#### Scenario: Cookie attributes

- **WHEN** the system sets the session cookie on a successful sign-in
- **THEN** the response sets the cookie with `HttpOnly`, `Secure`, and `SameSite=Lax` flags, and with a path of `/`

#### Scenario: Session lookup on protected request

- **WHEN** a request arrives with a session cookie whose identifier exists in the session store and has not expired
- **THEN** the request handler receives a populated `req.user` corresponding to the User referenced by the session
- **AND** the session's `last_seen_at` is updated

### Requirement: Session inactivity expiry and sign-out invalidation

The system SHALL expire a session after a configurable inactivity window (default 30 days). The system SHALL invalidate a session immediately when the user explicitly signs out.

#### Scenario: Sign-out invalidates session

- **WHEN** an authenticated user invokes the sign-out endpoint
- **THEN** the corresponding session record is removed from the session store
- **AND** the response sets the session cookie to an expired Max-Age=0

#### Scenario: Expired session rejected

- **WHEN** a request arrives with a session identifier whose `last_seen_at` is older than the configured inactivity window
- **THEN** the request is treated as unauthenticated and the session record is removed

### Requirement: All app routes require a valid session

The system SHALL require a valid authenticated session on every API and SSR route except the unauthenticated entry routes (sign-in initiation, OAuth callback), a public health-check endpoint, and static asset routes. Requests lacking a valid session on a protected route SHALL receive a 401 response.

#### Scenario: Unauthenticated request to a protected route

- **WHEN** a request without a valid session cookie targets an API route other than the sign-in routes, the health endpoint, or static assets
- **THEN** the response is 401 with no application data in the body

#### Scenario: Unauthenticated access to dossier reads

- **WHEN** an unauthenticated request targets any case, entity, claim, event, relationship, or source read endpoint
- **THEN** the response is 401

### Requirement: Every user has equal authority, scoped to their own dossier

The system SHALL grant every authenticated user identical authority over their own dossier — they can create cases, advance lifecycle states, trigger ingest, append revisions, and delete records they own. The system SHALL NOT define an operator, admin, or moderator role. The system SHALL NOT expose any endpoint that allows one user to read, write, or otherwise observe another user's dossier records or session state.

#### Scenario: User performs all dossier actions on their own data

- **GIVEN** an authenticated user with no special configuration
- **WHEN** the user invokes create-case, advance-lifecycle, ingest-source, or any other dossier write
- **THEN** the request is authorized and operates on the user's own dossier without any role check beyond authentication

#### Scenario: No admin endpoint exists

- **WHEN** any HTTP client probes for an admin-style endpoint (e.g., `/admin/*`, `/users`, `/impersonate`, "act as", or any other cross-user surface)
- **THEN** no such endpoint exists and the request returns 404

### Requirement: Per-user isolation across the entire dossier

The system SHALL scope every dossier resource — `Case`, `Entity`, `Relationship`, `Event`, `Claim`, `Source`, `UserCaseSubscription`, revision-history rows, ingest activity log, and any per-session conversation context — by an `owner_user_id`. Reads and writes SHALL only ever return or affect rows where `owner_user_id` equals the authenticated user's id. Cross-user access attempts SHALL be rejected with 403; cross-user references in writes SHALL be rejected at validation.

#### Scenario: User cannot read another user's case

- **GIVEN** user A owns case C
- **WHEN** user B issues a read for case C by its id
- **THEN** the response is 403 (or 404 — either is acceptable, so long as no payload is leaked)

#### Scenario: User cannot list across users

- **WHEN** user A invokes the list-cases endpoint
- **THEN** the response contains only cases whose `owner_user_id` equals user A's id

#### Scenario: Same publisher URL ingested by two users

- **GIVEN** user A has previously ingested the URL `https://example.go.id/doc/1` into their dossier
- **WHEN** user B ingests the same URL into their own dossier
- **THEN** the system creates a fresh `Source` row owned by user B, in user B's dossier; user A's Source is unaffected and remains invisible to user B

### Requirement: Account deletion cascades through the user's dossier

The system SHALL provide an account-deletion action that, when invoked by the authenticated user themselves with the required confirmation, deletes that user's User row, every dossier record owned by that user (cases, entities, claims, events, relationships, sources, subscriptions, and all corresponding revision-history rows), every active session belonging to that user, every audit-log entry tied to that user, and any per-session conversation context. The action SHALL be irreversible.

#### Scenario: User deletes their account

- **WHEN** an authenticated user invokes the account-deletion action with the required confirmation
- **THEN** every row whose `owner_user_id` equals the user's id, every revision row referencing those aggregates, every session whose user is this user, and the User row itself are deleted in a single transaction
- **AND** no row from any other user is affected

#### Scenario: Deleted user signs in again

- **GIVEN** a user has deleted their account
- **WHEN** the same Google account signs in again
- **THEN** the system creates a fresh User row keyed on the same `sub` with new `created_at` and an empty dossier; prior records are not restored

### Requirement: User-initiated dossier export

The system SHALL allow the authenticated user to export their full dossier (cases, entities, relationships, events, claims, sources, subscriptions, and the revision history of each) as a single JSON file. The exported file SHALL contain only records owned by the requesting user.

#### Scenario: Export contains only the user's own data

- **WHEN** an authenticated user invokes the dossier-export action
- **THEN** the returned JSON contains every record whose `owner_user_id` equals the user's id and zero records owned by any other user

### Requirement: Authentication and dossier-write audit log

The system SHALL append an audit entry on each of: successful sign-in, sign-out, failed ID-token validation, account deletion, dossier-export action, and every dossier write (create / update / tombstone of any aggregate). Audit entries SHALL include a timestamp, the user id (where known), the user's IP address, and the user agent. Each audit entry SHALL be owned by the same `user_id` it concerns and SHALL be deleted by account deletion.

#### Scenario: Failed token validation logged

- **WHEN** an OAuth callback fails ID-token validation
- **THEN** an audit entry is written with timestamp, IP, user agent, the failure reason, and no user id (since identification did not succeed)

#### Scenario: Dossier write logged with actor

- **WHEN** an authenticated user creates, updates, or tombstones any dossier record
- **THEN** an audit entry is written referencing the user id, the aggregate type, the aggregate id, the revision number written, and the timestamp
