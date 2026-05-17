## 1. Dependencies and DB Schema

- [x] 1.1 Add `argon2` as a dependency to `packages/infrastructure/package.json`
- [x] 1.2 Add `password_hash TEXT` nullable column and make `google_sub` nullable in `packages/infrastructure/src/db/schema/sqlite.ts`
- [x] 1.3 Mirror the same column changes in `packages/infrastructure/src/db/schema/pg.ts`
- [x] 1.4 Add a `UNIQUE` index on `users.email` in both schema files
- [x] 1.5 Generate and commit a new Drizzle migration for the schema changes

## 2. Domain Layer

- [x] 2.1 Change `User.googleSub` from `string` to `string | null` in `packages/domain/src/aggregates/user.ts`
- [x] 2.2 Add `passwordHash: string | null` field to `UserProps` and `User` class
- [x] 2.3 Add `User.createWithPassword()` static factory that accepts `{ id, email, passwordHash, now }`, derives `displayName` from email local-part, validates password policy on the plain-text password before accepting the hash, and throws `InvariantViolation` on policy failure
- [x] 2.4 Update `User.create()` (Google path) to accept `googleSub` as optional, defaulting `passwordHash` to `null`
- [x] 2.5 Update `User.restore()` to accept the new nullable fields without invariant checks

## 3. Application Ports and Repositories

- [x] 3.1 Create `packages/application/src/ports/password-hash-port.ts` with `PasswordHashPort` interface (`hash(plain): Promise<string>`, `verify(plain, stored): Promise<boolean>`)
- [x] 3.2 Add `findByEmail(email: string): Promise<User | null>` to the `UserRepo` interface in `packages/application/src/repositories/user-repo.ts`
- [x] 3.3 Export the new port from `packages/application/src/index.ts`

## 4. Application Use Cases

- [x] 4.1 Create `packages/application/src/use-cases/sign-up-with-password.ts` implementing `SignUpWithPassword` use case: validate unique email via `users.findByEmail`, call `passwordHash.hash()`, call `User.createWithPassword()`, save user, create session, append audit entry
- [x] 4.2 Create `packages/application/src/use-cases/sign-in-with-password.ts` implementing `SignInWithPassword` use case: find user by email, return `invalid_credentials` if not found or no `password_hash`, verify hash, update `last_signed_in_at`, save, create session, append audit entry
- [x] 4.3 Update `SignInWithGoogle.complete()` in `packages/application/src/use-cases/sign-in-with-google.ts`: after `findByGoogleSub` returns null, fall back to `findByEmail`; if found, patch `google_sub` onto the user before saving (silent linking)
- [x] 4.4 Export both new use cases from `packages/application/src/index.ts`

## 5. Infrastructure Adapters

- [x] 5.1 Create `packages/infrastructure/src/identity/argon2-adapter.ts` implementing `PasswordHashPort` using `argon2.hash()` (argon2id variant, library defaults) and `argon2.verify()`
- [x] 5.2 Add `findByEmail(email)` to `DrizzleUserRepo` in `packages/infrastructure/src/repositories/` querying by the unique email column
- [x] 5.3 Export `Argon2Adapter` from `packages/infrastructure/src/index.ts`

## 6. API Routes and Composition

- [x] 6.1 Add `POST /auth/signup` route to `apps/api/src/routes/auth.ts`: parse `{ email, password }` body, call `composition.signUpWithPassword.execute()`, return 201 on success or 409/422 on error
- [x] 6.2 Add `POST /auth/signin` route to `apps/api/src/routes/auth.ts`: parse `{ email, password }` body, call `composition.signInWithPassword.execute()`, return 200 with session cookie or 401 on error
- [x] 6.3 Add `SignUpWithPassword` and `SignInWithPassword` to the `Composition` interface in `apps/api/src/composition.ts`
- [x] 6.4 Wire `Argon2Adapter`, `SignUpWithPassword`, and `SignInWithPassword` in the `compose()` function in `apps/api/src/composition.ts`

## 7. Web Frontend

- [x] 7.1 Create `apps/web/src/screens/sign-up.tsx` with an email + password form that `POST`s to `/auth/signup` and redirects to `/` on success or shows inline errors on 409/422
- [x] 7.2 Update `apps/web/src/screens/sign-in.tsx` to add an email + password form below (or alongside) the Google button that `POST`s to `/auth/signin` and redirects on success, plus a link to the sign-up screen
- [x] 7.3 Add the `/signup` route to `apps/web/src/app.tsx` pointing to `SignUpScreen`, outside the auth guard

## 8. Validation and Tests

- [x] 8.1 Add unit tests for `User.createWithPassword()` covering: valid input succeeds, password too short fails, password missing uppercase fails, password missing symbol fails
- [x] 8.2 Add unit tests for `SignUpWithPassword`: duplicate email returns `email_already_registered`, policy violation returns `password_policy_violation`, success creates user + session
- [x] 8.3 Add unit tests for `SignInWithPassword`: unknown email returns `invalid_credentials`, wrong password returns `invalid_credentials`, no `password_hash` on user returns `invalid_credentials`, success creates session
- [x] 8.4 Add unit test for `SignInWithGoogle` silent linking: existing user without `google_sub` gets it patched; existing user with `google_sub` proceeds without modification
- [x] 8.5 Verify the existing `no-admin-surface` test in `apps/api/src/test/` still passes with the new routes (signup/signin are public, not admin surfaces)
