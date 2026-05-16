## 1. Dependencies

- [x] 1.1 Add `better-sqlite3` and `@types/better-sqlite3` to `packages/infrastructure/package.json` dependencies
- [x] 1.2 Run `pnpm install` to update the lockfile

## 2. Environment Configuration

- [x] 2.1 Add `DATABASE_TYPE` to the Zod env schema in `apps/api/src/env.ts` as `z.enum(['postgres', 'sqlite']).default('postgres')`
- [x] 2.2 Add `DATABASE_TYPE=postgres` to `apps/api/.env`
- [x] 2.3 Relax the `DATABASE_URL` validator in `apps/api/src/env.ts` from `z.string().url()` to `z.string().min(1)` so that SQLite `file:` paths pass validation

## 3. Schema Split

- [x] 3.1 Create `packages/infrastructure/src/db/schema/` directory
- [x] 3.2 Move existing `schema.ts` to `schema/pg.ts` — no content changes needed
- [x] 3.3 Create `schema/sqlite.ts` translating every table: replace `pgTable` → `sqliteTable`, remove all `pgEnum` calls, map `jsonb` → `text(mode:'json')`, `bigserial` → `integer`, `timestamp({withTimezone})` → `integer(mode:'timestamp')`, `boolean` → `integer(mode:'boolean')`
- [x] 3.4 Update all repository imports from `'../db/schema.js'` to `'../db/schema/pg.js'` (repos stay pg-typed)
- [x] 3.5 Update `packages/infrastructure/src/index.ts` (or wherever schema is re-exported) to export from `./db/schema/pg.js`

## 4. Client Factory

- [x] 4.1 Rewrite `packages/infrastructure/src/db/client.ts`:
  - Export `type Db = NodePgDatabase<typeof pgSchema>`
  - Export `type DbDialect = 'postgres' | 'sqlite'`
  - `createDb(url: string, dialect: DbDialect): { db: Db; close: () => Promise<void> }`
  - Postgres path: create `pg.Pool`, return `drizzle(pool, { schema })` and `close = () => pool.end()`
  - SQLite path: `new BetterSqlite(url.replace(/^file:/, ''))`, return sqlite db cast `as unknown as Db`, `close = async () => { client.close(); }`

## 5. Migrator

- [x] 5.1 Rewrite `packages/infrastructure/src/db/migrate.ts` to be dialect-aware:
  - Read `DATABASE_TYPE` from `process.env` (default `postgres`)
  - For postgres: import from `drizzle-orm/node-postgres/migrator`, point to `migrations/pg/`
  - For sqlite (else): import from `drizzle-orm/better-sqlite3/migrator`, point to `migrations/sqlite/`
  - Use top-level await; sqlite `migrate()` is synchronous (no `await`)

## 6. Drizzle Kit Config

- [x] 6.1 Rewrite `packages/infrastructure/drizzle.config.ts` to read `process.env.DATABASE_TYPE`:
  - `postgres` → `driver: 'pg'`, `dbCredentials.connectionString`, schema `./src/db/schema/pg.ts`, out `./migrations/pg`
  - `sqlite` → `driver: 'better-sqlite'`, `dbCredentials.url` (strip `file:` prefix), schema `./src/db/schema/sqlite.ts`, out `./migrations/sqlite`
  - Note: drizzle-kit 0.20.x uses `driver` not `dialect`; scripts use `generate:pg` / `generate:sqlite` subcommands
- [x] 6.2 Update `package.json` scripts: add `db:generate:pg` and `db:generate:sqlite`; `db:generate` aliases `db:generate:pg`

## 7. Composition Wiring

- [x] 7.1 Update `apps/api/src/composition.ts`: change `createDb(env.DATABASE_URL)` to `createDb(env.DATABASE_URL, env.DATABASE_TYPE)`; expose `close` on returned `CompositionWithClose`
- [x] 7.2 Add graceful shutdown to `apps/api/src/server.ts`: call `composition.close()` on SIGTERM/SIGINT

## 8. Verification

- [x] 8.1 Run `pnpm typecheck` across the workspace — zero new type errors (4 pre-existing implicit-any warnings in unrelated files)
- [x] 8.2 Run `pnpm db:generate:pg` and confirm files appear in `migrations/pg/`
- [x] 8.3 Run `pnpm db:generate:sqlite` and confirm files appear in `migrations/sqlite/`
- [ ] 8.4 Start the API locally with `DATABASE_TYPE=sqlite DATABASE_URL=file:./kawal.db` — app starts and migrations apply without error
- [ ] 8.5 Start the API locally with `DATABASE_TYPE=postgres` — existing postgres behaviour is unchanged
- [x] 8.6 Run the existing test suite (`pnpm test`) — 55 tests pass, 0 failures
