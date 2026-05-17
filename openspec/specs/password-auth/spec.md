# Capability: Password Auth

## Purpose

Defines email/password sign-up and sign-in, the password policy enforced at the domain layer, and silent account linking when a Google sign-in email matches an existing password-auth account.

## Requirements

### Requirement: Email/password sign-up

The system SHALL accept a sign-up request containing an email address and a plain-text password. The system SHALL validate the password against the policy before creating the user. The system SHALL hash the password using argon2id before persisting. The system SHALL derive the user's display name from the local part of the email address (the portion before `@`). On success the system SHALL issue a session and set the session cookie identical to the Google sign-in flow.

#### Scenario: Successful sign-up

- **WHEN** an unauthenticated request is made to `POST /auth/signup` with a valid email not already in use and a policy-compliant password
- **THEN** the system creates a new User row with the email, the argon2id hash of the password, a display name derived from the email local-part, and current timestamps
- **AND** the system creates a session for the new user and sets the session cookie
- **AND** the response is 201 with the new user's id and display name

#### Scenario: Sign-up rejected for duplicate email

- **WHEN** an unauthenticated request is made to `POST /auth/signup` with an email that already exists in the users table (regardless of credential type)
- **THEN** the system returns 409 with code `email_already_registered` and no user row is created

#### Scenario: Sign-up rejected for policy-violating password

- **WHEN** an unauthenticated request is made to `POST /auth/signup` with a password that violates the password policy
- **THEN** the system returns 422 with code `password_policy_violation` and no user row is created

### Requirement: Password policy

The system SHALL enforce a password policy at the domain layer. A password SHALL be rejected unless it satisfies all of: minimum length of 8 characters, at least one uppercase ASCII letter (A–Z), and at least one non-alphanumeric symbol character.

#### Scenario: Short password rejected

- **WHEN** a sign-up or password-change request supplies a password shorter than 8 characters
- **THEN** the system returns 422 with code `password_policy_violation`

#### Scenario: Password without uppercase rejected

- **WHEN** a sign-up or password-change request supplies a password of sufficient length that contains no uppercase ASCII letter
- **THEN** the system returns 422 with code `password_policy_violation`

#### Scenario: Password without symbol rejected

- **WHEN** a sign-up or password-change request supplies a password that contains no non-alphanumeric symbol
- **THEN** the system returns 422 with code `password_policy_violation`

#### Scenario: Compliant password accepted

- **WHEN** a sign-up request supplies a password that is at least 8 characters, contains at least one uppercase letter, and contains at least one symbol
- **THEN** the system accepts the password and proceeds with account creation

### Requirement: Email/password sign-in

The system SHALL accept a sign-in request containing an email and a plain-text password, locate the user by email, verify the password against the stored argon2id hash, and on success issue a session identical to the Google sign-in flow. The system SHALL NOT reveal whether a failure was due to an unknown email or an incorrect password.

#### Scenario: Successful sign-in

- **WHEN** an unauthenticated request is made to `POST /auth/signin` with an email that exists in the users table and a password that matches the stored hash
- **THEN** the system creates a session for the user, sets the session cookie, and returns 200 with the user's id and display name

#### Scenario: Sign-in rejected for unknown email

- **WHEN** an unauthenticated request is made to `POST /auth/signin` with an email that does not exist in the users table
- **THEN** the system returns 401 with code `invalid_credentials` (no indication of which field was incorrect)

#### Scenario: Sign-in rejected for wrong password

- **WHEN** an unauthenticated request is made to `POST /auth/signin` with a valid email but an incorrect password
- **THEN** the system returns 401 with code `invalid_credentials` (no indication of which field was incorrect)

#### Scenario: Sign-in rejected when user has no password hash

- **WHEN** an unauthenticated request is made to `POST /auth/signin` for a user that was created via Google SSO and has no `password_hash`
- **THEN** the system returns 401 with code `invalid_credentials`

### Requirement: Silent account linking on Google sign-in

The system SHALL silently link a Google identity to an existing password-auth account when the Google ID token's email matches an existing user's email and that user does not yet have a `google_sub` set. After linking, subsequent Google sign-ins SHALL use the `google_sub` lookup path.

#### Scenario: Google sign-in links to existing password account

- **GIVEN** a user exists with email `alice@example.com` created via email/password (no `google_sub`)
- **WHEN** a Google sign-in completes with a verified ID token whose `email` is `alice@example.com`
- **THEN** the system patches `google_sub` on the existing user row and proceeds with session creation
- **AND** no duplicate user row is created

#### Scenario: Google sign-in for already-linked account proceeds normally

- **GIVEN** a user exists with email `alice@example.com` and a `google_sub` already set
- **WHEN** a Google sign-in completes with a matching `google_sub`
- **THEN** the system updates `last_signed_in_at` and proceeds without modifying `google_sub`
