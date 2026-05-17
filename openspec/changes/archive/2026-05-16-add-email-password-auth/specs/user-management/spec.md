## MODIFIED Requirements

### Requirement: Google SSO is the sole credential

The system SHALL support Google OAuth 2.0 / OpenID Connect (Authorization Code flow) as an authentication method. The system SHALL also support email/password authentication as described in the `password-auth` capability. Google SSO remains available when configured; email/password is always available.

#### Scenario: Sign-in via Google

- **WHEN** an unauthenticated user invokes the Google sign-in entry point
- **THEN** the system redirects to Google's authorization endpoint with the configured client id, redirect URI, and the scopes `openid email profile`
- **AND** on a successful callback the system validates the returned ID token signature and issuer against Google's published keys before establishing a session

#### Scenario: Either credential accepted

- **WHEN** a request arrives at `POST /auth/signin` with valid email/password credentials
- **THEN** the system establishes a session using the same session mechanism as Google sign-in
- **AND** when a request arrives at `GET /auth/google/callback` with a valid Google ID token, the system establishes a session the same way

### Requirement: User record keyed by email

The system SHALL maintain a User aggregate with a stable internal id, a unique email address, the display name, an optional picture URL, an optional Google subject identifier (`google_sub`), an optional argon2id password hash (`password_hash`), a `created_at` timestamp, and a `last_signed_in_at` timestamp. The email address SHALL be unique across all users and is the primary cross-credential lookup key. A user row SHALL have at least one of `google_sub` or `password_hash` set.

#### Scenario: First-time Google sign-in creates a new User

- **WHEN** a Google account with a `sub` not previously seen completes sign-in
- **THEN** the system creates a new User row with the email, google_sub, display name, picture URL, and current timestamps

#### Scenario: Returning Google user updates last_signed_in_at

- **WHEN** a Google account whose `sub` already exists completes sign-in
- **THEN** the system updates `last_signed_in_at` and refreshes email, display name, and picture URL
- **AND** does not insert a new User row

#### Scenario: Email/password signup creates a new User

- **WHEN** a sign-up request supplies a unique email and a policy-compliant password
- **THEN** the system creates a new User row with the email, the argon2id password hash, a display name derived from the email local-part, and current timestamps
- **AND** `google_sub` is NULL on the new row
