## Why

The app currently requires Google OAuth for every sign-in, making local development and testing awkward — developers need valid Google credentials, a configured OAuth app, and a live redirect URI. Adding email/password authentication alongside Google SSO removes that friction and lets contributors run the full app without any external identity dependency.

## What Changes

- Add `POST /auth/signup` endpoint: creates a user with email, password, and display name derived from email
- Add `POST /auth/signin` endpoint: authenticates by email + argon2 password hash verification
- Google SSO remains fully functional in parallel; credentials are not removed
- Silent account linking: signing in via Google with an email that already has a password account merges the two identities
- **BREAKING**: `google_sub` column on the `users` table becomes nullable (existing rows unaffected)
- New `password_hash` column added to `users` table (nullable for Google-only accounts)
- Unique constraint added on `users.email`
- Password policy enforced at the domain layer: minimum 8 characters, at least one uppercase letter, at least one symbol
- Display name for password-signup users is derived from the local part of the email address (e.g. `alice.smith` → `alice.smith`)

## Capabilities

### New Capabilities

- `password-auth`: Sign-up and sign-in using email and password, managed entirely in-app with argon2 hashing

### Modified Capabilities

- `user-management`: Google SSO is no longer the sole credential; email/password is now a first-class alternative; `google_sub` uniqueness constraint changes from NOT NULL to nullable unique; email gains a unique constraint; password policy requirements are introduced

## Impact

- **DB schema**: `users` table — `google_sub` nullable, `password_hash` added, `email` unique index added; requires a migration
- **Domain**: `User` aggregate — `googleSub` field becomes `string | null`; `passwordHash` field added
- **Application ports**: new `PasswordHashPort` interface
- **Application use cases**: two new use cases (`SignUpWithPassword`, `SignInWithPassword`); `SignInWithGoogle` updated for email-based linking
- **Infrastructure**: new `Argon2Adapter`; `DrizzleUserRepo` gains `findByEmail`
- **API routes**: two new routes on `apps/api`
- **Web frontend**: `SignInScreen` extended with email/password form; new `SignUpScreen` added
- **Spec**: `openspec/specs/user-management/spec.md` updated; new `openspec/specs/password-auth/spec.md` created
- **Dependencies**: `argon2` npm package added to `packages/infrastructure`
