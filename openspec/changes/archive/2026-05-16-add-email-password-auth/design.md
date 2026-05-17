## Context

Authentication today is exclusively Google OAuth 2.0 PKCE. The `User` aggregate requires a `googleSub` string (not nullable), the DB enforces `google_sub NOT NULL`, and the sign-in screen is a single "Sign in with Google" button. The session store, cookie issuance, and all downstream dossier logic are already credential-agnostic — they only need a valid `userId`.

The change adds email/password as a parallel credential path while leaving all existing Google infrastructure intact.

## Goals / Non-Goals

**Goals:**
- Email/password signup and login that work without any Google configuration
- Silent account linking: same email across both auth methods → same user row
- Argon2id password hashing entirely in-process (no external identity service)
- Password policy enforced in the domain layer (8+ chars, ≥1 uppercase, ≥1 symbol)
- Display name derived from the local part of the email on signup
- Minimal schema change: `google_sub` nullable, `password_hash` added, `email` unique

**Non-Goals:**
- Password reset / forgot-password flow (out of scope for this change)
- Email verification on signup
- Any additional OAuth providers beyond Google
- Rate-limiting or lockout on failed password attempts (can be added later)
- Multi-factor authentication

## Decisions

### D1: Credentials inline on the `users` row (not a separate table)

**Decision**: Store `password_hash TEXT` nullable directly on the `users` table rather than a separate `user_credentials` table.

**Rationale**: The proposal scopes this as "simple user management". A credentials table adds a join on every session lookup and an extra migration surface for no architectural benefit at this scale. The `User` aggregate already carries opaque nullable fields (e.g. `pictureUrl`). Password hash is the same shape of data — owned by the user, nullable, opaque to the domain.

**Alternative considered**: Separate `user_credentials` table keyed on `(user_id, credential_type)`. Better for multi-provider extensibility but premature here.

---

### D2: Email as the unifying identity key

**Decision**: Add `UNIQUE` constraint on `users.email`. `google_sub` remains unique but becomes nullable. Email is the primary cross-credential lookup key.

**Rationale**: A user signing up with `alice@example.com` via email/password and then signing in with Google using the same Google account (`alice@example.com`) must land on the same user row. Keying on email is the only field reliably present in both credential paths.

**Implication for `SignInWithGoogle`**: Lookup order becomes (1) `findByGoogleSub` → if not found (2) `findByEmail` → if found, patch `google_sub` onto the existing user, save, proceed.

**Alternative considered**: No linking — treat each credential path as a separate account. Simpler but confusing for users who inadvertently sign up twice.

---

### D3: `PasswordHashPort` as an application-layer port

**Decision**: Define `PasswordHashPort` interface in `packages/application/src/ports/` with two methods: `hash(plain)` and `verify(plain, stored)`. Infrastructure provides `Argon2Adapter` implementing it.

**Rationale**: Keeps the application layer free of infrastructure concerns (no argon2 import in use cases). Allows test doubles in unit tests without mocking native modules. Consistent with how `IdentityProviderPort` already abstracts Google OIDC.

---

### D4: Password policy enforced in the domain `User` aggregate

**Decision**: The `User.createWithPassword()` factory throws `InvariantViolation` if the plain-text password doesn't meet policy (min 8 chars, ≥1 uppercase, ≥1 symbol). The check happens before hashing.

**Rationale**: Policy is a business rule, not an infrastructure concern. Putting it in the domain makes it impossible to create a non-compliant user regardless of which use case calls the factory.

**Note**: The domain never stores the plain-text password. Policy validation is the only reason it sees it; the hash comes in from the use case after validation passes.

---

### D5: Display name derived from email local-part

**Decision**: `SignUpWithPassword` derives `displayName` as `email.split('@')[0]` — e.g. `alice.smith@example.com` → `alice.smith`.

**Rationale**: Eliminates an extra required form field on signup (reduces friction). The user can update their display name later via the account screen. Consistent with the "simple" framing in the proposal.

---

### D6: argon2 package in `packages/infrastructure`

**Decision**: Add `argon2` (the native Node.js binding, not `argon2-browser`) as a direct dependency of `packages/infrastructure`. Use `argon2.hash()` with `argon2id` variant and library defaults for time/memory cost.

**Rationale**: `argon2id` is the current OWASP recommendation. Library defaults are tuned to ~100ms per hash, acceptable for interactive login. No custom parameter tuning avoids bikeshedding and keeps it auditable.

---

## Risks / Trade-offs

**[Risk] `google_sub NOT NULL` → nullable migration breaks existing installations that have users**  
→ Mitigation: The migration only changes the column constraint; existing rows with a `google_sub` value are unaffected. The unique index on `google_sub` remains (just allows NULLs, which SQLite and Postgres both treat as distinct). Any deployment with real users already has valid `google_sub` values — the migration is additive.

**[Risk] Unique email constraint fails if existing data has duplicate emails**  
→ Mitigation: Currently only Google-authenticated users exist; Google requires email uniqueness per account. In practice no duplicates should exist. The migration should still include a pre-check: `SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1` and fail fast if any duplicates are found before adding the constraint.

**[Risk] argon2 native binding compile failure in CI or unusual environments**  
→ Mitigation: `argon2` distributes pre-built binaries for common platforms. If a build fails, fallback is to add `--build-from-source` or switch to `@node-rs/argon2` (pure Rust binding, no node-gyp). Document this in the package README.

**[Risk] Silent Google linking could be abused if attacker creates a password account with victim's email before the victim ever signs in via Google**  
→ Mitigation: For the current scope (dev/testing primary audience), this risk is acceptable. For production hardening, email verification on password signup would close the window. Noted as a future improvement in the spec.

**[Risk] `password_hash` leaking in API responses**  
→ Mitigation: `passwordHash` is never included in `MeResponse`, `UserProps` exported to the contracts package, or any audit log entry. The field is opaque and internal-only. Code review checklist item.

## Migration Plan

1. Add `argon2` to `packages/infrastructure` dependencies
2. Write and apply DB migration:
   - Alter `users.google_sub` → nullable (keep unique index, allow NULLs)
   - Add `users.password_hash TEXT` nullable
   - Add `UNIQUE` index on `users.email`
3. Deploy API with new routes — old Google routes remain functional
4. Deploy web with updated sign-in screen + new sign-up screen

**Rollback**: Drop `password_hash` column, restore `google_sub NOT NULL`, drop email unique index. No user data is lost (no password users would exist yet if rolling back before any signups).

## Open Questions

- Should the web sign-up route live at `/signup` or `/auth/signup`? (Frontend routing question — lean toward `/signup` for UX clarity, `/auth/signup` for API POST)
- Should `display_name` be editable post-signup in this change, or deferred? (Current leaning: defer — the account screen already exists but editing is out of scope here)
