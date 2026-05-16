import { createDb } from './client.js';
import type { DbDialect } from './client.js';

const dialect = (process.env.DATABASE_TYPE ?? 'postgres') as DbDialect;
const url = process.env.DATABASE_URL;

if (!url) {
  console.error('DATABASE_URL is required to run migrations.');
  process.exit(1);
}

if (dialect === 'postgres') {
  const { migrate } = await import('drizzle-orm/node-postgres/migrator');
  const { db, close } = createDb(url, dialect);
  await migrate(db as Parameters<typeof migrate>[0], {
    migrationsFolder: new URL('../../migrations/pg', import.meta.url).pathname,
  });
  await close();
} else {
  const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
  const { db, close } = createDb(url, dialect);
  migrate(db as unknown as Parameters<typeof migrate>[0], {
    migrationsFolder: new URL('../../migrations/sqlite', import.meta.url).pathname,
  });
  await close();
}

console.log('migrations applied');
