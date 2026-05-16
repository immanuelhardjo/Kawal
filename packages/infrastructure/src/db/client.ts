import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import BetterSqlite from 'better-sqlite3';
import pg from 'pg';
import * as pgSchema from './schema/pg.js';
import * as sqliteSchema from './schema/sqlite.js';

export type DbDialect = 'postgres' | 'sqlite';

// Repos are typed against the pg schema. The SQLite db is cast to this type
// at the factory boundary — safe because both schemas share identical table
// and column names, and Drizzle's query API is compatible across dialects.
export type Db = NodePgDatabase<typeof pgSchema>;

export function createDb(
  databaseUrl: string,
  dialect: DbDialect,
): { db: Db; close: () => Promise<void> } {
  if (dialect === 'postgres') {
    const pool = new pg.Pool({ connectionString: databaseUrl });
    const db = drizzlePg(pool, { schema: pgSchema });
    return { db, close: () => pool.end() };
  }

  const filePath = databaseUrl.replace(/^file:/, '');
  const client = new BetterSqlite(filePath);
  const db = drizzleSqlite(client, { schema: sqliteSchema });
  return { db: db as unknown as Db, close: async () => { client.close(); } };
}
