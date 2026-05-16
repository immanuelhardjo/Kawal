import type { Config } from 'drizzle-kit';

const dbType = process.env.DATABASE_TYPE ?? 'postgres';
const dbUrl = process.env.DATABASE_URL;

const configs: Record<string, Config> = {
  postgres: {
    schema: './src/db/schema/pg.ts',
    out: './migrations/pg',
    driver: 'pg',
    dbCredentials: {
      connectionString: dbUrl ?? 'postgres://postgres:postgres@localhost:5432/kawal',
    },
  },
  sqlite: {
    schema: './src/db/schema/sqlite.ts',
    out: './migrations/sqlite',
    driver: 'better-sqlite',
    dbCredentials: {
      url: (dbUrl ?? 'file:./kawal.db').replace(/^file:/, ''),
    },
  },
};

export default (configs[dbType] ?? configs.postgres) satisfies Config;
