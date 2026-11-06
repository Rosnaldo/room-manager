import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { sql } from 'drizzle-orm';

import properties from '../properties';
import logger from '../logger';
import * as schema from './schema';

export type DB = BetterSQLite3Database<typeof schema> & { $client: Database.Database };

const MIGRATIONS_FOLDER = path.resolve(__dirname, '../../drizzle');

/** Opens a SQLite database. Pass ':memory:' for an isolated, throwaway instance (tests). */
export function createDatabase(file: string = properties.databaseFile): DB {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });

  const sqlite = new Database(file);
  if (file !== ':memory:') sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  return drizzle(sqlite, { schema });
}

export function runMigrations(db: DB): void {
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  logger.info(`sqlite migrated (${db.$client.name})`);
}

export function isDatabaseReady(db: DB): boolean {
  try {
    db.get(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}
