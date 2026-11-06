import { createDatabase, runMigrations, type DB } from '../../src/db/connection';

/** A fresh, fully-migrated in-memory SQLite database. Nothing is shared between instances. */
export function createTestDb(): DB {
  const db = createDatabase(':memory:');
  runMigrations(db);
  return db;
}
