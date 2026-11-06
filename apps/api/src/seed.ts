import { createDatabase, runMigrations } from './db/connection';
import { seed } from './db/seed';
import logger from './logger';

try {
  const db = createDatabase();
  runMigrations(db);
  const result = seed(db);
  logger.info(result, 'seed: done');
  db.$client.close();
} catch (err) {
  logger.error(err, 'seed: failed');
  process.exitCode = 1;
}
