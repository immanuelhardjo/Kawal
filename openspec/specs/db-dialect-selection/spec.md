# Capability: db-dialect-selection

## Purpose

The system supports multiple database dialects (PostgreSQL and SQLite) selectable at runtime via the `DATABASE_TYPE` environment variable. This allows the application to be deployed against a full PostgreSQL instance or a lightweight SQLite file-based database without code changes.

## Requirements

### Requirement: DATABASE_TYPE env var selects the database dialect
The system SHALL read a `DATABASE_TYPE` environment variable at startup to determine which database dialect to use. Accepted values are `postgres` and `sqlite`. The default value SHALL be `postgres`. The application SHALL fail to start with a clear error message if an unrecognised value is provided.

#### Scenario: Valid postgres value
- **WHEN** `DATABASE_TYPE=postgres` is set in the environment
- **THEN** the application starts and connects to the database at `DATABASE_URL` using the PostgreSQL driver

#### Scenario: Valid sqlite value
- **WHEN** `DATABASE_TYPE=sqlite` is set in the environment
- **THEN** the application starts and opens the SQLite database file at the path specified in `DATABASE_URL` (e.g. `file:./kawal.db`)

#### Scenario: Default value
- **WHEN** `DATABASE_TYPE` is not set in the environment
- **THEN** the application behaves as if `DATABASE_TYPE=postgres` was set

#### Scenario: Invalid value
- **WHEN** `DATABASE_TYPE` is set to an unrecognised value (e.g. `oracle`)
- **THEN** the application fails to start and emits an error naming the invalid value and the accepted values

### Requirement: Dialect-correct Drizzle schema is used at runtime
The system SHALL use the PostgreSQL Drizzle schema (`schema/pg.ts`) when `DATABASE_TYPE=postgres` and the SQLite Drizzle schema (`schema/sqlite.ts`) when `DATABASE_TYPE=sqlite`. Both schemas SHALL define the same table names and column names so that all repository queries execute correctly regardless of dialect.

#### Scenario: Postgres schema selected
- **WHEN** `DATABASE_TYPE=postgres` and `createDb()` is called
- **THEN** a `NodePgDatabase` instance is returned, configured with the pg schema and connected to the URL in `DATABASE_URL`

#### Scenario: SQLite schema selected
- **WHEN** `DATABASE_TYPE=sqlite` and `createDb()` is called
- **THEN** a `BetterSQLite3Database` instance is returned (typed as `Db`), configured with the sqlite schema and pointing to the file path in `DATABASE_URL`

### Requirement: createDb returns a dialect-agnostic close function
The `createDb()` function SHALL return `{ db, close }` where `close(): Promise<void>` terminates the underlying connection regardless of dialect. Callers SHALL NOT be required to know the underlying driver type to shut down cleanly.

#### Scenario: Postgres connection closed
- **WHEN** `close()` is called on a postgres db instance
- **THEN** the underlying `pg.Pool` is ended and all connections are released

#### Scenario: SQLite connection closed
- **WHEN** `close()` is called on a sqlite db instance
- **THEN** the underlying `better-sqlite3` database file handle is closed

### Requirement: Drizzle Kit commands are dialect-aware
Running `db:generate:pg`, `db:generate:sqlite`, or `db:migrate` SHALL operate on the schema and migrations folder that corresponds to the target dialect. The `drizzle.config.ts` file SHALL read `DATABASE_TYPE` to select the correct schema file path and output migrations folder (`migrations/pg/` or `migrations/sqlite/`).

#### Scenario: Generate postgres migrations
- **WHEN** `pnpm db:generate:pg` is run
- **THEN** Drizzle Kit reads `schema/pg.ts` and writes migration files to `migrations/pg/`

#### Scenario: Generate sqlite migrations
- **WHEN** `pnpm db:generate:sqlite` is run
- **THEN** Drizzle Kit reads `schema/sqlite.ts` and writes migration files to `migrations/sqlite/`

#### Scenario: Run postgres migrations
- **WHEN** `DATABASE_TYPE=postgres pnpm db:migrate` is run
- **THEN** the migrator reads from `migrations/pg/` and applies pending migrations to the PostgreSQL database at `DATABASE_URL`

#### Scenario: Run sqlite migrations
- **WHEN** `DATABASE_TYPE=sqlite pnpm db:migrate` is run
- **THEN** the migrator reads from `migrations/sqlite/` and applies pending migrations to the SQLite database at `DATABASE_URL`
