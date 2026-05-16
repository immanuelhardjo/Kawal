## Context

`packages/infrastructure` is the sole database consumer. Its public surface is `createDb()` (returns a Drizzle db instance) and the schema re-exports used by the 10 Drizzle repositories. The API app wires everything together in `composition.ts` via a single `createDb(env.DATABASE_URL)` call.

Currently every file in `src/db/` imports from `drizzle-orm/node-postgres` and `pg`, making PostgreSQL the only possible runtime. No migrations exist yet, so there is no migration history to preserve.

The 10 repositories already import `Db` from `../db/client.js` — the type is centralised and widening it requires changing only that one file. Six of the ten repos use `.onConflictDoUpdate()` for upserts; this method exists identically on both the PostgreSQL and SQLite Drizzle builders, so no repo logic needs branching.

## Goals / Non-Goals

**Goals:**
- `DATABASE_TYPE=postgres` — full existing behaviour, no regression
- `DATABASE_TYPE=sqlite` — zero-infra local dev and CI (`file:./kawal.db` or `file::memory:`)
- Single injection point: `createDb(url, type)` returns a dialect-correct db instance; callers (i.e. `composition.ts`) are unaware of the underlying driver
- Drizzle Kit workflow (`db:generate:pg`, `db:generate:sqlite`, `db:migrate`) works for both dialects when `DATABASE_TYPE` is set

**Non-Goals:**
- MySQL support (out of scope for this change)
- ORM-level type safety across dialects (repos stay typed against the pg schema; SQLite db is cast at the factory boundary)
- Runtime dialect switching without a process restart
- Removing or migrating existing pg-specific schema conventions (enums, jsonb, bigserial) from the pg schema

## Decisions

### D1 — Explicit `DATABASE_TYPE` env var (not URL-sniffing)

The `DATABASE_URL` prefix (`postgres://`, `file:`) could implicitly determine the dialect, but an explicit `DATABASE_TYPE` enum makes the intent unambiguous and avoids fragile string parsing. It also lets `drizzle.config.ts` read a single well-named variable rather than parsing a URL.

Alternatives considered: URL-prefix sniffing — rejected because it creates a hidden contract between the URL format and the runtime behaviour, and makes `drizzle.config.ts` harder to reason about.

### D2 — `Db = NodePgDatabase<typeof pgSchema>`; SQLite db cast at factory

Drizzle does not ship a common base interface. A true union type (`NodePgDatabase | BetterSQLite3Database`) breaks method calls because TypeScript cannot reconcile the `PgTable` vs `SQLiteTable` signatures across the union. Instead, `Db` stays as `NodePgDatabase<typeof pgSchema>` and `createDb()` casts the SQLite db `as unknown as Db` at the factory boundary. Both drivers generate identical SQL for the operations the repos use (SELECT, INSERT ... ON CONFLICT DO UPDATE, UPDATE, DELETE), making the cast safe at runtime.

Alternatives considered: `DbContext = { db, dialect }` passed to every repo — rejected because it requires touching all 10 repos and adds branching complexity for a two-dialect scope.

### D3 — Two separate schema files (`schema/pg.ts`, `schema/sqlite.ts`)

Drizzle's `pgTable` and `sqliteTable` are distinct — a unified schema file is not possible. The two files share identical table and column names; only the column-builder imports differ. A barrel `schema/index.ts` is not exported; each consumer (`client.ts`, `drizzle.config.ts`) imports the dialect-specific file directly.

Column type mapping:

| pg | sqlite |
|----|--------|
| `pgTable` | `sqliteTable` |
| `pgEnum(...)` | removed — `text()` columns only |
| `jsonb(col).$type<T>()` | `text(col, { mode: 'json' }).$type<T>()` |
| `bigserial(col, { mode: 'number' })` | `integer(col).notNull()` |
| `timestamp(col, { withTimezone: true })` | `integer(col, { mode: 'timestamp' })` |
| `boolean(col)` | `integer(col, { mode: 'boolean' })` |

### D4 — `createDb()` returns `{ db, close }` instead of `{ db, pool }`

`pool.end()` is pg-specific. A generic `close(): Promise<void>` works for both drivers (pg: `pool.end()`, sqlite: `client.close()` wrapped in a resolved Promise). The only caller is `composition.ts`; `server.ts` calls `close()` on SIGTERM/SIGINT for graceful shutdown.

### D5 — Separate migrations folders per dialect (`migrations/pg/`, `migrations/sqlite/`)

`drizzle.config.ts` sets `out` to the dialect-specific folder based on `DATABASE_TYPE`. Running `db:generate:pg` writes to `migrations/pg/`; `db:generate:sqlite` writes to `migrations/sqlite/`. The `db:migrate` script reads `DATABASE_TYPE` to pick the correct folder and migrator import. Both folders are committed.

### D6 — drizzle-kit 0.20.x uses per-dialect `generate:pg` / `generate:sqlite` subcommands

The installed drizzle-kit (0.20.18) uses `drizzle-kit generate:pg` and `drizzle-kit generate:sqlite` rather than the unified `generate` command added in 0.21+. Two explicit npm scripts (`db:generate:pg`, `db:generate:sqlite`) replace the single `db:generate` script; `db:generate` remains as an alias for `db:generate:pg`.

## Risks / Trade-offs

**[Risk] SQLite type differences hide pg-specific bugs in dev**
SQLite has no native enum enforcement, no `jsonb`, and timestamps are stored as integers. A value that passes SQLite validation may fail a pg constraint in production.
→ Mitigation: pg remains the canonical production dialect. SQLite is documented as dev/CI only. Integration tests targeting pg (e.g. `drizzle-case-repo.integration.test.ts`) continue to run against pg in CI.

**[Risk] `as unknown as Db` cast breaks if Drizzle API diverges between pg and sqlite**
If a future Drizzle version changes the sqlite builder to be incompatible with pg's builder interface, the cast could produce runtime errors.
→ Mitigation: the cast is isolated to `client.ts`. The integration test suite catches regressions early.

## Migration Plan

1. Merge PR → `DATABASE_TYPE=postgres` in all existing environments (default behaviour unchanged)
2. Local dev: add `DATABASE_TYPE=sqlite` and `DATABASE_URL=file:./kawal.db` to `.env`; run `pnpm db:generate:sqlite` and `pnpm db:migrate` to bootstrap the sqlite schema
3. No data migration required (SQLite is a new deployment target, not a replacement for existing pg data)
4. Rollback: revert `DATABASE_TYPE` to `postgres` — the pg code path is unchanged

## Open Questions

- Should `DATABASE_URL` for SQLite default to `file:./kawal.db` or `file::memory:` in the sample `.env`? (`file:./kawal.db` is safer for dev; `:memory:` resets on restart which is useful for tests but confusing for day-to-day use)
