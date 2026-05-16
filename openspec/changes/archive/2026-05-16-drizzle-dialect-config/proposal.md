## Why

The infrastructure package is hardwired to PostgreSQL, making local development require a running Postgres instance and preventing lightweight SQLite deployment for dev, CI, or single-file environments. Adding a `DATABASE_TYPE` env var (`postgres` | `sqlite`) and a matching Drizzle schema per dialect lets the right database be selected at deployment time with zero application-layer changes.

## What Changes

- Add `DATABASE_TYPE` env var (`postgres` | `sqlite`) to `apps/api`
- Split `packages/infrastructure/src/db/schema.ts` into `schema/pg.ts` and `schema/sqlite.ts`
- Keep `Db` typed as `NodePgDatabase<typeof pgSchema>`; SQLite db is cast at the factory boundary
- Make `createDb()` dialect-aware: reads `DATABASE_TYPE`, selects driver + schema, returns `{ db, close() }` instead of `{ db, pool }`
- Make `migrate.ts` dialect-aware
- Make `drizzle.config.ts` dialect-aware (reads `DATABASE_TYPE` to set schema path + migrations folder)
- Add `better-sqlite3` and `@types/better-sqlite3` as dependencies
- **BREAKING**: `createDb()` return signature changes from `{ db, pool }` to `{ db, close }` — callers update to `close()` instead of `pool.end()`

## Capabilities

### New Capabilities
- `db-dialect-selection`: Configure which database engine to use at deploy time via `DATABASE_TYPE` env var, supporting `postgres` and `sqlite`.

### Modified Capabilities
- `user-management`: No requirement changes — implementation only (driver abstraction).

## Impact

- `packages/infrastructure`: `db/client.ts`, `db/migrate.ts`, `db/schema.ts` (split), `drizzle.config.ts`, `package.json`
- `apps/api`: `src/env.ts` (add `DATABASE_TYPE`), `src/composition.ts` (update `createDb` call), `.env` (add `DATABASE_TYPE=postgres`)
- New migration folder structure: `migrations/pg/` and `migrations/sqlite/`
- No changes to repositories, routes, application layer, or domain layer
- New dependency: `better-sqlite3` + `@types/better-sqlite3`
