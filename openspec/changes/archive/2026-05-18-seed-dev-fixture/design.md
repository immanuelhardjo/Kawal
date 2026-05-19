## Context

The app has a rich domain model (Case → Entity, Source, Event, Claim, Relationship) with cross-aggregate invariants enforced at the domain layer. Every aggregate write goes through a repo `save()` that wraps an upsert + revision row in a transaction. There is currently no developer tooling to pre-populate the database with realistic fixture data.

The dev database is PostgreSQL (`postgres://admin:...@localhost:5432/kawal`). The backend's `compose()` function in `apps/backend/src/composition.ts` wires all repos together from `@kawal/infrastructure`. That composition pattern is the right seam for a seed script.

## Goals / Non-Goals

**Goals:**
- Create `tools/seed-dev.ts` — a standalone script that seeds one complete, realistic case fixture
- Use the existing Drizzle repo layer so revision history is written correctly (not raw SQL)
- Accept `--email <addr>` to target an existing dev user (no user creation — avoids password-hashing complexity)
- Idempotent: fixed `seed_*` IDs, repos upsert on conflict, safe to re-run
- Cover all aggregate types: Case, Source ×5, Entity ×5, Event ×7, Claim ×5, Relationship ×6
- Wire as `pnpm seed:dev` at the workspace root

**Non-Goals:**
- Creating a new dev user (script errors if user not found — caller must `sign up` first)
- Seeding multiple cases or parameterising fixture content
- Running in production or CI (script reads `.env` from `apps/backend/.env`)
- Covering the `document` entity type (requires a valid PDF URL — skipped for simplicity)

## Decisions

### D1 — Use domain repos, not raw SQL

**Decision**: Build domain aggregates with `*.create()` / `*.restore()`, then persist via repo `.save()`.

**Rationale**: Raw SQL INSERT would bypass revision tracking entirely — the Garis Waktu revision panel would be empty. Using repos creates the same data shape as the real app, so every UI panel (including the audit trail) is exercisable.

**Alternative considered**: Raw SQL — faster to write but revision rows omitted, breaks the `listRevisionsForOwner` endpoint.

### D2 — Use `restore()` for Events, Claims, Relationships (not `create()`)

**Decision**: Build Event/Claim/Relationship via `restore()`, not `create()`.

**Rationale**: `create()` calls `assertAnchoringSources()` which requires passing live `Source` domain objects and validates cross-user ownership at creation time. `restore()` skips those guards. Since the seed script controls all IDs and ownership, invariants are already satisfied by construction — the guard is redundant and would require hydrating every source into a domain object before each event.

**Alternative considered**: Using `create()` with fully hydrated objects — correct but verbose; every event would need `await sourceRepo.findByIdForOwner(...)` calls before construction.

### D3 — Case lifecycle advanced via `.advance()`, not `restore()` with target status

**Decision**: Call `Case.advance()` three times (open→trial, trial→verdict, verdict→appeal) and `save()` after each step.

**Rationale**: This produces 4 revision rows (created + 3 updates), which makes the revision history panel non-trivial to preview. `restore()` directly at `appeal` would produce only 1 revision row.

### D4 — Fixed `seed_` ID prefix, no UUID generation

**Decision**: Use deterministic string IDs like `seed_case_tambora`, `seed_src_kpk`, `seed_ent_bambang`.

**Rationale**: Idempotency. Re-running the script upserts the same rows. Random IDs would create duplicate entities on re-run.

### D5 — Load DB config from `apps/backend/.env` via dotenv

**Decision**: The script calls `dotenv.config({ path: 'apps/backend/.env' })` before `createDb()`.

**Rationale**: Avoids duplicating database connection config. The `.env` file already has the correct `DATABASE_URL` and `DATABASE_TYPE` for dev.

## Risks / Trade-offs

- **Fixture staleness** → If new required fields are added to a domain aggregate, the seed script will fail at domain object construction. Mitigation: TypeScript will surface this at compile time before runtime.
- **Domain invariant violations** → `restore()` bypasses creation guards; a typo in source IDs referenced by an event won't be caught. Mitigation: script is short and manually auditable; it blows up at DB foreign-key level if a sourceId doesn't exist.
- **Single user scope** → Fixture data is scoped to one user. If that user's account is deleted, all seed data cascades away. Mitigation: acceptable for a dev tool; re-run the script after re-creating the user.

## Open Questions

- None — all decisions above are settled based on existing codebase patterns.
